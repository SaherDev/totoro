# Feature Specification: UI Alignment to PlaceObject Contract

**Feature Branch**: `015-ui-align-placeobject`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: Align Next.js frontend with updated `libs/shared` response types (ADR-054 unified `PlaceObject`), introduce one reusable `PlaceCard` component, wire `POST /api/v1/signal` for place accept/reject and chip confirmation, and wire `GET /api/v1/user/context` for tier-gated UI routing.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consult results render unified PlaceCard (Priority: P1)

A user submits a natural language consult query (e.g., "cheap dinner nearby"). The home screen shows the top recommended place in an expanded PlaceCard and up to two alternatives as collapsed PlaceCards. The user can tap any card to expand it. They can accept or reject a recommendation, and the system records that signal silently.

**Why this priority**: This is the core product loop — the AI recommendation surface. Any mismatch between the new shared types and the rendering layer will break the primary user flow.

**Independent Test**: Enable fixture mode (`NEXT_PUBLIC_CHAT_FIXTURES=true`), submit a consult query. Verify a PlaceCard renders with place name, photo (or initials avatar fallback), subcategory, price hint, and that expanding it shows tags, cuisine, rating, and hours.

**Acceptance Scenarios**:

1. **Given** a successful consult response with `results[0]`, **When** the response is parsed, **Then** the primary place renders as an expanded PlaceCard using `results[0].place`.
2. **Given** a consult response with `results[1]` and `results[2]`, **When** the response renders, **Then** alternative places render as collapsed PlaceCards in a grid.
3. **Given** a collapsed PlaceCard, **When** the user taps it, **Then** it smoothly expands to show Tier 2 and Tier 3 fields (if present on the place).
4. **Given** an expanded PlaceCard where `provider_id` is non-null, **When** the user taps the map button, **Then** Google Maps opens in a new tab at `https://www.google.com/maps/search/?api=1&query={place_name}&query_place_id={provider_id}`.
5. **Given** a PlaceCard where `provider_id` is null, **When** rendered, **Then** no map button is shown.
6. **Given** an expanded consult PlaceCard, **When** the user taps "Accept", **Then** a `POST /api/v1/signal` with `recommendation_accepted` fires silently; no spinner shown.
7. **Given** an expanded consult PlaceCard, **When** the user taps "Reject", **Then** a `POST /api/v1/signal` with `recommendation_rejected` fires silently.
8. **Given** a consult response where `results` has only one item, **When** rendered, **Then** no alternatives section appears.

---

### User Story 2 — Save flow renders PlaceCard with status-aware actions (Priority: P1)

A user shares a URL or describes a place to save. The system shows a save sheet with each extracted place as a PlaceCard. Cards show confidence and status — already saved (`saved`), needing confirmation (`needs_review`), or duplicate. The user can confirm `needs_review` places and dismiss duplicates.

**Why this priority**: Save is the data collection path; if it renders incorrectly, the user's taste profile won't be built and the whole product degrades.

**Independent Test**: Enable fixture mode, submit a save-intent message containing a URL. Verify the save sheet renders PlaceCards with ConfidencePill badges. Confirm a `needs_review` card and verify it transitions to saved state.

**Acceptance Scenarios**:

1. **Given** an extract-place response with `results[i].status === 'saved'`, **When** the save sheet opens, **Then** that card shows a "Saved" badge and no action button.
2. **Given** `results[i].status === 'needs_review'`, **When** the save sheet opens, **Then** a "Confirm" button appears on that card.
3. **Given** `results[i].status === 'duplicate'`, **When** the save sheet opens, **Then** a "Duplicate" badge appears and no save action is offered; `place.created_at` is used to display the original save date.
4. **Given** items where `place === null && status === 'pending'`, **When** the save sheet opens, **Then** a summary line "N still processing" appears above the grid (no placeholder card).
5. **Given** items where `place === null && status === 'failed'`, **When** the save sheet opens, **Then** a summary line "N couldn't be extracted" appears above the grid.

---

### User Story 3 — Recall results render PlaceCard with match context (Priority: P2)

A user searches their saved places (e.g., "ramen I bookmarked"). The system returns matching places with a match-reason label per result. The total count drives a "showing N of M" hint.

**Why this priority**: Recall is the second most frequent interaction after consult. Flat-field reads are broken against the new schema.

**Independent Test**: Enable fixture mode, submit a recall-intent query. Verify results render as PlaceCards with a match-reason badge. Verify "showing N of M saved places" hint appears when `total_count > results.length`.

**Acceptance Scenarios**:

1. **Given** a recall response with `results[i]`, **When** rendered, **Then** each result displays as a PlaceCard with the place's name, subcategory, and a match-reason badge showing the raw enum value.
2. **Given** `total_count > results.length`, **When** rendered, **Then** a hint "Showing N of M saved places" appears below the results.
3. **Given** `empty_state === true`, **When** rendered, **Then** the empty-state message (no saved places) is shown instead of a results list.

---

### User Story 4 — User context drives tier-gated home screen routing (Priority: P2)

On first load after auth, the app fetches `GET /api/v1/user/context`. Based on `signal_tier`, it routes to: a curated cold-start screen (`cold`), a chip selection board (`chip_selection`), or the normal chat experience (`warming` / `active`). The chip sidebar and saved-progress nudge appear on warming/active.

**Why this priority**: Tier gating is the onboarding path. Without it, a new user would see an empty chat and receive poor consult results because no taste profile exists.

**Independent Test**: Set `signal_tier: 'chip_selection'` in the fixture user-context client. Load the home screen. Verify ChipSelectionBoard renders. Submit chip decisions and verify the board closes and the home phase transitions.

**Acceptance Scenarios**:

1. **Given** `signal_tier === 'cold'`, **When** the home screen loads, **Then** the ColdOnboarding view renders with curated place suggestions (PlaceCards with a Save action each).
2. **Given** `signal_tier === 'chip_selection'`, **When** the home screen loads, **Then** ChipSelectionBoard renders full-screen (mobile) or as a centred modal (desktop ≥768px).
3. **Given** the chip board is open, **When** the user toggles at least one chip and taps "Done", **Then** `POST /api/v1/signal` with `chip_confirm` fires, the board closes, and user context is re-fetched.
4. **Given** the chip board is open, **When** the user taps "Skip", **Then** the board closes with no signal sent and no tier change.
5. **Given** `signal_tier === 'warming'`, **When** the home screen loads, **Then** the normal chat area is visible alongside TasteChipsSidebar (read-only) and SavedProgressNudge (`X of 5 saved`).
6. **Given** `signal_tier === 'active'`, **When** the home screen loads, **Then** TasteChipsSidebar is visible; SavedProgressNudge is hidden.
7. **Given** `signal_tier === 'cold' || 'chip_selection'`, **When** the user submits a consult-intent message, **Then** no HTTP call is made to `/api/v1/chat`; a system message "Let's finish setup first" is shown instead.
8. **Given** the app is launched and user-context fetch fails (network error), **When** the home screen loads, **Then** the UI falls back to count-based tier detection (existing behaviour); no crash.

---

### User Story 5 — `signal_tier` is forwarded in every chat request (Priority: P3)

Every message sent to `/api/v1/chat` includes `signal_tier` from the store so the AI service can apply tier-aware consult behaviour.

**Why this priority**: Correctness concern — the AI service needs the tier hint for warming candidate blending. No visible UI impact.

**Independent Test**: In the browser network panel, submit a chat message and verify the request body contains `signal_tier` with the current tier value.

**Acceptance Scenarios**:

1. **Given** `signalTier === 'active'` in the store, **When** a chat message is submitted, **Then** the request body to `/api/v1/chat` includes `"signal_tier": "active"`.
2. **Given** `signalTier === null` (context not yet loaded), **When** a chat message is submitted, **Then** `signal_tier` is omitted or `null` in the request body (no crash).

---

### Edge Cases

- What happens when a consult response returns `results: []`? → Render the `message` string only; no PlaceCard grid.
- What happens when `photo_url` is null or fails to load? → Render initials avatar derived from `place_name`.
- What happens when `place.enriched === false`? → Tier 3 fields are not rendered even if partial data exists.
- What happens when `place.geo_fresh === false && place.lat === null`? → Address (Tier 2) is not rendered.
- What happens when chip board "Done" is tapped before any chip is toggled? → Button stays disabled; no submission.
- What happens when `chips` is empty in `chip_selection` tier? → Board renders with empty actionable section; only "Skip" is available.
- What happens when `provider_id` is present but not a Google Places ID (e.g., a future provider prefix)? → Map button still renders and opens Google Maps with only the `query` param (graceful degradation; the `query_place_id` value is passed as-is).
- What happens when `POST /api/v1/signal` returns 404? → Swallow silently with `console.warn`; no user-visible error.
- What happens when `POST /api/v1/signal` returns 5xx? → Log to telemetry; no retry; no user-visible error.
- What happens when the extract-place response has `request_id` set (async batch)? → Store captures it; no polling in scope.

---

## Requirements *(mandatory)*

### Functional Requirements

**PlaceCard component:**

- **FR-001**: The system MUST provide a single reusable `PlaceCard` component accepting a `PlaceObject` and rendering collapsed (160×160) and expanded states.
- **FR-002**: Collapsed state MUST display: photo (or initials avatar fallback), place name, subcategory or cuisine, price hint dots.
- **FR-003**: Expanded state MUST display Tier 1 fields always; Tier 2 only when `geo_fresh === true || lat != null`; Tier 3 only when `enriched === true`.
- **FR-004**: Tap-to-toggle expansion MUST animate smoothly; body content MUST fade on transition.
- **FR-005**: `PlaceCard` MUST accept `badge` and `action` render-prop slots; no flow-specific logic inside the component.
- **FR-005a**: When `place.provider_id` is non-null, the expanded PlaceCard MUST display a map button that opens `https://www.google.com/maps/search/?api=1&query={place_name}&query_place_id={provider_id}` in a new browser tab. When `provider_id` is null, the map button MUST be hidden.

**Consult flow:**

- **FR-006**: Consult Zod schema MUST match `{ recommendation_id, results: [{ place: PlaceObject, source }], reasoning_steps }`.
- **FR-007**: `ConsultResult.tsx` MUST render `results[0]` expanded (primary) and `results[1..2]` collapsed (alternatives).
- **FR-008**: `PrimaryResultCard.tsx` and `AlternativeCard.tsx` MUST be deleted; callers updated to `<PlaceCard>`.
- **FR-009**: Accept and Reject actions MUST call `POST /api/v1/signal` fire-and-forget; no loading spinner.

**Recall flow:**

- **FR-010**: Recall Zod schema MUST match `{ results: [{ place, match_reason, relevance_score, score_type }], total_count, empty_state }`.
- **FR-011**: Each recall result MUST render as a `<PlaceCard>` with a match-reason badge (raw enum value).
- **FR-012**: When `total_count > results.length`, a "Showing N of M saved places" hint MUST appear.
- **FR-013**: When `empty_state === true`, an empty-state message MUST replace the results list.

**Save flow:**

- **FR-014**: Save Zod schema MUST match `{ results: [{ place: PlaceObject | null, confidence, status }], source_url, request_id }`.
- **FR-015**: Save sheet MUST render `<PlaceCard>` for each result where `place !== null`, with a ConfidencePill badge and status-driven action.
- **FR-016**: Items with `place === null && status === 'pending'` MUST be excluded from the card grid; summary line "N still processing" shown when count > 0.
- **FR-017**: Items with `place === null && status === 'failed'` MUST be excluded from the card grid; summary line "N couldn't be extracted" shown when count > 0.

**Signal client:**

- **FR-018**: `signal-client.ts` MUST expose `acceptRecommendation`, `rejectRecommendation`, `confirmChips` wrapping `POST /api/v1/signal`.
- **FR-019**: Signal client MUST swallow 404 with `console.warn`; rethrow only on network errors.
- **FR-020**: Signal client MUST resolve immediately without a network call in fixture mode.

**User context client:**

- **FR-021**: `user-context-client.ts` MUST expose `getUserContext()` calling `GET /api/v1/user/context`.
- **FR-022**: In fixture mode the client MUST return `{ signal_tier: 'active', chips: [], saved_places_count: 0 }` without a network call.

**Cold suggestions:**

- **FR-023**: `cold-suggestions.ts` MUST export a hardcoded array of 6–8 `PlaceObject` entries (Tier 1 only, `geo_fresh: false`, `enriched: false`) with a header comment marking it as a placeholder.

**Store rewrite:**

- **FR-024**: Home store MUST replace `RecallItem[]` / `SaveExtractPlace[]` with `RecallResult[]` / `ExtractPlaceItem[]`.
- **FR-025**: Store MUST add `signalTier: SignalTier | null`, `chips: ChipItem[]`, `savedPlacesCountFromContext: number | null`.
- **FR-026**: `loadUserContext()` MUST populate tier/chips/count and recompute resting phase; called on `init()`, post-save, and post-chip_confirm.
- **FR-027**: `pickRestingPhase` MUST be tier-first: `cold` → `'cold-0'`; `chip_selection` → `'chip-selection'`; `warming`/`active` → `'idle'`; `null` → count-based fallback.
- **FR-028**: `submit()` MUST block non-save intents when `signalTier === 'cold' || 'chip_selection'`, push a clarification entry, and make no HTTP call.
- **FR-029**: `submit()` MUST forward `signal_tier` in the `/api/v1/chat` request body.

**Tier-gated UI:**

- **FR-030**: `ChipSelectionBoard.tsx` MUST display actionable chips (pending, current round) as 3-state toggles; confirmed/rejected chips as read-only.
- **FR-031**: "Done" button MUST be disabled until at least one chip is toggled from its initial state.
- **FR-032**: `TasteChipsSidebar.tsx` MUST render on `warming` and `active` tiers; chips are read-only.
- **FR-033**: `SavedProgressNudge.tsx` MUST show `{savedPlacesCountFromContext} of 5 saved` with a progress bar, visible only when `signalTier === 'warming'` and count < 5.
- **FR-034**: Home layout MUST route rendering by tier: `cold` → ColdOnboarding; `chip_selection` → ChipSelectionBoard; `warming`/`active` → normal chat + sidebar.

### Key Entities

- **PlaceObject**: Unified place shape from `libs/shared` with Tier 1 (always present), Tier 2 (geo cache, optional), and Tier 3 (enrichment, optional) fields.
- **ExtractPlaceItem**: `{ place: PlaceObject | null, confidence, status }` — one entry per extracted place in a save response.
- **RecallResult**: `{ place: PlaceObject, match_reason, relevance_score, score_type }` — one recall hit.
- **ConsultResult**: `{ place: PlaceObject, source }` — one consult recommendation.
- **ChipItem**: `{ label, source_field, source_value, signal_count, status, selection_round }` — a taste signal chip.
- **SignalTier**: `'cold' | 'warming' | 'chip_selection' | 'active'` — controls home routing and submit guards.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three response flows (consult, recall, save) render correctly against real API responses without Zod validation errors.
- **SC-002**: Accept/reject signals reach the backend within 2 seconds of user tap; no user-visible spinner during this window.
- **SC-003**: A new user with `signal_tier: 'chip_selection'` is routed to the chip selection board within 1 second of home-screen load.
- **SC-004**: A user with `signal_tier: 'cold'` who submits a consult-intent message sees the "Let's finish setup first" response with zero HTTP calls made to `/api/v1/chat`.
- **SC-005**: `pnpm nx lint web` and `pnpm nx typecheck web` pass with zero errors after all phases are applied.
- **SC-006**: `pnpm nx build web` produces a successful production build.
- **SC-007**: All fixture-mode flows (consult, recall, save, cold, chip-selection) render without runtime errors in a browser smoke test.
- **SC-008**: PlaceCard collapsed-to-expanded transition completes in under 300ms on a mid-range mobile device.

---

## Assumptions

- `libs/shared` types (`PlaceObject`, `ExtractPlaceItem`, `RecallResult`, `ConsultResult`, `ChipItem`, `SignalTier`, `UserContextResponse`) are already aligned with the contract; only frontend consuming code is out of sync.
- `framer-motion` is already installed in `apps/web`.
- NestJS gateway already proxies `POST /api/v1/signal` and `GET /api/v1/user/context` (landed in feature 014).
- `NEXT_PUBLIC_CHAT_FIXTURES` is an existing env flag used by the chat client.
- `apps/web/src/lib/chat-client.ts` already exists and follows the `FetchClient` transport pattern (ADR-029).
- `ColdStartZero.tsx` is the entry point for the cold-0 phase; it will be extended, not replaced.
- `HomePhase` type in `apps/web/src/flows/flow-definition.ts` can be extended with `'chip-selection'`.
- Cold-tier curated suggestions are placeholder data; no backend suggestions endpoint is wired in this feature.
- `match_reason` is displayed as raw enum string; i18n mapping is out of scope.
- Design-system promotion of `PlaceCard` into `libs/ui` is out of scope.
