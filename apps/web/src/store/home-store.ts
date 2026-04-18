'use client';

import { create } from 'zustand';
import type {
  ClientIntent,
  ConsultResponseData,
  RecallResponseData,
  RecallResult,
  ReasoningStep,
  SavedPlaceStub,
  ExtractPlaceItem,
  SignalTier,
  ChipItem,
} from '@totoro/shared';
import type { FlowId, HomePhase } from '../flows/flow-definition';
import { getSavedPlaceCount, appendSavedPlace, incrementSavedPlaceCount } from '../storage/saved-places-storage';
import { getTasteProfileConfirmed, setTasteProfileConfirmed } from '../storage/taste-profile-storage';
import { classifyIntent } from '../lib/classify-intent';
import { getChatClient } from '../lib/chat-client';
import { getSignalClient } from '../lib/signal-client';
import { getUserContextClient } from '../lib/user-context-client';
import { FLOW_BY_CLIENT_INTENT, FLOW_BY_RESPONSE_TYPE } from '../flows/registry';

// ── Thread entry types ─────────────────────────────────────────────────────────
export type ThreadEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; type: 'clarification'; message: string; dismissed?: boolean }
  | { id: string; role: 'assistant'; type: 'assistant'; message: string; dismissed?: boolean }
  | { id: string; role: 'assistant'; type: 'consult'; message: string; data: ConsultResponseData }
  | { id: string; role: 'assistant'; type: 'save'; item: ExtractPlaceItem; sourceUrl: string | null }
  | { id: string; role: 'assistant'; type: 'recall'; message: string; data: RecallResponseData }
  | { id: string; role: 'assistant'; type: 'error'; category: 'offline' | 'timeout' | 'generic' | 'server'; flowId?: FlowId };

interface HomeState {
  // Phase
  phase: HomePhase;
  activeFlowId: FlowId | null;

  // Auth (seeded from Clerk via init())
  userId: string | null;
  getToken: (() => Promise<string>) | null;

  // Query state
  query: string | null;
  result: ConsultResponseData | null;
  reasoningSteps: ReasoningStep[];
  error: { message: string; category: 'offline' | 'timeout' | 'generic' | 'server' } | null;

  // Hydration
  hydrated: boolean;
  tasteProfileConfirmed: boolean;
  savedPlaceCount: number;

  // Animation-fetch race
  animationComplete: boolean;
  fetchComplete: boolean;
  pendingResult: ConsultResponseData | null;
  pendingMessage: string | null;
  pendingError: { message: string; category: 'offline' | 'timeout' | 'generic' | 'server' } | null;
  abortController: AbortController | null;

  // Chat thread
  thread: ThreadEntry[];

  // Flow-specific slots
  recallResults: RecallResult[] | null;
  recallTotalCount: number;
  recallQuery: string | null;
  recallBreadcrumb: boolean;
  saveSheetPlaces: ExtractPlaceItem[];
  saveSheetSourceUrl: string | null;
  saveSheetSelectedIndex: number;
  saveSheetMessage: string | null;
  saveSheetStatus: 'pending' | 'saving' | 'duplicate' | 'error';
  saveSheetOriginalSavedAt: string | null;
  preSavePhase: HomePhase | null;
  assistantMessage: string | null;
  clarificationMessage: string | null;

  // User context / tier state
  signalTier: SignalTier | null;
  chips: ChipItem[];
  savedPlacesCountFromContext: number | null;

  // Actions
  hydrate: () => void;
  init: (opts: { userId: string | null; getToken: () => Promise<string> }) => void;
  setUserId: (id: string | null) => void;
  loadUserContext: () => Promise<void>;
  submit: (message: string, opts?: { forceIntent?: ClientIntent; isRetry?: boolean }) => Promise<void>;
  markAnimationComplete: () => void;
  setPendingResult: (data: ConsultResponseData) => void;
  tryRevealResult: () => void;
  confirmTasteProfile: () => void;
  reset: () => void;

  submitRecall: (message: string) => Promise<void>;
  setRecallResults: (results: RecallResult[], totalCount: number) => void;
  openSaveSheet: (message: string, places: ExtractPlaceItem[], sourceUrl: string | null) => void;
  setSaveSheetSelectedIndex: (index: number) => void;
  confirmSave: () => Promise<void>;
  confirmPlaceSelection: () => void;
  saveIndividualFromSheet: (item: ExtractPlaceItem) => void;
  closeSaveSheetWithResults: (savedItems: ExtractPlaceItem[]) => void;
  dismissSaveSheet: () => void;
  dismissAssistantReply: () => void;
  incrementSavedCount: (place: SavedPlaceStub) => void;
  autoSavePlace: (item: ExtractPlaceItem, sourceUrl: string | null) => void;
  pushMessage: (message: string) => void;
  pushRecallResults: (message: string, data: RecallResponseData) => void;

  // Signal actions (fire-and-forget)
  acceptPlace: (recommendationId: string, placeId: string) => Promise<void>;
  rejectPlace: (recommendationId: string, placeId: string) => Promise<void>;
  confirmChips: (decidedChips: ChipItem[]) => Promise<void>;
}

export type HomeStoreApi = HomeState;

function pickRestingPhase(
  savedPlaceCount: number,
  tasteProfileConfirmed: boolean,
  signalTier: SignalTier | null,
): HomePhase {
  if (signalTier === 'cold') return 'cold-0';
  if (signalTier === 'chip_selection') return 'chip-selection';
  if (signalTier === 'warming' || signalTier === 'active') return 'idle';
  // null fallback — count-based
  if (savedPlaceCount === 0) return 'cold-0';
  if (savedPlaceCount < 5) return 'cold-1-4';
  if (!tasteProfileConfirmed) return 'taste-profile';
  return 'idle';
}

function categorizeError(err: unknown): 'offline' | 'timeout' | 'server' | 'generic' {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  if (err instanceof Error && 'category' in err) {
    const cat = (err as Error & { category: string }).category;
    if (cat === 'server') return 'server';
  }
  return 'generic';
}

let entryCounter = 0;
function nextId() {
  return `e-${Date.now()}-${++entryCounter}`;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  phase: 'hydrating',
  activeFlowId: null,
  userId: null,
  getToken: null,
  query: null,
  result: null,
  reasoningSteps: [],
  error: null,
  hydrated: false,
  tasteProfileConfirmed: false,
  savedPlaceCount: 0,
  animationComplete: false,
  fetchComplete: false,
  pendingResult: null,
  pendingMessage: null,
  pendingError: null,
  abortController: null,
  thread: [],
  recallResults: null,
  recallTotalCount: 0,
  recallQuery: null,
  recallBreadcrumb: false,
  saveSheetPlaces: [],
  saveSheetSourceUrl: null,
  saveSheetSelectedIndex: 0,
  saveSheetMessage: null,
  saveSheetStatus: 'pending',
  saveSheetOriginalSavedAt: null,
  preSavePhase: null,
  assistantMessage: null,
  clarificationMessage: null,
  signalTier: null,
  chips: [],
  savedPlacesCountFromContext: null,

  // ── hydrate ────────────────────────────────────────────────────────────────
  hydrate: () => {
    const savedPlaceCount = getSavedPlaceCount();
    const tasteProfileConfirmed = getTasteProfileConfirmed();
    const phase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, null);
    set({ phase, savedPlaceCount, tasteProfileConfirmed, hydrated: true });
  },

  // ── init ───────────────────────────────────────────────────────────────────
  init: ({ userId, getToken }) => {
    set({ userId, getToken });
    void get().loadUserContext();
  },

  // ── setUserId ──────────────────────────────────────────────────────────────
  setUserId: (id) => {
    set({ userId: id });
  },

  // ── loadUserContext ────────────────────────────────────────────────────────
  loadUserContext: async () => {
    const { userId, getToken, savedPlaceCount, tasteProfileConfirmed } = get();
    try {
      const client = getUserContextClient(userId ?? '', getToken ?? (async () => ''));
      const ctx = await client.getUserContext();
      const signalTier = ctx.signal_tier;
      const phase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
      set({
        signalTier,
        chips: ctx.chips,
        savedPlacesCountFromContext: ctx.saved_places_count,
        phase,
      });
    } catch {
      // Silently fall back — pickRestingPhase uses count-based when signalTier is null
    }
  },

  // ── submit ─────────────────────────────────────────────────────────────────
  submit: async (message, opts) => {
    const { getToken, thread, signalTier, savedPlaceCount, tasteProfileConfirmed } = get();

    get().dismissAssistantReply();
    get().abortController?.abort();
    const abortController = new AbortController();

    const intent: ClientIntent = opts?.forceIntent ?? classifyIntent(message);

    // Tier guard — block non-save intents when onboarding isn't complete
    if ((signalTier === 'cold' || signalTier === 'chip_selection') && intent !== 'save') {
      const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
      const entry: ThreadEntry = {
        id: nextId(),
        role: 'assistant',
        type: 'clarification',
        message: "Let's finish setup first before we explore recommendations.",
      };
      set({ thread: [...get().thread, entry], phase: restingPhase, activeFlowId: null });
      return;
    }

    const preFlow = FLOW_BY_CLIENT_INTENT[intent];
    const initialFlowId: FlowId = preFlow?.id ?? 'consult';
    const initialPhase = preFlow?.phase ?? 'thinking';

    let newThread: ThreadEntry[];
    if (opts?.isRetry) {
      const last = thread[thread.length - 1];
      newThread = (last?.role === 'assistant' && last?.type === 'error')
        ? thread.slice(0, -1)
        : thread;
    } else {
      const userEntry: ThreadEntry = { id: nextId(), role: 'user', content: message };
      newThread = [...thread, userEntry];
    }

    set({
      thread: newThread,
      phase: initialPhase,
      activeFlowId: initialFlowId,
      query: message,
      result: null,
      reasoningSteps: [],
      error: null,
      animationComplete: false,
      fetchComplete: false,
      pendingResult: null,
      pendingError: null,
      clarificationMessage: null,
      abortController,
    });

    try {
      const client = getToken ? getChatClient(getToken) : getChatClient(async () => '');
      const res = await client.chat({
        message,
        signal: abortController.signal,
        signalTier: get().signalTier,
      });

      if (res.type === 'clarification') {
        const { savedPlaceCount: spc, tasteProfileConfirmed: tpc, signalTier: st } = get();
        const restingPhase = pickRestingPhase(spc, tpc, st);
        const entry: ThreadEntry = { id: nextId(), role: 'assistant', type: 'clarification', message: res.message };
        set({
          thread: [...get().thread, entry],
          phase: restingPhase,
          activeFlowId: null,
          animationComplete: false,
          fetchComplete: false,
          pendingResult: null,
          pendingError: null,
          clarificationMessage: null,
        });
        return;
      }

      const finalFlow = FLOW_BY_RESPONSE_TYPE[res.type];
      const parsed = finalFlow.schema.safeParse(res.data);
      if (!parsed.success) {
        const errorObj = { message: 'Invalid response shape', category: 'generic' as const };
        set({ fetchComplete: true, pendingError: errorObj });
        get().tryRevealResult();
        return;
      }

      if (res.type === 'consult' && res.data && typeof res.data === 'object' && 'reasoning_steps' in res.data) {
        set({
          reasoningSteps: (res.data as ConsultResponseData).reasoning_steps ?? [],
          pendingMessage: res.message ?? null,
        });
      }

      set({ fetchComplete: true });
      finalFlow.onResponse(res, get());
    } catch (err) {
      const category = categorizeError(err);
      const errorObj = { message: String(err), category };
      set({ fetchComplete: true, pendingError: errorObj });
      get().tryRevealResult();
    }
  },

  // ── markAnimationComplete ──────────────────────────────────────────────────
  markAnimationComplete: () => {
    set({ animationComplete: true });
    get().tryRevealResult();
  },

  // ── setPendingResult ───────────────────────────────────────────────────────
  setPendingResult: (data) => {
    set({ pendingResult: data });
  },

  // ── tryRevealResult ────────────────────────────────────────────────────────
  tryRevealResult: () => {
    const { animationComplete, fetchComplete, pendingResult, pendingError, savedPlaceCount, tasteProfileConfirmed, signalTier } = get();
    if (!animationComplete || !fetchComplete) return;

    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);

    if (pendingError) {
      const { activeFlowId } = get();
      const entry: ThreadEntry = {
        id: nextId(),
        role: 'assistant',
        type: 'error',
        category: pendingError.category,
        ...(activeFlowId && { flowId: activeFlowId }),
      };
      set({
        thread: [...get().thread, entry],
        phase: restingPhase,
        activeFlowId: null,
        error: null,
        pendingError: null,
        animationComplete: false,
        fetchComplete: false,
      });
      return;
    }

    if (pendingResult) {
      const { pendingMessage } = get();
      const entry: ThreadEntry = {
        id: nextId(),
        role: 'assistant',
        type: 'consult',
        message: pendingMessage ?? "Here's your pick",
        data: pendingResult,
      };
      set({
        thread: [...get().thread, entry],
        phase: restingPhase,
        activeFlowId: null,
        result: pendingResult,
        pendingResult: null,
        pendingMessage: null,
        animationComplete: false,
        fetchComplete: false,
      });
    }
  },

  // ── confirmTasteProfile ────────────────────────────────────────────────────
  confirmTasteProfile: () => {
    setTasteProfileConfirmed();
    set({ tasteProfileConfirmed: true, phase: 'idle' });
  },

  // ── reset ──────────────────────────────────────────────────────────────────
  reset: () => {
    const { savedPlaceCount, tasteProfileConfirmed, signalTier } = get();
    const phase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    set({
      phase,
      activeFlowId: null,
      query: null,
      result: null,
      reasoningSteps: [],
      error: null,
      animationComplete: false,
      fetchComplete: false,
      pendingResult: null,
      pendingError: null,
      abortController: null,
      clarificationMessage: null,
    });
  },

  // ── submitRecall ───────────────────────────────────────────────────────────
  submitRecall: async (message) => {
    const { getToken } = get();
    set({ recallQuery: message, phase: 'recall', recallResults: null, recallBreadcrumb: false });

    let breadcrumbTimer: ReturnType<typeof setTimeout> | null = null;
    breadcrumbTimer = setTimeout(() => {
      if (get().phase === 'recall') set({ recallBreadcrumb: true });
    }, 600);

    try {
      const client = getToken ? getChatClient(getToken) : getChatClient(async () => '');
      const res = await client.chat({ message, signalTier: get().signalTier });

      if (breadcrumbTimer) clearTimeout(breadcrumbTimer);

      if (res.type === 'recall' && res.data) {
        const data = res.data as RecallResponseData;
        set({
          recallResults: data.results,
          recallTotalCount: data.total_count,
          recallBreadcrumb: false,
        });
      }
    } catch {
      if (breadcrumbTimer) clearTimeout(breadcrumbTimer);
      set({ recallBreadcrumb: false });
    }
  },

  // ── setRecallResults ───────────────────────────────────────────────────────
  setRecallResults: (results, totalCount) => {
    set({ recallResults: results, recallTotalCount: totalCount });
  },

  // ── openSaveSheet ──────────────────────────────────────────────────────────
  openSaveSheet: (message, places, sourceUrl) => {
    const { phase, activeFlowId } = get();
    const preSavePhase = phase !== 'save-sheet' && phase !== 'save-snackbar' ? phase : null;
    set({
      preSavePhase,
      saveSheetMessage: message,
      saveSheetPlaces: places,
      saveSheetSourceUrl: sourceUrl,
      saveSheetSelectedIndex: 0,
      saveSheetStatus: 'pending',
      phase: 'save-sheet',
      activeFlowId: activeFlowId !== 'save' ? 'save' : activeFlowId,
    });
  },

  // ── setSaveSheetSelectedIndex ──────────────────────────────────────────────
  setSaveSheetSelectedIndex: (index) => {
    set({ saveSheetSelectedIndex: index });
  },

  // ── confirmSave ────────────────────────────────────────────────────────────
  confirmSave: async () => {
    // Legacy action — kept for compatibility; new flow uses openSaveSheet + saveIndividualFromSheet
    set({ saveSheetStatus: 'saving' });
    try {
      const { savedPlaceCount, tasteProfileConfirmed, signalTier } = get();
      const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
      set({ phase: restingPhase, saveSheetStatus: 'pending' });
    } catch {
      set({ saveSheetStatus: 'error' });
    }
  },

  // ── confirmPlaceSelection ──────────────────────────────────────────────────
  confirmPlaceSelection: () => {
    const { saveSheetPlaces, saveSheetSelectedIndex, saveSheetSourceUrl } = get();
    const selectedItem = saveSheetPlaces[saveSheetSelectedIndex];
    if (!selectedItem?.place) return;

    const stub: SavedPlaceStub = {
      place_id: selectedItem.place.place_id,
      place_name: selectedItem.place.place_name,
      address: selectedItem.place.address ?? '',
      saved_at: new Date().toISOString(),
      source_url: saveSheetSourceUrl,
      thumbnail_url: selectedItem.place.photo_url ?? undefined,
    };
    get().incrementSavedCount(stub);
    const { savedPlaceCount, tasteProfileConfirmed, signalTier, thread } = get();
    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    const entry: ThreadEntry = {
      id: nextId(),
      role: 'assistant',
      type: 'save',
      item: selectedItem,
      sourceUrl: saveSheetSourceUrl,
    };
    set({
      thread: [...thread, entry],
      phase: restingPhase,
      activeFlowId: null,
      saveSheetPlaces: [],
      saveSheetSelectedIndex: 0,
      saveSheetMessage: null,
      saveSheetStatus: 'pending',
    });
  },

  // ── saveIndividualFromSheet ────────────────────────────────────────────────
  saveIndividualFromSheet: (item) => {
    if (!item.place) return;
    const stub: SavedPlaceStub = {
      place_id: item.place.place_id,
      place_name: item.place.place_name,
      address: item.place.address ?? '',
      saved_at: new Date().toISOString(),
      source_url: get().saveSheetSourceUrl,
      thumbnail_url: item.place.photo_url ?? undefined,
    };
    get().incrementSavedCount(stub);
  },

  // ── closeSaveSheetWithResults ──────────────────────────────────────────────
  closeSaveSheetWithResults: (savedItems) => {
    const { savedPlaceCount, tasteProfileConfirmed, signalTier, thread, saveSheetSourceUrl } = get();
    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    const newEntries: ThreadEntry[] = savedItems.map((item) => ({
      id: nextId(),
      role: 'assistant' as const,
      type: 'save' as const,
      item,
      sourceUrl: saveSheetSourceUrl,
    }));
    set({
      thread: [...thread, ...newEntries],
      phase: restingPhase,
      activeFlowId: null,
      saveSheetPlaces: [],
      saveSheetSourceUrl: null,
      saveSheetSelectedIndex: 0,
      saveSheetMessage: null,
      saveSheetStatus: 'pending',
    });
    void get().loadUserContext();
  },

  // ── dismissSaveSheet ───────────────────────────────────────────────────────
  dismissSaveSheet: () => {
    const { preSavePhase, savedPlaceCount, tasteProfileConfirmed, signalTier } = get();
    const restorePhase = preSavePhase ?? pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    set({
      phase: restorePhase,
      preSavePhase: null,
      saveSheetPlaces: [],
      saveSheetSourceUrl: null,
      saveSheetSelectedIndex: 0,
      saveSheetMessage: null,
      saveSheetStatus: 'pending',
    });
  },

  // ── incrementSavedCount ────────────────────────────────────────────────────
  incrementSavedCount: (place) => {
    incrementSavedPlaceCount();
    appendSavedPlace(place);
    const newCount = getSavedPlaceCount();
    set({ savedPlaceCount: newCount });
  },

  // ── dismissAssistantReply ──────────────────────────────────────────────────
  dismissAssistantReply: () => {
    const { thread } = get();
    let found = false;
    for (let i = thread.length - 1; i >= 0 && !found; i--) {
      const entry = thread[i];
      if (
        entry.role === 'assistant' &&
        (entry.type === 'assistant' || entry.type === 'clarification') &&
        !entry.dismissed
      ) {
        const newThread = thread.map((e, idx) => idx === i ? { ...e, dismissed: true } : e);
        set({ thread: newThread });
        found = true;
      }
    }
  },

  // ── autoSavePlace ──────────────────────────────────────────────────────────
  autoSavePlace: (item, sourceUrl) => {
    if (!item.place) return;
    const stub: SavedPlaceStub = {
      place_id: item.place.place_id,
      place_name: item.place.place_name,
      address: item.place.address ?? '',
      saved_at: new Date().toISOString(),
      source_url: sourceUrl,
      thumbnail_url: item.place.photo_url ?? undefined,
    };
    get().incrementSavedCount(stub);
    const { savedPlaceCount, tasteProfileConfirmed, signalTier, thread } = get();
    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    const entry: ThreadEntry = { id: nextId(), role: 'assistant', type: 'save', item, sourceUrl };
    set({
      thread: [...thread, entry],
      phase: restingPhase,
      activeFlowId: null,
      animationComplete: false,
      fetchComplete: false,
    });
  },

  // ── pushMessage ────────────────────────────────────────────────────────────
  pushMessage: (message) => {
    const { savedPlaceCount, tasteProfileConfirmed, signalTier, thread } = get();
    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    const entry: ThreadEntry = { id: nextId(), role: 'assistant', type: 'assistant', message };
    set({
      thread: [...thread, entry],
      phase: restingPhase,
      activeFlowId: null,
      animationComplete: false,
      fetchComplete: false,
    });
  },

  // ── pushRecallResults ──────────────────────────────────────────────────────
  pushRecallResults: (message, data) => {
    const { savedPlaceCount, tasteProfileConfirmed, signalTier, thread } = get();
    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed, signalTier);
    const entry: ThreadEntry = { id: nextId(), role: 'assistant', type: 'recall', message, data };
    set({
      thread: [...thread, entry],
      phase: restingPhase,
      activeFlowId: null,
      animationComplete: false,
      fetchComplete: false,
    });
  },

  // ── acceptPlace ───────────────────────────────────────────────────────────
  acceptPlace: async (recommendationId, placeId) => {
    const { userId, getToken } = get();
    const client = getSignalClient(userId ?? '', getToken ?? (async () => ''));
    await client.acceptRecommendation(recommendationId, placeId);
  },

  // ── rejectPlace ───────────────────────────────────────────────────────────
  rejectPlace: async (recommendationId, placeId) => {
    const { userId, getToken } = get();
    const client = getSignalClient(userId ?? '', getToken ?? (async () => ''));
    await client.rejectRecommendation(recommendationId, placeId);
  },

  // ── confirmChips ──────────────────────────────────────────────────────────
  confirmChips: async (decidedChips) => {
    const { userId, getToken } = get();
    // Optimistic update
    set((s) => ({
      chips: s.chips.map((c) => {
        const decided = decidedChips.find(
          (d) => d.label === c.label && d.selection_round === c.selection_round,
        );
        return decided ?? c;
      }),
    }));
    const client = getSignalClient(userId ?? '', getToken ?? (async () => ''));
    await client.confirmChips(decidedChips);
    await get().loadUserContext();
  },
}));
