# Research: Home Page Sub-plans 3–7

**Branch**: `012-home-subplans-3-7` | **Date**: 2026-04-11

## R-001: CSS bottom half-sheet animation (no framer-motion)

**Decision**: Fixed-position `translate-y-full → translate-y-0` driven by Tailwind transition classes, toggled by the store phase.

**Rationale**: The `translate-y-full` approach avoids layout flashing, works reliably on iOS Safari (no `bottom` animation jank), and doesn't require framer-motion which is still pending approval. CSS transitions are sufficient because there is no gesture-tracking requirement — tap-outside-to-dismiss is a simple overlay click handler.

**Implementation pattern**:
```tsx
// Sheet
<div className={cn(
  "fixed inset-x-0 bottom-0 z-40 bg-background rounded-t-2xl",
  "transform transition-transform duration-300 ease-out",
  open ? "translate-y-0" : "translate-y-full"
)} onClick={(e) => e.stopPropagation()} />

// Overlay
<div
  className={cn(
    "fixed inset-0 z-30 transition-opacity duration-300",
    open ? "bg-black/20 pointer-events-auto" : "opacity-0 pointer-events-none"
  )}
  onClick={onDismiss}
/>
```

**Alternatives considered**: framer-motion `AnimatePresence` — rejected because framer-motion is pending approval. `bottom` CSS property animation — rejected because of iOS Safari layout-recalculation jank.

---

## R-002: SSR-safe `prefers-reduced-motion` in `<Illustration />`

**Decision**: Use the Tailwind `motion-reduce:!animate-none` utility directly on the `<img>` element. No hook, no `matchMedia` call.

**Rationale**: Tailwind `motion-reduce:` applies `@media (prefers-reduced-motion: reduce)` at the CSS level — no JavaScript, no hydration mismatch risk. The `!` important overrides the animation class that the registry assigns. This is consistent with how `next-themes` handles dark mode (CSS variables, no JS toggle). The `animate` prop still works as a force-off escape hatch for screenshots.

**Implementation pattern**:
```tsx
<img
  src={def.src}
  alt={t(def.altKey)}
  className={cn(
    animate && def.animation !== 'anim-none' && def.animation,
    "motion-reduce:!animate-none",
    className
  )}
/>
```

**Alternatives considered**: `useEffect` + `matchMedia` hook — rejected because it adds a client-only render pass and risks hydration mismatch in Next.js App Router. CSS-only is strictly better for this static-animation use case.

---

## R-003: `preSavePhase` store pattern

**Decision**: Add `preSavePhase: HomePhase | null` to the store state. `openSaveSheet()` writes `get().phase` into `preSavePhase` before setting `phase: 'save-sheet'`. Snackbar dismiss reads `preSavePhase` to restore. Fallback to `pickRestingPhase()` if `null`.

**Rationale**: The save sheet can open from any phase (idle, cold-0, cold-1-4, result). A single field is the simplest way to record the pre-save context without a full phase history stack.

**Implementation pattern**:
```ts
openSaveSheet: (message) => {
  const { phase } = get();
  set({ preSavePhase: phase, phase: 'save-sheet', saveSheetMessage: message, saveSheetStatus: 'pending' });
}

// On snackbar dismiss:
const restoreTo = get().preSavePhase ?? pickRestingPhase(savedPlaceCount, tasteProfileConfirmed);
set({ phase: restoreTo, preSavePhase: null });
```

---

## R-004: Thread `dismissed` flag for assistant/clarification bubbles

**Decision**: Add `dismissed?: boolean` to the `assistant` and `clarification` thread entry types. `dismissAssistantReply()` finds the last non-dismissed assistant/clarification entry in the thread and sets `dismissed: true` via `map()` (no array splice).

**Rationale**: Splice-free mutation preserves the append-only thread model from sub-plans 1–2. The `dismissed` flag is a render hint — the bubble renders `null` when `dismissed: true`. This avoids index-management complexity and prevents visual jumps on re-render.

**Implementation pattern**:
```ts
dismissAssistantReply: () => {
  const thread = get().thread;
  let found = false;
  const updated = [...thread].reverse().map(entry => {
    if (!found && entry.role === 'assistant' &&
        (entry.type === 'assistant' || entry.type === 'clarification') &&
        !entry.dismissed) {
      found = true;
      return { ...entry, dismissed: true };
    }
    return entry;
  }).reverse();
  set({ thread: updated });
}
```

---

## R-005: Per-intent fixture files and Zod boundary validation

**Decision**: Split the inline fixture object in `chat-client.ts` into four dedicated files under `apps/web/src/api/fixtures/`. Each file exports a keyed map of query → response plus a fallback. The `chat-client.ts` imports these and dispatches by intent. Zod schemas live in `apps/web/src/api/schemas/` with one schema per `ChatResponseDto` branch.

**Rationale**: Inline fixtures in `chat-client.ts` are hard to maintain as the number of flows grows. Per-intent files mirror the per-flow structure already used in `flows/consult/consult.fixtures.ts`. Zod boundary validation catches contract drift early — a `safeParse` failure in the chat client surfaces before the store ever sees malformed data.

**Fixture delay schedule** (from spec):
- consult: 2500 ms
- recall: 400 ms
- save: 800 ms
- assistant: 300 ms

---

## R-006: `ChatResponseDto` discriminated union upgrade

**Decision**: Keep `ChatResponseDto` as a single flat interface in `libs/shared` (not a true TS discriminated union) but add a proper `data` per-type shape by extending `RecallResponseData` with `has_more`, adding `ExtractPlaceData` as the explicit `extract-place` data type, and adding `thumbnail_url?` to `RecallItem` and `SavedPlaceStub`.

**Rationale**: The store and chat client use `res.type` to branch already — the existing shape works. The gaps are missing fields: `has_more` on recall, `thumbnail_url` on `RecallItem`/`SavedPlaceStub`, and the full `ExtractPlaceData` shape for the save flow. These are additive changes that don't break existing consumers.

**Fields to add to `libs/shared/src/lib/types.ts`**:
- `RecallResponseData.has_more: boolean`
- `RecallItem.thumbnail_url?: string`
- `SavedPlaceStub`: add `source_url: string | null`, `thumbnail_url?: string` (keep existing fields)
- New `ExtractPlaceData` interface (mirrors `api-contract.md`)
- New `SaveSheetPlace` interface: `{ name: string; source: string; location: string; thumbnail_url?: string }`
