'use client';

import { create } from 'zustand';
import type { ClientIntent, ConsultResponseData, ReasoningStep, RecallItem, SavedPlaceStub } from '@totoro/shared';
import type { FlowId, HomePhase } from '../flows/flow-definition';
import { getSavedPlaceCount } from '../storage/saved-places-storage';
import { getTasteProfileConfirmed, setTasteProfileConfirmed } from '../storage/taste-profile-storage';
import { getLocation, setLocation as persistLocation } from '../storage/location-storage';
import { classifyIntent } from '../lib/classify-intent';
import { getChatClient } from '../lib/chat-client';
import { FLOW_BY_CLIENT_INTENT, FLOW_BY_RESPONSE_TYPE } from '../flows/registry';

// ── Thread entry types ─────────────────────────────────────────────────────────
export type ThreadEntry =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; type: 'clarification'; message: string }
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
  submit: (message: string, opts?: { forceIntent?: ClientIntent; isRetry?: boolean }) => Promise<void>;
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
  saveSheetPlace: null,
  saveSheetStatus: 'pending',
  saveSheetOriginalSavedAt: null,
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
