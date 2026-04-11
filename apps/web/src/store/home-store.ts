'use client';

import { create } from 'zustand';
import type {
  ClientIntent,
  ConsultResponseData,
  ReasoningStep,
  RecallItem,
  SavedPlaceStub,
  ExtractPlaceData,
  SaveExtractPlace,
  SaveSheetPlace,
} from '@totoro/shared';
import type { FlowId, HomePhase } from '../flows/flow-definition';
import { getSavedPlaceCount, appendSavedPlace, incrementSavedPlaceCount } from '../storage/saved-places-storage';
import { getTasteProfileConfirmed, setTasteProfileConfirmed } from '../storage/taste-profile-storage';
import { getLocation, setLocation as persistLocation } from '../storage/location-storage';
import { classifyIntent } from '../lib/classify-intent';
import { getChatClient } from '../lib/chat-client';
import { FLOW_BY_CLIENT_INTENT, FLOW_BY_RESPONSE_TYPE } from '../flows/registry';

// ── Thread entry types ─────────────────────────────────────────────────────────
export type ThreadEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; type: 'clarification'; message: string; dismissed?: boolean }
  | { id: string; role: 'assistant'; type: 'assistant'; message: string; dismissed?: boolean }
  | { id: string; role: 'assistant'; type: 'consult'; message: string; data: ConsultResponseData }
  | { id: string; role: 'assistant'; type: 'error'; category: 'offline' | 'timeout' | 'generic' | 'server' };

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

  // Location
  location: { lat: number; lng: number } | null;

  // Animation-fetch race
  animationComplete: boolean;
  fetchComplete: boolean;
  pendingResult: ConsultResponseData | null;
  pendingMessage: string | null;
  pendingError: { message: string; category: 'offline' | 'timeout' | 'generic' | 'server' } | null;
  abortController: AbortController | null;

  // Chat thread — accumulates all user + assistant exchanges
  thread: ThreadEntry[];

  // Flow-specific slots
  recallResults: RecallItem[] | null;
  recallHasMore: boolean;
  recallQuery: string | null;
  recallBreadcrumb: boolean;
  discoveryPlaces: Array<{ place_id: string; place_name: string; cuisine?: string; price_range?: string; address: string }> | null;
  discoveryQuery: string | null;
  saveSheetPlace: SaveSheetPlace | null;
  saveSheetPlaces: SaveExtractPlace[];
  saveSheetSelectedIndex: number;
  saveSheetMessage: string | null;
  saveSheetStatus: 'pending' | 'saving' | 'duplicate' | 'error';
  saveSheetOriginalSavedAt: string | null;
  preSavePhase: HomePhase | null;
  assistantMessage: string | null;
  clarificationMessage: string | null;

  // Actions
  hydrate: () => void;
  init: (opts: { userId: string | null; getToken: () => Promise<string> }) => void;
  setUserId: (id: string | null) => void;
  setLocation: (loc: { lat: number; lng: number } | null) => void;
  submit: (message: string, opts?: { forceIntent?: ClientIntent; isRetry?: boolean }) => Promise<void>;
  markAnimationComplete: () => void;
  setPendingResult: (data: ConsultResponseData) => void;
  tryRevealResult: () => void;
  confirmTasteProfile: () => void;
  reset: () => void;

  // Actions — stubbed until sub-plans 3–7
  submitRecall: (message: string) => Promise<void>;
  setRecallResults: (results: RecallItem[], hasMore: boolean) => void;
  setDiscoveryResults: (places: Array<{ place_id: string; place_name: string; cuisine?: string; price_range?: string; address: string }>, query: string) => void;
  openSaveSheet: (message: string, places: SaveExtractPlace[]) => void;
  setSaveSheetSelectedIndex: (index: number) => void;
  confirmSave: () => Promise<void>;
  dismissSaveSheet: () => void;
  dismissAssistantReply: () => void;
  incrementSavedCount: (place: SavedPlaceStub) => void;
}

// Exported type for use in FlowDefinition — replaces the `any` forward declaration
export type HomeStoreApi = HomeState;

function pickRestingPhase(savedPlaceCount: number, tasteProfileConfirmed: boolean): HomePhase {
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
  location: null,
  animationComplete: false,
  fetchComplete: false,
  pendingResult: null,
  pendingMessage: null,
  pendingError: null,
  abortController: null,
  thread: [],
  recallResults: null,
  recallHasMore: false,
  recallQuery: null,
  recallBreadcrumb: false,
  discoveryPlaces: null,
  discoveryQuery: null,
  saveSheetPlace: null,
  saveSheetPlaces: [],
  saveSheetSelectedIndex: 0,
  saveSheetMessage: null,
  saveSheetStatus: 'pending',
  saveSheetOriginalSavedAt: null,
  preSavePhase: null,
  assistantMessage: null,
  clarificationMessage: null,

  // ── hydrate ────────────────────────────────────────────────────────────────
  hydrate: () => {
    const savedPlaceCount = getSavedPlaceCount();
    const tasteProfileConfirmed = getTasteProfileConfirmed();
    const location = getLocation();
    const phase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);

    set({ phase, savedPlaceCount, tasteProfileConfirmed, location, hydrated: true });
  },

  // ── init ───────────────────────────────────────────────────────────────────
  init: ({ userId, getToken }) => {
    set({ userId, getToken });
  },

  // ── setUserId ──────────────────────────────────────────────────────────────
  setUserId: (id) => {
    set({ userId: id });
  },

  // ── setLocation ────────────────────────────────────────────────────────────
  setLocation: (loc) => {
    persistLocation(loc);
    set({ location: loc });
  },

  // ── submit ─────────────────────────────────────────────────────────────────
  submit: async (message, opts) => {
    const { getToken, location, thread } = get();

    // Dismiss any visible assistant/clarification bubble before new dispatch
    get().dismissAssistantReply();

    // Cancel any in-flight request
    get().abortController?.abort();
    const abortController = new AbortController();

    // Classify intent (forceIntent overrides classification)
    const intent: ClientIntent = opts?.forceIntent ?? classifyIntent(message);

    // Pre-route via intent — pick initial flow and phase
    const preFlow = FLOW_BY_CLIENT_INTENT[intent];
    const initialFlowId: FlowId = preFlow?.id ?? 'consult';
    const initialPhase = preFlow?.phase ?? 'thinking';

    // Build new thread: retry replaces last error entry; normal submit appends user message
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

    // Fire fetch
    try {
      const client = getToken
        ? getChatClient(getToken)
        : getChatClient(async () => '');

      const res = await client.chat({
        message,
        location,
        signal: abortController.signal,
      });

      // Clarification — push to thread, reset to resting phase
      if (res.type === 'clarification') {
        const { savedPlaceCount, tasteProfileConfirmed } = get();
        const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);
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

      // Resolve final flow from response type
      const finalFlow = FLOW_BY_RESPONSE_TYPE[res.type];

      // Validate response shape
      const parsed = finalFlow.schema.safeParse(res.data);
      if (!parsed.success) {
        const errorObj = { message: 'Invalid response shape', category: 'generic' as const };
        set({ fetchComplete: true, pendingError: errorObj });
        get().tryRevealResult();
        return;
      }

      // Store reasoning steps and message if present (consult flow populates these)
      if (res.type === 'consult' && res.data && typeof res.data === 'object' && 'reasoning_steps' in res.data) {
        set({
          reasoningSteps: (res.data as ConsultResponseData).reasoning_steps ?? [],
          pendingMessage: res.message ?? null,
        });
      }

      // Delegate to flow's onResponse — flow sets pendingResult and calls tryRevealResult
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
  // Only fires when both animation AND fetch are complete.
  // Pushes the result/error to the thread and resets to resting phase.
  tryRevealResult: () => {
    const { animationComplete, fetchComplete, pendingResult, pendingError, savedPlaceCount, tasteProfileConfirmed } = get();
    if (!animationComplete || !fetchComplete) return;

    const restingPhase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);

    if (pendingError) {
      const entry: ThreadEntry = {
        id: nextId(),
        role: 'assistant',
        type: 'error',
        category: pendingError.category,
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
    const { savedPlaceCount, tasteProfileConfirmed } = get();
    const phase = pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);
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
      // thread is intentionally preserved — conversation history persists
    });
  },

  // ── submitRecall ──────────────────────────────────────────────────────────
  submitRecall: async (message) => {
    const { getToken, location } = get();

    set({
      recallQuery: message,
      phase: 'recall',
      recallResults: null,
      recallBreadcrumb: false,
    });

    // Start 600ms breadcrumb timer
    let breadcrumbTimer: ReturnType<typeof setTimeout> | null = null;
    const startBreadcrumbTimer = () => {
      breadcrumbTimer = setTimeout(() => {
        if (get().phase === 'recall') {
          set({ recallBreadcrumb: true });
        }
      }, 600);
    };
    startBreadcrumbTimer();

    try {
      const client = getToken ? getChatClient(getToken) : getChatClient(async () => '');
      const res = await client.chat({
        message,
        location,
      });

      // Cancel timer and update state with results
      if (breadcrumbTimer) clearTimeout(breadcrumbTimer);

      if (res.type === 'recall' && res.data) {
        const data = res.data as { results: RecallItem[]; has_more: boolean };
        set({
          recallResults: data.results,
          recallHasMore: data.has_more,
          recallBreadcrumb: false,
        });
      }
    } catch (_err) {
      // Cancel timer on error
      if (breadcrumbTimer) clearTimeout(breadcrumbTimer);
      set({ recallBreadcrumb: false });
    }
  },

  // ── setRecallResults ───────────────────────────────────────────────────────
  setRecallResults: (results, hasMore) => {
    set({ recallResults: results, recallHasMore: hasMore });
  },

  // ── setDiscoveryResults ────────────────────────────────────────────────────
  setDiscoveryResults: (places, query) => {
    set({ discoveryPlaces: places, discoveryQuery: query });
  },

  // ── openSaveSheet ─────────────────────────────────────────────────────────
  openSaveSheet: (message, places) => {
    const { phase } = get();
    set({
      preSavePhase: phase,
      saveSheetMessage: message,
      saveSheetPlaces: places,
      saveSheetSelectedIndex: 0,
      saveSheetStatus: 'pending',
      phase: 'save-sheet',
    });
  },

  // ── setSaveSheetSelectedIndex ──────────────────────────────────────────────
  setSaveSheetSelectedIndex: (index) => {
    set({ saveSheetSelectedIndex: index });
  },

  // ── confirmSave ────────────────────────────────────────────────────────────
  confirmSave: async () => {
    const { getToken, location, saveSheetMessage, saveSheetSelectedIndex } = get();

    set({ saveSheetStatus: 'saving' });

    try {
      const client = getToken ? getChatClient(getToken) : getChatClient(async () => '');
      const res = await client.chat({
        message: saveSheetMessage || '',
        location,
      });

      if (res.type === 'extract-place' && res.data) {
        const data = res.data as ExtractPlaceData;
        const selectedPlace = data.places[saveSheetSelectedIndex] || data.places[0];

        if (selectedPlace.status === 'duplicate') {
          // Duplicate save — show duplicate state
          set({
            phase: 'save-duplicate',
            saveSheetStatus: 'duplicate',
            saveSheetOriginalSavedAt: selectedPlace.original_saved_at || null,
          });
        } else if (selectedPlace.status === 'resolved') {
          // Resolved save — increment count and show snackbar
          const place: SavedPlaceStub = {
            place_id: selectedPlace.place_id || '',
            place_name: selectedPlace.place_name || '',
            address: selectedPlace.address || '',
            saved_at: new Date().toISOString(),
            source_url: data.source_url,
            thumbnail_url: selectedPlace.thumbnail_url,
          };
          get().incrementSavedCount(place);
          set({ phase: 'save-snackbar', saveSheetStatus: 'pending' });
        } else {
          // Unresolved — keep sheet in pending state
          set({ saveSheetStatus: 'pending' });
        }
      }
    } catch (_err) {
      set({ saveSheetStatus: 'error' });
    }
  },

  // ── dismissSaveSheet ───────────────────────────────────────────────────────
  dismissSaveSheet: () => {
    const { preSavePhase, savedPlaceCount, tasteProfileConfirmed } = get();
    const restorePhase = preSavePhase ?? pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);
    set({
      phase: restorePhase,
      preSavePhase: null,
      saveSheetPlace: null,
      saveSheetPlaces: [],
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

    // Find last undismissed assistant/clarification entry and mark it dismissed
    for (let i = thread.length - 1; i >= 0 && !found; i--) {
      const entry = thread[i];
      if (
        entry.role === 'assistant' &&
        (entry.type === 'assistant' || entry.type === 'clarification') &&
        !entry.dismissed
      ) {
        const newThread = thread.map((e, idx) =>
          idx === i ? { ...e, dismissed: true } : e
        );
        set({ thread: newThread });
        found = true;
      }
    }
  },
}));
