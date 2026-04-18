# UI Alignment to New Contract — PlaceCard + Response Shapes + Signals

**Date:** 2026-04-18
**Scope:** `apps/web` only. Shared types already landed (see earlier commit on this branch). NestJS gateway already aligned.

## Goal

Align the Next.js frontend with the updated `libs/shared` response types (ADR-054 unified `PlaceObject`), introduce one reusable `PlaceCard` component shared across consult, recall, and save flows, wire the `POST /api/v1/signal` endpoint so users can accept/reject recommended places (and confirm/reject chips), and wire `GET /api/v1/user/context` so the product can route tier-gated UI (cold / warming / chip_selection / active per ADR-061).

## What the backend already returns (per contract)

- `ConsultResponseData`: `{ recommendation_id, results: [{ place: PlaceObject, source }], reasoning_steps }`
- `RecallResponseData`: `{ results: [{ place: PlaceObject, match_reason, relevance_score, score_type }], total_count, empty_state }`
- `ExtractPlaceData`: `{ results: [{ place: PlaceObject | null, confidence, status }], source_url, request_id }`

## What the frontend has today (out of sync)

- Flat per-place types: `ConsultPlace`, `RecallItem`, `SaveExtractPlace` (all removed from shared).
- Consult: `primary` + `alternatives` (no `results[]`).
- Recall: `total` / `has_more` (contract uses `total_count` / `empty_state`).
- Save: `places` / `requires_confirmation` + status enum `resolved|duplicate|unresolved` (contract uses `results` / `request_id` + `saved|needs_review|duplicate|pending|failed`).

## Decisions locked in

1. **Component location:** `apps/web/src/components/PlaceCard.tsx` (app-level, not libs/ui).
2. **Expansion:** tap-to-toggle inline; framer-motion `layout` animation.
3. **Per-place reasoning:** dropped. Contract's `ConsultResult` has no per-place reasoning; top-level `message` + `reasoning_steps[]` stay.
4. **Save auto-save rule:** `status === 'saved'` (AI decided) replaces `confidence >= 0.7 && status !== 'unresolved'`.
5. **`match_reason`:** rendered as raw enum string for now (i18n mapping deferred).
6. **Duplicate `original_saved_at`:** use `place.created_at` for the duplicate-state display.
7. **Signal submission:** fire-and-forget, no UI spinner; handle 202/404 silently, log 5xx for telemetry. No retries.
8. **User context fetch:** once on home-page mount (after auth), and re-fetched after a successful save or chip_confirm. No polling.
9. **Tier gating authority:** frontend owns the render decision per ADR-061. At `cold` / `chip_selection`, the frontend must NOT send a consult-intent message to `/api/v1/chat`.
10. **Actionable chip filter** (locks the earlier open question):
    - `currentRound = chips.find(c => c.status === 'pending')?.selection_round`
    - Actionable = `c.status === 'pending' && c.selection_round === currentRound`
    - All other chips (`confirmed` / `rejected`, or pending from an older round) render in the read-only "from before" section.
11. **Cold-tier suggestions source:** `apps/web/src/lib/cold-suggestions.ts` — hardcoded array of 6–8 `PlaceObject` entries (Tier 1 fields only; `geo_fresh: false`, `enriched: false`). Explicitly marked `PLACEHOLDER — not wired to backend` at the top of the file. Replacing this with a real endpoint is a separate backend task out of scope.
12. **`place === null` in extract results:** skip the card entirely. Render a single summary line above the list — `"{n} still processing"` for `status === 'pending'` entries, `"{n} couldn't be extracted"` for `status === 'failed'` entries. No placeholder card.
13. **Store rewrite is one pass:** Phases 2–4 (component/fixture/schema work) are written against the target store API; the store itself isn't touched until the consolidated Phase 6 rewrite. Expect temporary TS errors in intermediate phases — that's the point. No incremental store patches.

## Phases

### Phase 1 — New primitives

**1.1** `apps/web/src/lib/place-schema.ts` (NEW)
- Zod schema for `PlaceObject` (+ nested `PlaceAttributes`, `PlaceHours`, `PlaceLocationContext`).
- `satisfies z.ZodType<PlaceObject>` to stay in sync with shared type.

**1.2** `apps/web/src/components/PlaceCard.tsx` (NEW)
- Props:
  ```ts
  interface PlaceCardProps {
    place: PlaceObject;
    expanded?: boolean;                // controlled
    defaultExpanded?: boolean;         // uncontrolled
    onToggle?: (next: boolean) => void;
    badge?: React.ReactNode;           // per-flow: source pill / match_reason / confidence
    action?: React.ReactNode;          // per-flow: save / select / directions
    className?: string;
  }
  ```
- **Collapsed (160×160 square):** `photo_url` with `PlaceAvatar(name)` fallback, `place_name` overlay, `subcategory` or `attributes.cuisine`, price dots from `attributes.price_hint`.
- **Expanded:**
  - Tier 1 (always): tags chips, cuisine, ambiance, dietary, good_for, `location_context.neighborhood, city`.
  - Tier 2 (gated `place.geo_fresh || place.lat != null`): `address`.
  - Tier 3 (gated `place.enriched`): rating stars, hours open-now summary, phone, popularity.
- `framer-motion` `layout` prop on the root for smooth grow; body uses `AnimatePresence` so collapsed/expanded content fades.
- No internal data fetching — pure presentational.

### Phase 2 — Consult flow

**2.1** `apps/web/src/flows/consult/consult.schema.ts`
- Rewrite Zod to `{ recommendation_id, results: [{ place: PlaceObject, source }], reasoning_steps }`.

**2.2** `apps/web/src/flows/consult/consult.fixtures.ts`
- Rebuild fixtures with full `PlaceObject` shape (Tier 1 always, Tier 3 populated to demo enrichment).

**2.3** `apps/web/src/flows/consult/ConsultResult.tsx`
- Render `result.results[0]` as primary (via `<PlaceCard defaultExpanded action={…}>`).
- Render `result.results.slice(1)` as alternatives (grid of collapsed `<PlaceCard>`).
- Drop `result.reasoning` reads.

**2.4** Delete `PrimaryResultCard.tsx` + `AlternativeCard.tsx`
- Both replaced by direct `<PlaceCard>` usage from `ConsultResult.tsx` with flow-specific `badge` / `action` slots.
- Keep `TasteMatchArc` and `CommunityProofLine` as sibling decorations (not card-internal).

### Phase 3 — Recall flow

**3.1** `apps/web/src/flows/recall/index.tsx`
- Drop the ad-hoc normalization block.
- Zod schema: `{ results: [{ place, match_reason, relevance_score, score_type }], total_count, empty_state }`.
- `onResponse` now forwards the parsed `RecallResponseData` to the store unchanged.

**3.2** `apps/web/src/flows/recall/recall.fixtures.ts`
- Rebuild with `PlaceObject` + `match_reason` / `relevance_score` / `score_type`.

**3.3** `apps/web/src/flows/recall/RecallResults.tsx` + `apps/web/src/components/home/RecallResultBubble.tsx`
- Replace flat-field reads with `<PlaceCard place={r.place} badge={<MatchReason kind={r.match_reason} />}>`.
- Empty state now read from `empty_state`; "more saved places" hint replaced by `total_count - results.length` (shown only when `total_count > results.length`).

### Phase 4 — Save flow

**4.1** `apps/web/src/flows/save/save.schema.ts`
- Zod: `{ results: [{ place: PlaceObject | null, confidence, status }], source_url, request_id }`.

**4.2** `apps/web/src/flows/save/save.fixtures.ts`
- Rebuild with `PlaceObject` + new status enum.

**4.3** `apps/web/src/flows/save/index.ts`
- Replace ad-hoc normalization of `places[]` with a typed parse from the new schema.
- Call `store.openSaveSheet(query, data.results, data.source_url)` — signature is the target store API (lands in Phase 6).

**4.4** `apps/web/src/flows/save/SaveSheet.tsx` + `SaveFlow.tsx`
- Grid of `<PlaceCard place={item.place!}>` for items where `item.place !== null`, with:
  - `badge` = `<ConfidencePill confidence={item.confidence} status={item.status} />`.
  - `action` = Save/Confirm button driven by `status`.
- Status handling:
  - `saved` → mark as already-saved on mount (no button).
  - `needs_review` → "Confirm" button.
  - `duplicate` → duplicate badge, no save action.
  - `pending` → excluded from the grid (see summary line below).
  - `failed` → excluded from the grid.
- Summary line above grid (rendered only when counts > 0):
  - `{n} still processing` for items where `place === null && status === 'pending'`.
  - `{n} couldn't be extracted` for items where `place === null && status === 'failed'`.

**4.5** `apps/web/src/components/home/SaveResultBubble.tsx`
- Switch to `<PlaceCard place={item.place!} badge={<SavedChip />}>` when `item.place !== null`.
- When `item.place === null` (shouldn't hit the bubble, but guard defensively) render a single-line fallback: `"Place saved"` + source URL.

### Phase 5 — New API clients (no store changes yet)

**5.1** `apps/web/src/lib/signal-client.ts` (NEW)
- Thin wrapper around `FetchClient.post('/api/v1/signal', body)`.
- One method per variant:
  ```ts
  acceptRecommendation(recommendation_id: string, place_id: string): Promise<void>
  rejectRecommendation(recommendation_id: string, place_id: string): Promise<void>
  confirmChips(chips: ChipItem[]): Promise<void>
  ```
- Auth via the same `getToken` pattern as `chat-client.ts`.
- Fire-and-forget: resolves on any 2xx; swallows 404 (unknown recommendation_id) with `console.warn`; rethrows only on network errors.
- Fixture mode: `NEXT_PUBLIC_CHAT_FIXTURES === 'true'` resolves immediately with no network call.

**5.2** `apps/web/src/lib/user-context-client.ts` (NEW)
- `getUserContext(): Promise<UserContextResponse>` — `GET /api/v1/user/context`.
- Fixture mode returns a default (`signal_tier: 'active'`, empty chips) so dev works offline.

**5.3** `apps/web/src/lib/cold-suggestions.ts` (NEW)
- Hardcoded array of 6–8 `PlaceObject` entries (Tier 1 only, `geo_fresh: false`, `enriched: false`).
- File header comment: `// PLACEHOLDER — hardcoded until a suggestions endpoint exists.`

### Phase 6 — Consolidated store rewrite

One pass on `apps/web/src/store/home-store.ts`. All changes land together; no incremental touches in earlier phases.

**State changes**
- Remove `recallResults: RecallItem[]`, `saveSheetPlaces: SaveExtractPlace[]` — replace with `RecallResult[]` / `ExtractPlaceItem[]`.
- Remove `recallHasMore` — derive from `total_count > results.length` at render time or store `recallTotalCount: number`.
- Add `signalTier: SignalTier | null`, `chips: ChipItem[]`, `savedPlacesCountFromContext: number | null`.
- Add `saveSheetSourceUrl: string | null` (was captured inline before).
- `ThreadEntry` save variant: `{ place: ExtractPlaceItem; sourceUrl: string | null }`.
- `ThreadEntry` consult variant: add `perPlaceDecisions: Record<string, 'accepted' | 'rejected'>`.

**Action-signature changes**
- `openSaveSheet(query: string, items: ExtractPlaceItem[], sourceUrl: string | null)` (was `places: SaveExtractPlace[]`).
- `saveIndividualFromSheet(item: ExtractPlaceItem)`.
- `closeSaveSheetWithResults(savedItems: ExtractPlaceItem[])`.
- `autoSavePlace(item: ExtractPlaceItem, sourceUrl: string | null)`.
- `pushRecallResults(message: string, data: RecallResponseData)` — signature unchanged but field access uses the new shape.
- `confirmSave`: switch on new status enum (`saved` / `needs_review` / `duplicate` / `pending` / `failed`).
- `incrementSavedCount`: build `SavedPlaceStub` from `place.place_id`, `place.place_name`, `place.address`, `place.photo_url`.

**New actions**
- `loadUserContext(): Promise<void>` — calls user-context client, populates `signalTier` / `chips` / `savedPlacesCountFromContext`, recomputes resting phase. Called from `init()`, and after `incrementSavedCount` and `confirmChips`.
- `acceptPlace(recommendationId: string, placeId: string): Promise<void>` — calls signal client, updates `perPlaceDecisions` on the matching consult thread entry.
- `rejectPlace(recommendationId: string, placeId: string): Promise<void>` — same shape.
- `confirmChips(decidedChips: ChipItem[]): Promise<void>` — submits via signal client, optimistically updates local `chips`, then `loadUserContext()` to re-read tier.

**`pickRestingPhase` rewrite** (tier-first, fallback to count)
```
signalTier === 'cold'            → 'cold-0'
signalTier === 'chip_selection'  → 'chip-selection'
signalTier === 'warming'         → 'idle'
signalTier === 'active'          → 'idle'
signalTier === null              → fallback: count-based ('cold-0' / 'cold-1-4' / 'idle')
```

**`submit()` tier guards**
- If `signalTier === 'cold' || signalTier === 'chip_selection'`, allow only `save` intent. Reject other intents by pushing a clarification entry "Let's finish setup first." No HTTP call.
- Forward `signal_tier` in the `/api/v1/chat` body on every call (read from store, pass through `ChatClient.chat`).

**Phase extension**
- `HomePhase` gains `'chip-selection'`.

### Phase 7 — Tier-gated UI components

All rendering here consumes store state landed in Phase 6; no store edits in this phase.

**7.1** Cold tier — `ColdOnboarding.tsx` update
- Extend the existing `apps/web/src/flows/cold-start-zero/ColdStartZero.tsx` (or the equivalent rendered at `phase === 'cold-0'`) to surface the curated list from `apps/web/src/lib/cold-suggestions.ts`.
- Each suggestion renders as a `<PlaceCard>` with `action = <SaveButton>`; tapping save funnels through the existing save flow (extract-place response echoing the saved place).
- No chips UI.

**7.2** Chip selection board — `ChipSelectionBoard.tsx` (NEW)
- Location: `apps/web/src/components/home/ChipSelectionBoard.tsx`.
- Layout: full-screen on mobile, centered modal on desktop (≥768px breakpoint).
- Actionable filter (locked from Decision 10):
  ```ts
  const currentRound = chips.find(c => c.status === 'pending')?.selection_round;
  const actionable = chips.filter(
    c => c.status === 'pending' && c.selection_round === currentRound,
  );
  const fromBefore = chips.filter(c => !actionable.includes(c));
  ```
- Two sections:
  - **"Tell me about your taste"** — `actionable` chips as 3-state pill toggles (pending → confirmed → rejected → pending).
  - **"From before"** (conditional on `fromBefore.length > 0`) — locked confirmed/rejected chips plus any older-round pending chips, all read-only.
- Footer: "Done" primary button (disabled until at least one chip is decided) → calls `store.confirmChips(touchedChips)`.
- "Skip" secondary button: closes the board without submission; on next load tier will still be `chip_selection` until server state changes.

**7.3** Persistent chip sidebar — `TasteChipsSidebar.tsx` (NEW)
- Location: `apps/web/src/components/home/TasteChipsSidebar.tsx`.
- Renders on warming and active tiers alongside the main chat area.
- Responsive: right rail on desktop (≥768px), bottom collapsible strip on mobile (initial-collapsed with a "your taste" label).
- Warming: every chip rendered as a neutral pill (read-only, no interaction).
- Active: three visual states — confirmed (filled primary), rejected (muted with strikethrough), pending (neutral outline). No tap handlers; decisions happen in the next `chip_selection` round.

**7.4** Saved-progress nudge — `SavedProgressNudge.tsx` (NEW, warming only)
- Location: `apps/web/src/components/home/SavedProgressNudge.tsx`.
- Displays `{savedPlacesCountFromContext} of 5 saved` with a thin progress bar.
- Auto-hides when count ≥ 5 or `signalTier !== 'warming'`.

**7.5** Home layout wiring
- The home-page render tree picks components off `phase` + `signalTier`:
  - `phase === 'cold-0'` and/or `signalTier === 'cold'` → ColdOnboarding.
  - `phase === 'chip-selection'` → ChipSelectionBoard (full-screen / modal).
  - `signalTier === 'warming' || 'active'` → normal chat + TasteChipsSidebar (+ SavedProgressNudge when warming).

**7.6** `chat-client.ts` — forward `signal_tier`
- `ChatClient.chat()` signature adds `signalTier?: SignalTier | null`.
- `makeRealChatClient.chat` posts `{ message, signal_tier }` to `/api/v1/chat`.
- Store `submit()` reads `get().signalTier` and passes it to the client.
- Fixture client ignores the tier.

### Phase 8 — Verify

```bash
pnpm nx lint web
pnpm nx typecheck web    # frontend type sanity (shared types already aligned)
pnpm nx build web        # confirms prod build
pnpm nx dev web          # manual smoke
# manual checklist:
#   - fixtures: consult / recall / save render via PlaceCard
#   - real API: user-context loads; tier gating routes the home view correctly
#   - chip_selection tier → ChipSelectionBoard renders, chip_confirm round-trips, tier advances to active
#   - consult results: accept/reject buttons POST /api/v1/signal (202 in network tab)
#   - chat body now includes signal_tier on /api/v1/chat
#   - warming: sidebar + progress nudge visible; active: sidebar only
```

## Files touched (summary)

**New (7):**
- `apps/web/src/lib/place-schema.ts`
- `apps/web/src/components/PlaceCard.tsx`
- `apps/web/src/lib/signal-client.ts`
- `apps/web/src/lib/user-context-client.ts`
- `apps/web/src/components/home/ChipSelectionBoard.tsx`
- `apps/web/src/components/home/TasteChipsSidebar.tsx`
- `apps/web/src/components/home/SavedProgressNudge.tsx`

**Deleted (2):**
- `apps/web/src/flows/consult/PrimaryResultCard.tsx`
- `apps/web/src/flows/consult/AlternativeCard.tsx`

**Modified (14):**
- `apps/web/src/flows/consult/{consult.schema,consult.fixtures,ConsultResult,index}.ts[x]`
- `apps/web/src/flows/recall/{index,RecallResults,recall.fixtures}.ts[x]`
- `apps/web/src/flows/save/{save.schema,save.fixtures,index,SaveSheet,SaveFlow}.ts[x]`
- `apps/web/src/components/home/{SaveResultBubble,RecallResultBubble}.tsx`
- `apps/web/src/store/home-store.ts`
- `apps/web/src/lib/chat-client.ts` (forward `signal_tier`)
- `apps/web/src/flows/flow-definition.ts` (new `'chip-selection'` phase)

## Not in scope

- Design-system promotion of `PlaceCard` into `libs/ui` (revisit when a second app consumes it).
- i18n mapping for `match_reason` enum.
- Visual redesign of TasteMatchArc / CommunityProofLine.
- Any backend changes (already landed).
- Retry / backoff for failed signal submissions.
- Polling or live-updating `user-context` beyond the refetch triggers listed in Phase 6 (`init`, post-save, post-chip_confirm).

## Risk notes

- **Fixture parity:** the AI service must already be emitting the new shape for end-to-end flows to work against real data. If it doesn't, non-fixture paths will fail Zod validation — the tight Zod schemas will catch this at runtime rather than silently mis-render. Acceptable.
- **`place_id` format change:** contract says internal UUID/ULID (`pl_01HZ...`); old shape used Google Places IDs directly. The store uses `place_id` as a React key and localStorage anchor — values will change but format is still an opaque string. Old localStorage entries keyed on Google IDs will coexist; no migration needed (user-visible counters use length, not the IDs).
- **`match_reason` rendering:** showing raw enum (`"semantic + keyword"`) may look odd; flagged for follow-up i18n work.
- **User-context failure mode:** if `GET /api/v1/user/context` fails (auth lag, service outage) the UI falls back to the old savedPlaceCount heuristic. This means a new user could see normal chat before their tier is known, and send a consult that FastAPI would reject at the AI service layer. Acceptable for now; flagged for retry/backoff work.
- **Signal loss:** accept/reject signals are fire-and-forget. A 500 or network drop silently loses the signal. Tolerable because the AI rewrite handler is idempotent on unchanged state, but worth revisiting if taste-profile accuracy regresses.
- **Cold-tier curated suggestions:** the per-tier spec says "show curated place suggestions to save from" at cold. The API contract doesn't expose a suggestions endpoint today — I'll stub with a local constant list for now and flag it. If you want this wired to a real endpoint, that's a backend change out of this plan's scope.
- **`chip_selection` during an in-flight consult:** if the user's last action triggered a tier advance to `chip_selection` mid-flight, we'll interrupt and route to the board on the next response. Abort in-flight requests on phase change to avoid rendering stale consult results behind the modal.
