'use client';

import { create } from 'zustand';
import type { ClientIntent, ConsultResponseData, ReasoningStep, RecallItem, SavedPlaceStub, ChatRequestDto } from '@totoro/shared';
import type { FlowId, HomePhase } from '../flows/flow-definition';
import { getSavedPlaceCount } from '../storage/saved-places-storage';
import { getTasteProfileConfirmed, setTasteProfileConfirmed } from '../storage/taste-profile-storage';
import { getLocation, setLocation as persistLocation } from '../storage/location-storage';
import { classifyIntent } from '../lib/classify-intent';
import { getChatClient } from '../lib/chat-client';
import { FLOW_BY_CLIENT_INTENT, FLOW_BY_RESPONSE_TYPE } from '../flows/registry';

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
  pendingError: { message: string; category: 'offline' | 'timeout' | 'generic' | 'server' } | null;
  abortController: AbortController | null;

  // Flow-specific slots (stubbed until sub-plans 3–7)
  recallResults: RecallItem[] | null;
  recallHasMore: boolean;
  saveSheetPlace: SavedPlaceStub | null;
  saveSheetStatus: 'pending' | 'saving' | 'duplicate' | 'error';
  saveSheetOriginalSavedAt: string | null;
  assistantMessage: string | null;
  clarificationMessage: string | null;

  // Actions
  hydrate: () => void;
  init: (opts: { userId: string | null; getToken: () => Promise<string> }) => void;
  setUserId: (id: string | null) => void;
  setLocation: (loc: { lat: number; lng: number } | null) => void;
  submit: (message: string, opts?: { forceIntent?: ClientIntent }) => Promise<void>;
  markAnimationComplete: () => void;
  setPendingResult: (data: ConsultResponseData) => void;
  tryRevealResult: () => void;
  confirmTasteProfile: () => void;
  reset: () => void;

  // Actions — stubbed until sub-plans 3–7
  submitRecall: (message: string) => Promise<void>;
  openSaveSheet: (message: string) => void;
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
  pendingError: null,
  abortController: null,
  recallResults: null,
  recallHasMore: false,
  saveSheetPlace: null,
  saveSheetStatus: 'pending',
  saveSheetOriginalSavedAt: null,
  assistantMessage: null,
  clarificationMessage: null,

  // ── hydrate ────────────────────────────────────────────────────────────────
  hydrate: () => {
    const devOverride =
      process.env.NODE_ENV !== 'production'
        ? process.env.NEXT_PUBLIC_DEV_SAVED_COUNT
        : undefined;

    let savedPlaceCount: number;
    if (devOverride !== undefined && devOverride !== '') {
      const parsed = parseInt(devOverride, 10);
      savedPlaceCount = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } else {
      savedPlaceCount = getSavedPlaceCount();
    }

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
  // Classifies intent → pre-routes to flow → fires fetch → race with animation.
  submit: async (message, opts) => {
    const { userId, getToken, location } = get();

    // Cancel any in-flight request
    get().abortController?.abort();
    const abortController = new AbortController();

    // Classify intent (forceIntent overrides classification)
    const intent: ClientIntent = opts?.forceIntent ?? classifyIntent(message);

    // Pre-route via intent — pick initial flow and phase
    const preFlow = FLOW_BY_CLIENT_INTENT[intent];
    const initialFlowId: FlowId = preFlow?.id ?? 'consult';
    const initialPhase = preFlow?.phase ?? 'thinking';

    set({
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
      abortController,
    });

    // Fire fetch
    try {
      const client = getToken
        ? getChatClient(getToken)
        : getChatClient(async () => '');

      const body: ChatRequestDto = {
        user_id: userId ?? '',
        message,
        ...(location ? { location } : {}),
      };

      const res = await client.chat({
        message,
        userId: userId ?? '',
        location,
        signal: abortController.signal,
      });

      void body; // suppress unused var warning; body is constructed for type clarity

      // Handle clarification orthogonally — set hint, don't change phase
      if (res.type === 'clarification') {
        set({ fetchComplete: true, clarificationMessage: res.message });
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

      // Store reasoning steps if present (consult flow populates these)
      if (res.type === 'consult' && res.data && typeof res.data === 'object' && 'reasoning_steps' in res.data) {
        set({ reasoningSteps: (res.data as ConsultResponseData).reasoning_steps ?? [] });
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
  tryRevealResult: () => {
    const { animationComplete, fetchComplete, pendingResult, pendingError } = get();
    if (!animationComplete || !fetchComplete) return;

    if (pendingError) {
      set({ phase: 'error', error: pendingError, pendingError: null });
      return;
    }

    if (pendingResult) {
      set({ phase: 'result', result: pendingResult, pendingResult: null });
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
    });
  },

  // ── Stubbed — sub-plan 3 ───────────────────────────────────────────────────
  submitRecall: async (_message) => {
    throw new Error('Not implemented: submitRecall — see sub-plan 3');
  },

  // ── Stubbed — sub-plan 6 ───────────────────────────────────────────────────
  openSaveSheet: (_message) => {
    throw new Error('Not implemented: openSaveSheet — see sub-plan 6');
  },
  confirmSave: async () => {
    throw new Error('Not implemented: confirmSave — see sub-plan 6');
  },
  dismissSaveSheet: () => {
    throw new Error('Not implemented: dismissSaveSheet — see sub-plan 6');
  },
  incrementSavedCount: (_place) => {
    throw new Error('Not implemented: incrementSavedCount — see sub-plan 6');
  },

  // ── Stubbed — sub-plan 7 ───────────────────────────────────────────────────
  dismissAssistantReply: () => {
    throw new Error('Not implemented: dismissAssistantReply — see sub-plan 7');
  },
}));
