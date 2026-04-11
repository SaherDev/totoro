# Home page — Flows 2, 3, 4, 7, 8, 9, 11 — Design

**Date:** 2026-04-10
**Status:** Draft
**Scope:** `apps/web` only. Flow 4 and Flow 3 hit the existing `POST /api/v1/chat` gateway once `totoro-ai` recall is live; until then the fixtures swap flag covers development. No new NestJS routes, no new FastAPI routes. Flow 6 (profile menu) already exists in-repo and is not re-specified.

## Goal

Replace the current echo-only home page with the full home-page surface from the Totoro UI spec, inside the existing `/home` route. One input bar, one classifier, seven phases visible to the user:

- **Flow 2 — Consult.** Six-step thinking state, primary result card, alternatives grid.
- **Flow 3 — Recall.** Results list, 80 ms stagger cascade, no thinking animation.
- **Flow 4 — Save.** Half-sheet overlay, "Save to Totoro" confirmation, snackbar, duplicate detection.
- **Flow 7 — Cold start (0 saves).** Share-extension instruction + static example prompts.
- **Flow 8 — Cold start (1–4 saves).** Encouragement + saves list + "Popular right now" consult treatment.
- **Flow 9 — Cold start (5+ saves).** Taste-profile celebration with confirm/dismiss chips.
- **Flow 11 — Chat assistants.** Simple text-bubble Q&A, no loading animation.

Everything lives inside the existing `/home` route. The input bar never unmounts. Classification happens client-side first (routes the UI immediately) and is corrected by the server response if needed.

## Splitting this spec into sub-plans

This document is large on purpose — it's the single authoritative design for the whole home-page surface so cross-flow decisions (registry, store, types, illustrations, classifier) stay consistent. **For implementation, split it into seven sub-plans.** Each sub-plan is independently shippable behind the `NEXT_PUBLIC_CHAT_FIXTURES` flag, testable in isolation, and carves out a clean section of this document. Execute them in order — every sub-plan assumes the ones above it have landed.

| #   | Sub-plan                                  | Scope in this spec                                                                                                                                                                                                                                                                                                                                                                                                           | Ships                                                                                                                                                                                                                                | Depends on                                                    |
| --- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | **Infrastructure & cleanup**              | `## Pages`, `## Decisions` (rows 1–17), `## Build order` (step 1 only), `## Architecture` (store skeleton + hydration), `## Flow Registry`, `## Data flow and fetch layer` (types + schemas + fetch layer + fixtures client scaffolding), `classify-intent.ts`, `saved-places-storage.ts`, `taste-profile-storage.ts`, `location-storage.ts`, `## Cleanup pass` (illustrations rename + delete + i18n restructure + `ChatInput.tsx` simplification) | No user-visible change. Dev can verify `NEXT_PUBLIC_DEV_SAVED_COUNT` flips the hydrated phase and the `Illustration` component renders renamed SVGs.                                                                                 | —                                                             |
| 2   | **Flow 2 + Flow 9**                       | `ConsultThinking`, `ConsultResult`, `PrimaryResultCard`, `AlternativeCard`, `TasteMatchArc`, `CommunityProofLine`, `TasteProfileCelebration`, consult fixtures, consult schema, the 6-step animation race, the taste-profile celebration + localStorage confirmation                                                                                                                                                         | The original Flow 2 + Flow 9 experience, now riding the Flow Registry.                                                                                                                                                               | Sub-plan 1                                                    |
| 3   | **Flow 7 — Cold 0**                       | `ColdStartZero`, `HomeGreeting` (initial version), input-bar placeholder override, `flow7.*` i18n keys, rain-lines illustration rename                                                                                                                                                                                                                                                                                       | Zero-saves screen renders on fresh install. No network calls.                                                                                                                                                                        | Sub-plan 1                                                    |
| 4   | **Flow 8 — Cold 1–4 + City Starter Pack** | `ColdStartOneToFour`, `PopularNearbyCard`, `CityStarterPack` sub-screen, `flow8.*` i18n keys, the compact saves list reader, `starter-pack` phase, hardcoded `CITY_STARTER_PACK` constant, the "popular right now" wrapper around consult results                                                                                                                                                                            | 1–4 saves state with popular-nearby consult wrapper and the starter-pack sub-screen. Consult still uses fixtures.                                                                                                                    | Sub-plans 1, 2, 3                                             |
| 5   | **Flow 11 + Clarification hint**          | `AssistantReplyCard`, `ClarificationHint` (orthogonal slot), assistant fixtures with the `"clarify me"` clarification fixture, `flow11.*` i18n keys, store's `assistantMessage` and `clarificationMessage` slots, `dismissAssistantReply()` action                                                                                                                                                                           | Ambiguous queries render a muted assistant card; `"clarify me"` renders the inline clarification hint above the input bar without changing phase. Both are cheap and unblock Flow 4's clarification edge case.                       | Sub-plans 1, 2                                                |
| 6   | **Flow 4 — Save**                         | `SaveSheet`, `SavedSnackbar`, save fixtures, save schema, classifier integration, `openSaveSheet` / `confirmSave` / `dismissSaveSheet` / `incrementSavedCount` store actions, duplicate detection variant, `save-sheet` / `save-snackbar` / `save-duplicate` phases, `TotoroKnowing` illustration wiring, `flow4.*` i18n keys, Bruno `chat.bru` prerequisite                                                                 | End-to-end save: type a TikTok URL, sheet opens, "Save to Totoro" fires, snackbar confirms, localStorage grows, reload promotes cold-0 → cold-1-4. **First live endpoint.** Requires Bruno verification against real `/api/v1/chat`. | Sub-plans 1, 3, 4                                             |
| 7   | **Flow 3 — Recall**                       | `RecallResults`, `ModeOverridePill`, recall fixtures, recall schema, `submitRecall()` store action, the 80 ms cascade, the 600 ms breadcrumb, `recall` phase, `flow3.*` i18n keys                                                                                                                                                                                                                                            | End-to-end recall: type a memory fragment, results cascade in, mode-override pill pivots to consult on the same query. Requires real saved places in the DB (ideally from sub-plan 6) to validate against live FastAPI.              | Sub-plans 1, 2, 6 (logical — recall needs data saves produce) |

### Rules for the split

- **Each sub-plan carries a pointer back to this document** (`See docs/superpowers/specs/2026-04-10-home-flow2-flow9-design.md § <section>`) rather than duplicating content. The master spec is the source of truth; sub-plans are execution plans, not redesigns.
- **Cross-cutting sections stay in this document only.** The Decisions table, Flow Registry, HomePhase enum, error categorization, and i18n key list are referenced by every sub-plan but edited nowhere else. Any change lands here first, then the affected sub-plan is re-verified.
- **Fixtures-first discipline holds for every sub-plan.** Sub-plans 1–5 never touch the live endpoint. Sub-plan 6 is the first one that must exercise `/api/v1/chat` with Bruno. Sub-plan 7 depends on FastAPI recall being live; if it isn't, sub-plan 7 ships against fixtures and the live-wire becomes a follow-up ticket.
- **Each sub-plan has its own verification block** in the sub-plan file: unit tests affected, component tests affected, integration tests affected, manual checks. The `## Testing` section in this document is the superset — each sub-plan cherry-picks the relevant tests and adds none.
- **If a sub-plan discovers a design gap**, the fix lands in this document first (new decision row or amended section), then the sub-plan is updated to reference it. Never fork the design into a sub-plan's body.
- **Sub-plans can be executed by different people or in parallel after sub-plan 1 lands**, with the caveats: sub-plan 4 needs 3 merged, sub-plan 5 is independent after 2, sub-plan 6 needs 4 merged for the saves-list promotion test, sub-plan 7 needs 6 merged for real recall data. Everything else is strictly sequential.

## Pages

The `apps/web` app ships with **three routes total**. All three already exist — this task does not add any new pages.

| Route                     | File                                               | Purpose                                                                                                                                            | Touched by this task?         |
| ------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `/[locale]/login`         | `apps/web/src/app/[locale]/login/page.tsx`         | Clerk auth (Flow 1). Two-section layout with Totoro illustration and sign-in buttons.                                                              | **No** — out of scope.        |
| `/[locale]/(main)/home`   | `apps/web/src/app/[locale]/(main)/home/page.tsx`   | The entire decision-engine surface — Flows 2, 3, 4, 7, 8, 9, 11 plus clarification, greeting, save snackbar, and the City Starter Pack sub-screen. | **Yes** — rewritten in place. |
| `/[locale]/(main)/places` | `apps/web/src/app/[locale]/(main)/places/page.tsx` | Stub browse-view for saved places and consult history — see note below.                                                                            | **No** — out of scope.        |

**What `/places` actually is today:** a scaffolded stub, not a functional page. The file (`apps/web/src/app/[locale]/(main)/places/page.tsx`, ~76 lines) renders a NavBar, two tabs (`Saved` / `History`), and an empty-state illustration for both tabs. No list rendering, no data fetching, no store wiring. It exists as a placeholder waiting for a future task.

**What `/places` is eventually meant to be:**

- **Saved tab** — full list of the user's saved places. Flow 8's compact saves list in `ColdStartOneToFour` is a small preview of what this page would show in full; both would read from the same `localStorage.totoro.savedPlaces` source until a `GET /api/v1/places` endpoint lands.
- **History tab** — past consult recommendations from the `recommendations` table (owned by NestJS per `docs/architecture.md`). Timestamped list of prior `/chat` consult results.

**Relationship to this task:** Flow 4 writes to `localStorage.totoro.savedPlaces`, which is the same source a functional `/places` Saved tab would read from. So this task **implicitly feeds** `/places` without touching it. The Flow 4 save-sheet's `"View saved place"` button (duplicate variant) is currently a no-op `TODO` in the `SaveSheet` component spec — when `/places` gets real per-place routes (e.g. `/places/[id]`), that button will deep-link there. Flow 3 (Recall) is conceptually similar to the Saved tab's search functionality, but with the decision-engine flavor — no filter panels, natural-language query, streamed results — while `/places` is the browse-and-scroll alternative for users who want to see everything at once.

**Out of scope in this task:** `/places` stays exactly as it is. No renames, no deletions, no wiring. A separate follow-up task will flesh out the Saved tab using the same `saved-places-storage.ts` module introduced here, plus the History tab once a `GET /api/v1/recommendations` endpoint exists.

Every flow in this spec is a **state of the `/home` page**, not a route. Navigation between flows is state-machine transitions, not URL changes. The phase enum (`HomePhase`) drives what the `/home` message area renders; the input bar stays mounted across every transition. This is the "one page, one input bar, one stream" principle from the UI spec translated into a Next.js App Router layout.

The `(main)` route group hosts a shared layout (`apps/web/src/app/[locale]/(main)/layout.tsx`) that wraps `/home` and `/places` with the NavBar and profile menu (Flow 6, pre-existing). The `/login` route is outside the `(main)` group so it renders without the NavBar.

Source material:

- UI spec: `Dev/totoro-ui-flows.md` in the shared Google Drive — all flows in scope.
- Animation reference: `Design/totoro_flows_v10.html`, the `runC()` / `runR()` / `runS()` functions (lines 476–480) and the `.sr` / `.sd` / `.pulse` / `.sk` styles (lines 22–30).
- API: `POST /api/v1/chat` only. Request `{ user_id, message, location? }`; response is the `ChatResponseDto` discriminated union on `type`. The old three-endpoint contract (`/v1/extract-place`, `/v1/consult`, `/v1/recall`) in `docs/api-contract.md` is **outdated** — NestJS gateway was unified in commit `31e963c`. FastAPI still owns intent classification and runs the appropriate pipeline server-side; the frontend never touches the legacy paths. When this spec references "the contract," it means the current `ChatRequestDto` / `ChatResponseDto` in `libs/shared/src/lib/types.ts` plus what the unified `/chat` endpoint returns — not the stale doc.

## Current state

`apps/web/src/app/[locale]/(main)/home/page.tsx` is a thin echo: NavBar, empty state vs. user message list, ChatInput that only pushes user text into local state. `components/AgentResponseBubble.tsx` exists with a phase machine, mock data, and 5 hardcoded step keys — it's the closest thing to Flow 2 today but doesn't match the spec in step count, timing, result shape, or data source.

`services/api` exposes `POST /api/v1/chat` — a unified gateway that forwards `{user_id, message, location}` to `totoro-ai` and returns `ChatResponseDto { type, message, data }`. `type` discriminates `consult | extract-place | recall | assistant | clarification | error` — matches `totoro-ai/src/totoro_ai/core/chat/service.py` `ChatService.run()`, which classifies intent server-side and dispatches to the correct pipeline. `clarification` is returned when `classify_intent` cannot commit to a single intent and needs more info from the user; it carries the clarification question in `message` and `data: null`. There is no `/v1/consult`, `/v1/extract-place`, or `/v1/recall` route on NestJS — those were consolidated into `/chat`.

## Decisions

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Route through unified `/api/v1/chat`, branch on `response.type`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Matches the current backend after the gateway refactor (commit `31e963c`). The UI spec's "one input bar, one stream" principle maps cleanly onto a single endpoint with a discriminated response.                                                                                                                                                                                                                                                                                                      |
| 2   | Render taste-match arc and community-proof line with hardcoded placeholder values, centralized in one constants file                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | The UI spec adds these fields beyond the current API contract. Placeholder now, swap to real fields the day the backend adds them.                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | Canonical animation timing from the UI spec and `v10.html`: 6 steps, fire offsets `[0, 700, 1500, 2300, 3000, 3700] ms`, durations `[600, 700, 700, 600, 600, 400] ms`, result reveals 400 ms after step 6. Total time to reveal: 4500 ms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The brief's "400ms, 600ms, 800ms, 500ms, 500ms" list was five numbers for a six-step flow and didn't match the canonical spec.                                                                                                                                                                                                                                                                                                                                                                         |
| 4   | Saved place count and taste-profile confirmation state live in `localStorage`, not in the backend                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Explicit scope reduction — no new backend endpoints in this task.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5   | Hardcoded taste chips: `"Ramen lover"`, `"Budget-friendly"`, `"Night owl"`. Saved place count pinned at 5 so Flow 9 renders on first load.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Matches `v10.html` lines 341–343. Taste-model integration is explicitly deferred.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6   | Flow 9 is a state of the home message area (not a modal, not a new route). Confirmation persists to localStorage on "Start exploring" tap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Matches the "everything inside the home page" constraint and matches the prototype's pane-swap behavior.                                                                                                                                                                                                                                                                                                                                                                                               |
| 7   | Delete `AgentResponseBubble.tsx`, `ChatMessage.tsx`, `home-empty-state.tsx` and their only-consumer orphans. Ship a fixtures-backed fetch layer with a swap flag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | The old components don't match the spec; keeping them would cause confusion. Fixtures keep the frontend unblocked while `totoro-ai` consult readiness is unknown.                                                                                                                                                                                                                                                                                                                                      |
| 8   | Zustand store for home state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | User chose this approach. Adds one dependency but gives us a clean state container that Flow 3 and Flow 4 can extend.                                                                                                                                                                                                                                                                                                                                                                                  |
| 9   | Skip colors / theming. Use existing tokens; inline raw hex with `TODO: tokenize` comments where the spec demands colors outside the token set. No dark-mode work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Explicit scope reduction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | `savedPlaceCount` drives the initial phase: `0 → cold-0`, `1–4 → cold-1-4`, `5+ && unconfirmed → taste-profile`, `5+ && confirmed → idle`. Value seeded from localStorage. Decision 5's "pinned at 5" is removed — replaced by a dev-only env hook `NEXT_PUBLIC_DEV_SAVED_COUNT` that seeds the store during prototyping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The original pin-at-5 was a prototyping shortcut when only Flow 9 was in scope. Now that cold-0 and cold-1-4 are real phases, the pin becomes a bug — every fresh-install user would skip the onboarding ladder. Real count with a dev override gives both correctness and the ability to force any phase on demand.                                                                                                                                                                                   |
| 11  | Intent classification happens **client-side** before `store.submit()` fires, via a pure `classifyIntent(message): 'consult' \| 'recall' \| 'save' \| 'assistant'` helper. FastAPI is still the source of truth — if the server returns a different `type`, the store jumps to the correct phase regardless of the pre-route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The UI spec forbids loading states on save and recall. Waiting for server classification before showing the save sheet would force a "classifying…" state the spec rejects. Client pre-routing opens the sheet on Enter; the server correction is invisible when the classifier is right (>95% of cases per v10.html prototype behavior). Matches `runC/runR/runS` split in `v10.html` line 437.                                                                                                       |
| 12  | Recall renders with **no thinking animation**. Results cascade in with 80 ms stagger per UI spec line 286. Fetch is fire-and-render: the moment the response resolves, the list mounts and items animate in sequence. If the fetch takes longer than 600 ms, show a muted single-line breadcrumb "searching your saves…" in place of the header — never the 6-step thinking shell.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | UI spec is explicit: "No thinking steps. No loading state." A long fetch with a blank screen is worse than a minimal breadcrumb; 600 ms is the threshold where users start wondering if the tap registered.                                                                                                                                                                                                                                                                                            |
| 13  | Save sheet is a half-sheet overlay (not a phase swap). Save-intent classification opens it immediately; "Save to Totoro" tap fires `POST /api/v1/chat`; the snackbar replaces the sheet on success; a `type === 'extract-place'` response with `data.status === 'duplicate'` swaps sheet contents to the "knowing" variant in place.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Half-sheet keeps the input bar mounted, which matches the "input bar never moves" principle from the UI spec. Phase swap would unmount the bar. The prototype's `.pane#p-save` is also a half-sheet overlay.                                                                                                                                                                                                                                                                                           |
| 14  | Flow 11 (chat assistants) is a new `'assistant-reply'` phase. Render is a single muted card with the response message text. No loading animation. The only loading affordance is a small inline spinner inside the input bar's send button while the fetch is in flight. The card is dismissed by tapping it or typing a new query.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | User spec: "simple question and answer, no loading animation, just show the response." Matches the existing `type === 'assistant'` branch in `ChatResponseDto`.                                                                                                                                                                                                                                                                                                                                        |
| 15  | `clarification` is its own response type in `ChatResponseDto` (`type: 'clarification'`, `data: null`, `message` = the clarification question from FastAPI's `ChatService._classify_intent`). It is **not** an error — the server code in `totoro-ai/src/totoro_ai/core/chat/service.py` returns it as a distinct branch when `classification.clarification_needed` is true, with the LLM-generated question in `message`. Rendering: muted italic single-line hint above the input bar (via a dedicated `ClarificationHint` component) with the server's `message`. The previous query stays in the input field, the phase does not change, and a new submission clears the hint. The clarification message is stored in `store.clarificationMessage: string \| null`, orthogonal to `phase` — it is a floating slot on the input-bar container that renders whenever non-null, regardless of the active phase. No card, no dismiss affordance. | Structurally: the server really does return this as its own type, so the discriminated union must reflect that. Semantically: clarification is "the classifier wants more detail before it can answer," which is still a successful round trip, not a failure. It deserves its own phase-orthogonal rendering because it should not displace whatever the user was looking at (cold-0, idle, result, etc) — they should be able to read the hint, edit the input, and resubmit without losing context. |
| 16  | After a save completes while the user is in `cold-1-4`, show a toast with static copy: `"Saved! Taste signals updating."` (hardcoded — real inference lands with the taste-model task). Toast auto-dismisses after 2800 ms. Does **not** show on idle / cold-5+ saves — those only get the regular `SavedSnackbar`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | The toast is Flow 8 encouragement language, not a persistent pattern. Showing it at idle would feel redundant.                                                                                                                                                                                                                                                                                                                                                                                         |
| 17  | "Popular right now" treatment on Flow 8 consult results: dashed gold border card, `"Popular right now"` small-caps label above the result, muted italic footnote `"Save more places to get picks matched to your taste"`. Implemented as a `PopularNearbyCard` wrapper around the Flow 2 `PrimaryResultCard` when `savedPlaceCount < 5`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Matches v10.html line 319 (`.nb` dashed border). Wrapping keeps one result component instead of forking two.                                                                                                                                                                                                                                                                                                                                                                                           |
| 18  | `location` is sent on **every** `POST /api/v1/chat` request, regardless of intent. The app pre-routes via `classifyIntent` but the server is the source of truth — it's not safe to conditionally withhold location. `location` is stored in `localStorage.totoro.location` (`{ lat, lng }`) so it can be edited manually in DevTools during development without touching code. On hydration, `store.location` is seeded from `localStorage.totoro.location`. `setLocation()` action persists to localStorage and updates the store in one call. If not set, `location` is `null` and the server falls back to city-level ranking. | The client classifier is a hint; the server decides the real intent. Sending location always is simpler and prevents missed coordinates when classifier and server disagree. localStorage persistence enables manual location override for development without env vars or mocking. |

## Build order

This spec covers seven flows. Implementation proceeds in a specific order so each step can be verified before the next one lands. The order comes from backend dependency (flows with live endpoints last), shared-infrastructure dependency (routing before any phase component), and user-signaled preference.

1. **Phase routing + store skeleton.** Extend `HomePhase` to the full 13-value enum. Implement `useHomeStore` with hydration, the four-way branch on `savedPlaceCount`, and the `NEXT_PUBLIC_DEV_SAVED_COUNT` dev override. No components yet — verify by setting the env var to `0`, `3`, `5`, `12` and confirming `store.phase` lands on the right value.
2. **Flow 2 (Consult) + Flow 9 (Taste profile).** The original scope — `ConsultThinking`, `ConsultResult`, `TasteProfileCelebration`, `chat-client.ts` with consult fixtures only. Verifies the thinking race, the store's `submit()` router with consult as the only intent, and `confirmTasteProfile()` → `idle` transition.
3. **Flow 7 (Cold 0).** `ColdStartZero.tsx`, input-bar placeholder override, static suggestion pills. Zero backend dependency, zero new network calls. Verify by forcing `savedPlaceCount=0` and checking the screen renders + suggestion clicks fill the input bar.
4. **Flow 8 (Cold 1–4).** `ColdStartOneToFour.tsx` + `PopularNearbyCard.tsx` + `saved-places-storage.ts`. Seeds the saves list from localStorage; consult results (when the user types a consult query while in this phase) wrap in `PopularNearbyCard`. Verify with `NEXT_PUBLIC_DEV_SAVED_COUNT=3` and a few seeded entries in `localStorage.totoro.savedPlaces`.
5. **Flow 11 (Chat assistants).** `AssistantReplyCard.tsx`, the assistant fall-through in `chatClientFixtures`, the `'assistant-reply'` phase in the store, `dismissAssistantReply()` action. Cheapest possible flow — unlocks the `ClarificationHint` wiring at the same time (both rendered from store slots), so clarification responses can be tested via the `"clarify me"` fixture key without needing a server round trip.
6. **Flow 4 (Save).** `SaveSheet.tsx`, `SavedSnackbar.tsx`, `classify-intent.ts`, save fixtures, `openSaveSheet` / `confirmSave` / `dismissSaveSheet` / `incrementSavedCount` store actions. This is the **first flow that hits a live endpoint** — Bruno prerequisite `chat.bru` must exist and be verified against the unified `/api/v1/chat` before live-wiring. Verify end-to-end: type a TikTok URL, sheet opens, tap "Save to Totoro", snackbar appears, `savedPlaceCount` increments, reload moves the user from cold-0 to cold-1-4.
7. **Flow 3 (Recall).** `RecallResults.tsx`, `ModeOverridePill.tsx`, recall fixtures, `submitRecall()` store action, 80 ms cascade. Backend dependency: FastAPI `RecallService` in `totoro-ai/src/totoro_ai/core/recall/service.py` must return results for a real saved place. Requires real data in the DB (ideally seeded via Flow 4). Before live-wiring, `curl` or Bruno the recall path to confirm FastAPI's pgvector retrieval returns the expected shape. If FastAPI isn't ready, keep `NEXT_PUBLIC_CHAT_FIXTURES=true` and verify the cascade animation against fixtures.

Steps 6 and 7 both depend on the upstream **"Memory retrieval — pgvector similarity search and recall"** task in `totoro-ai`. If that task hasn't landed, everything up to step 5 can still ship, and step 6/7 run against fixtures.

## Architecture

The home page is a fixed three-layer vertical stack:

1. **NavBar** — top, unchanged.
2. **Message area** — flex-1, scrollable, the only thing that swaps. All phase-specific content renders here.
3. **Input bar** — bottom, always mounted, always visible. Never unmounts. Matches the UI spec's "the input bar never moves" principle.

### `useHomeStore` (Zustand) — `apps/web/src/store/home-store.ts`

```ts
type HomePhase =
  | "hydrating" // initial, before localStorage read
  | "cold-0" // Flow 7 — savedCount === 0
  | "cold-1-4" // Flow 8 — savedCount 1–4
  | "taste-profile" // Flow 9 — savedCount ≥ 5 and unconfirmed
  | "idle" // savedCount ≥ 5 and confirmed
  | "thinking" // Flow 2 — 6-step animation in flight
  | "result" // Flow 2 — primary + alternatives card
  | "recall" // Flow 3 — results cascade
  | "save-sheet" // Flow 4 — half-sheet overlay, pending or saving
  | "save-snackbar" // Flow 4 — success, 2800ms auto-dismiss
  | "save-duplicate" // Flow 4 — "knowing" variant when server returns duplicate
  | "assistant-reply" // Flow 11 — type === 'assistant' text bubble
  | "starter-pack" // Flow 8 sub-screen — City Starter Pack five-place curated list
  | "error"; // fetch failed OR server returned type === 'error' (clarification is handled orthogonally, not via this phase)

interface HomeState {
  phase: HomePhase;
  query: string | null;
  result: ConsultResponseData | null;
  reasoningSteps: ReasoningStep[];
  error: {
    message: string;
    category: "offline" | "timeout" | "generic" | "server";
  } | null;

  // taste profile state, seeded from localStorage on hydration
  hydrated: boolean;
  tasteProfileConfirmed: boolean;
  savedPlaceCount: number;

  // location, seeded from localStorage on hydration, sent with every request
  location: { lat: number; lng: number } | null;

  // race-handling flags, reset on each submit
  animationComplete: boolean;
  fetchComplete: boolean;
  pendingResult: ConsultResponseData | null;
  pendingError: HomeState["error"];

  // abort controller for in-flight fetch
  abortController: AbortController | null;

  // Flow 3 / 4 / 11 state
  recallResults: RecallItem[] | null;
  recallHasMore: boolean;
  saveSheetPlace: SaveSheetPlace | null; // populated by openSaveSheet()
  saveSheetStatus: "pending" | "saving" | "duplicate" | "error";
  saveSheetOriginalSavedAt: string | null; // populated on duplicate
  assistantMessage: string | null; // Flow 11 card body

  // actions
  hydrate: () => void;
  setLocation: (location: { lat: number; lng: number } | null) => void; // persists to localStorage
  submit: (
    message: string,
    options?: { forceIntent?: ClientIntent },
  ) => Promise<void>;
  submitRecall: (message: string) => Promise<void>; // Flow 3
  openSaveSheet: (message: string) => void; // Flow 4 — sync, classifier-driven, no network
  confirmSave: () => Promise<void>; // Flow 4 — fires POST /api/v1/chat
  dismissSaveSheet: () => void; // Flow 4
  dismissAssistantReply: () => void; // Flow 11
  incrementSavedCount: (place: SavedPlaceStub) => void; // Flow 4 post-save, writes localStorage
  markAnimationComplete: () => void;
  confirmTasteProfile: () => void;
  reset: () => void;
}
```

The store owns the async flow inside `submit()`. Components stay dumb: they read slices and render. **See `## Flow Registry — extensibility pattern` below for how `submit()` becomes a dispatcher over the registry rather than a switch statement, and how new flows are added tomorrow with zero changes to the store or page.**

`submit()` is a **router**, not a single async path. Its first action is to call `classifyIntent(message)` (unless `options.forceIntent` is set, used by the recall mode-override pill to force consult). The result of classification routes as follows:

- `'consult'` → the existing 6-step thinking race (unchanged from Flow 2 original)
- `'recall'` → `submitRecall(message)` — fetch immediately, flip to `'recall'` phase, mount results with 80 ms stagger
- `'save'` → `openSaveSheet(message)` — no network yet; sheet opens sync with the parsed place stub, waiting for user confirmation
- `'assistant'` → fetch, await, flip to `'assistant-reply'` on success

If the server response disagrees with the client pre-route, the store honors the server. Example: user types `"Samlor"` (short → classified `save`), server returns `type: 'consult'` — the store calls `confirmSaveSheet` internally no-op, dismisses the sheet, and flips to the thinking→result path. The user sees the sheet flicker open and immediately dissolve into the thinking state; acceptable because misclassification is rare.

Error responses (`type: 'error'`) with `data.category === 'need-more-info'` bypass all phase-specific rendering and show the inline clarification hint above the input bar, without leaving the current phase. All other error categories (`offline`, `timeout`, `generic`, `server`) flip to the `'error'` phase.

### Hydration

On first mount, `HomePage` calls `store.hydrate()` in a `useEffect`. The store reads `localStorage.totoro.tasteProfile`, `localStorage.totoro.savedPlaces`, and `localStorage.totoro.location`, seeds `tasteProfileConfirmed`, `savedPlaceCount`, and `location`, and picks the initial phase from a four-way branch:

- `savedPlaceCount === 0` → `cold-0`
- `savedPlaceCount >= 1 && savedPlaceCount <= 4` → `cold-1-4`
- `savedPlaceCount >= 5 && !tasteProfileConfirmed` → `taste-profile`
- `savedPlaceCount >= 5 && tasteProfileConfirmed` → `idle`

A dev override is available via `NEXT_PUBLIC_DEV_SAVED_COUNT` (integer). When set, the store uses that value instead of reading localStorage. This lets contributors force any phase without writing to `localStorage` manually — `NEXT_PUBLIC_DEV_SAVED_COUNT=0` pins cold-0, `=3` pins cold-1-4, `=12` pins idle, and so on. The override is ignored in production builds (`process.env.NODE_ENV === 'production'`).

`phase` starts as `'hydrating'`. The message area renders nothing until `hydrated === true`. This prevents SSR hydration mismatch and the visible "idle → cold-0" flash on first paint. Cost: one frame of blank message area on first paint.

### Data flow for a consult submission

```
User types in ChatInput, hits send
          │
          ▼
  store.submit(message)
          │
          ├──► phase = "thinking"
          ├──► query = message
          ├──► reasoningSteps = []
          ├──► animationComplete = false
          ├──► fetchComplete = false
          ├──► abortController = new AbortController()
          │
          ├──► chatClient.chat({ message, signal }) starts
          │
          │    [meanwhile ConsultThinking mounts and animates
          │     against the canonical 6-step schedule]
          │
          ▼
  response resolves (or rejects)
          │
          ├── success + type === 'consult':
          │     store.reasoningSteps = data.reasoning_steps
          │     store.pendingResult = data
          │     store.fetchComplete = true
          │     [check both flags] → tryReveal()
          │
          ├── success + type !== 'consult':
          │     store.pendingError = classifyUnsupported(type)
          │     store.fetchComplete = true
          │     [check both flags] → tryReveal()
          │
          └── failure:
                store.pendingError = classifyError(err)
                store.fetchComplete = true
                [check both flags] → tryReveal()

  ConsultThinking.onAnimationComplete fires at 4100ms:
          │
          ▼
  store.markAnimationComplete()
          │
          ├──► animationComplete = true
          └──► tryReveal()

  tryReveal():
    if (!animationComplete || !fetchComplete) return;
    if (pendingResult) phase = 'result'
    else if (pendingError) phase = 'error'
```

Both timers must fire before `phase` flips. This prevents "fetch finishes first, card pops in while steps are still animating" and "animation finishes first, result is blank" bugs.

### Sub-label delivery during the race

The six step labels are static (from the UI spec). Sub-labels come from `reasoning_steps[i].summary` in the response. Two cases:

- **Response arrives before step N renders:** sub-label is in the store when step N mounts, so it fades in with the step row.
- **Response arrives after step N has already rendered:** `ConsultThinking` subscribes to the store and fades the sub-label in over 150 ms the moment the array populates.

Sub-labels are empty strings until `reasoning_steps` populates. Never placeholder text like "Processing…" — honest empty or honest content.

### Flow 9 lifecycle

1. Hydration picks `phase = 'taste-profile'`.
2. `TasteProfileCelebration` renders with three hardcoded chips, each in local `pending | confirmed | dismissed` state.
3. User taps confirm or dismiss on each chip (visual only, not persisted).
4. User taps "Start exploring".
5. `store.confirmTasteProfile()` writes `{ confirmed: true }` to localStorage and flips `phase` to `'idle'`.
6. `HomeIdle` renders.
7. Reload: hydration picks `'idle'` directly. Flow 9 does not reappear.

## Flow Registry — extensibility pattern

The home page currently supports 7 flows plus clarification. Tomorrow we may add Flow 12 (e.g. "Review a place"), Flow 13 (e.g. "Booking"), or whatever the AI team ships next. Every new flow adds the same set of concerns: a response-type branch, a UI component, a phase enum value, a schema validator, a fixture, an input-bar placeholder, and store logic for consuming the response. Without a pattern, each addition touches 6+ files and grows switch statements in the store and the page.

The spec adopts a **Flow Registry** pattern — a combination of Strategy (each flow is a self-contained strategy module), Registry (central lookup keyed by response type and client intent), and exhaustive discriminated-union typing (TypeScript errors on missing cases). Each flow lives in its own folder and exports one `FlowDefinition`. The store and page become generic dispatchers that delegate to the active flow.

### `FlowDefinition` contract — `apps/web/src/flows/flow-definition.ts`

```ts
import type { ComponentType } from "react";
import type { ZodSchema } from "zod";
import type {
  ChatRequestDto,
  ChatResponseDto,
  ChatResponseType,
  ClientIntent,
} from "@totoro/shared";
import type { HomePhase, HomeStoreApi } from "../store/home-store";

export type FlowId =
  | "consult"
  | "recall"
  | "save"
  | "assistant"
  | "clarification";

export interface FlowDefinition<TData = unknown> {
  /** Unique identifier, matches the FlowId union. */
  id: FlowId;

  /**
   * How this flow is matched:
   * - `clientIntent` is used by the pre-router in submit() to open the UI instantly
   * - `responseType` is used to correct or confirm the flow after the server responds
   * Both are optional — a flow with only `responseType` is server-driven
   * (like 'clarification', which users never type into directly).
   */
  matches: {
    clientIntent?: ClientIntent;
    responseType: ChatResponseType;
  };

  /** The store phase this flow flips to when active. */
  phase: HomePhase;

  /** i18n key for the input bar placeholder while this flow is active. */
  inputPlaceholderKey: string;

  /** zod schema for the `data` field of this flow's ChatResponseDto branch. */
  schema: ZodSchema<TData>;

  /** Fixture used by chatClientFixtures when NEXT_PUBLIC_CHAT_FIXTURES === 'true'. */
  fixture: (req: ChatRequestDto) => Promise<ChatResponseDto>;

  /** Called by the store once a response matching this flow's responseType arrives. */
  onResponse: (res: ChatResponseDto, store: HomeStoreApi) => void;

  /** The component rendered inside the message area while this flow is active. */
  Component: ComponentType<{ store: HomeStoreApi }>;
}
```

### Registry — `apps/web/src/flows/registry.ts`

```ts
import { consultFlow } from "./consult";
import { recallFlow } from "./recall";
import { saveFlow } from "./save";
import { assistantFlow } from "./assistant";
import { clarificationFlow } from "./clarification";

// `satisfies` enforces that every FlowId has a registered flow at compile time.
// Forgetting a flow is a type error, not a runtime surprise.
export const FLOW_REGISTRY = {
  consult: consultFlow,
  recall: recallFlow,
  save: saveFlow,
  assistant: assistantFlow,
  clarification: clarificationFlow,
} as const satisfies Record<FlowId, FlowDefinition>;

// Reverse lookup: server returns a `type`, we resolve which flow consumes it.
export const FLOW_BY_RESPONSE_TYPE: Record<ChatResponseType, FlowDefinition> =
  Object.fromEntries(
    Object.values(FLOW_REGISTRY).map(f => [f.matches.responseType, f]),
  ) as Record<ChatResponseType, FlowDefinition>;

// Forward lookup: client-classified intent → flow (for instant pre-routing).
export const FLOW_BY_CLIENT_INTENT: Partial<
  Record<ClientIntent, FlowDefinition>
> = Object.fromEntries(
  Object.values(FLOW_REGISTRY)
    .filter(f => f.matches.clientIntent != null)
    .map(f => [f.matches.clientIntent!, f]),
);
```

### Store becomes a dispatcher

`submit()` stops being a switch statement. It looks up the pre-router flow, flips the phase immediately, fires the fetch, then resolves the final flow from the server response type:

```ts
async submit(message, opts) {
  // 1. Client pre-route — instant UI response
  const intent = opts?.forceIntent ?? classifyIntent(message);
  const preFlow = FLOW_BY_CLIENT_INTENT[intent] ?? FLOW_REGISTRY.consult;
  set({ phase: preFlow.phase, activeFlowId: preFlow.id });

  // 2. Fetch
  let res: ChatResponseDto;
  try {
    res = await chatClient.chat({ user_id, message, location: get().location }, abortController.signal);
  } catch (err) {
    set({ phase: 'error', error: classifyError(err) });
    return;
  }

  // 3. Clarification is orthogonal — handle before flow dispatch
  if (res.type === 'clarification') {
    set({ clarificationMessage: res.message });
    return;                             // keep current phase
  }

  // 4. Server may disagree with pre-route — resolve final flow by response type
  const finalFlow = FLOW_BY_RESPONSE_TYPE[res.type];
  if (!finalFlow) {
    set({ phase: 'error', error: { category: 'generic', message: 'Unknown response type' } });
    return;
  }

  // 5. Validate at the boundary, then let the flow consume
  const parsed = finalFlow.schema.safeParse(res.data);
  if (!parsed.success) {
    console.error('Chat contract error', parsed.error);
    set({ phase: 'error', error: { category: 'generic', message: 'Invalid response shape' } });
    return;
  }

  if (finalFlow.id !== preFlow.id) {
    set({ phase: finalFlow.phase, activeFlowId: finalFlow.id });  // correction
  }
  finalFlow.onResponse(res, storeApi);
}
```

The store grows one new slice field: `activeFlowId: FlowId`. It is always in sync with `phase`, but `phase` is the source of truth for rendering decisions that cross flow boundaries (e.g. `hydrating`, `cold-0`, `cold-1-4`, `taste-profile`, `idle`, `starter-pack` — these aren't flow outputs, they're resting states). `activeFlowId` is only set during and after a `submit()`.

### Page becomes a lookup

`home/page.tsx` stops being a big `switch (phase)` over twelve components. It picks from the registry when inside a flow, and renders the resting-state components directly for the non-flow phases:

```tsx
function HomePage() {
  const store = useHomeStore();
  const t = useTranslations();

  useEffect(() => {
    store.hydrate();
  }, []);

  const content = useMemo(() => {
    // Resting states — not flow outputs
    switch (store.phase) {
      case "hydrating":
        return null;
      case "cold-0":
        return <ColdStartZero onSuggestionClick={fillInputBar} />;
      case "cold-1-4":
        return (
          <ColdStartOneToFour
            savedPlaces={store.savedPlaces}
            onStarterPackClick={() => store.setPhase("starter-pack")}
          />
        );
      case "starter-pack":
        return (
          <CityStarterPack
            places={CITY_STARTER_PACK}
            onSave={store.confirmSave}
            onBack={() => store.setPhase("cold-1-4")}
          />
        );
      case "taste-profile":
        return (
          <TasteProfileCelebration
            chips={TASTE_CHIP_BANK}
            onStartExploring={store.confirmTasteProfile}
          />
        );
      case "idle":
        return (
          <HomeIdle
            suggestions={CONSULT_SUGGESTIONS}
            onSuggestionClick={fillInputBar}
          />
        );
      case "error":
        return <ConsultError error={store.error} onTryAgain={store.reset} />;
    }

    // Flow states — delegated to the registry
    if (store.activeFlowId) {
      const flow = FLOW_REGISTRY[store.activeFlowId];
      return <flow.Component store={storeApi} />;
    }

    return null;
  }, [store.phase, store.activeFlowId]);

  const placeholderKey = store.activeFlowId
    ? FLOW_REGISTRY[store.activeFlowId].inputPlaceholderKey
    : PHASE_PLACEHOLDER_KEY[store.phase];

  return (
    <Layout
      greeting={<HomeGreeting />}
      clarificationHint={
        <ClarificationHint message={store.clarificationMessage} />
      }
      savedSnackbar={<SavedSnackbar />}
      input={
        <ChatInput placeholder={t(placeholderKey)} onSubmit={store.submit} />
      }
    >
      {content}
    </Layout>
  );
}
```

Three pieces stay orthogonal to the registry because they can overlay any flow/phase:

- **`<ClarificationHint>`** — reads `store.clarificationMessage`, renders above the input bar regardless of phase.
- **`<SavedSnackbar>`** — reads `store.phase === 'save-snackbar'`, mounts over the message area.
- **`<HomeGreeting>`** — reads `store.phase` and shows only on resting states (`idle`, `cold-1-4`, `cold-0`).

### Flow folder structure

```
apps/web/src/flows/
  flow-definition.ts           interface + FlowId union
  registry.ts                  FLOW_REGISTRY + reverse lookup maps
  consult/
    index.ts                   exports consultFlow: FlowDefinition
    ConsultThinking.tsx
    ConsultResult.tsx
    PrimaryResultCard.tsx
    AlternativeCard.tsx
    TasteMatchArc.tsx
    CommunityProofLine.tsx
    consult.schema.ts
    consult.fixtures.ts
    consult.constants.ts       FLOW_2_STEPS, timings
  recall/
    index.ts                   exports recallFlow
    RecallResults.tsx
    ModeOverridePill.tsx
    recall.schema.ts
    recall.fixtures.ts
  save/
    index.ts                   exports saveFlow
    SaveSheet.tsx
    save.schema.ts
    save.fixtures.ts
  assistant/
    index.ts                   exports assistantFlow
    AssistantReplyCard.tsx
    assistant.schema.ts
    assistant.fixtures.ts
  clarification/
    index.ts                   exports clarificationFlow
    ClarificationHint.tsx      rendered orthogonally by Layout, not by registry lookup
    clarification.schema.ts
    clarification.fixtures.ts
```

Each flow folder is a **self-contained module**. Moving it between projects, deleting it, or disabling it temporarily is a one-folder operation. The Flow 2 components the earlier sections of this spec describe (`ConsultThinking`, `ConsultResult`, etc.) live inside `flows/consult/` instead of a flat `components/home/` folder. The earlier sections' file paths should be read as "use the flow-folder equivalent" during implementation.

### Example — `consultFlow`

```ts
// apps/web/src/flows/consult/index.ts
import { ConsultDispatcher } from "./ConsultDispatcher"; // thinking OR result based on phase
import { ConsultResponseDataSchema } from "./consult.schema";
import { consultFixture } from "./consult.fixtures";

export const consultFlow: FlowDefinition<ConsultResponseData> = {
  id: "consult",
  matches: {
    clientIntent: "consult",
    responseType: "consult",
  },
  phase: "thinking", // entry phase — ConsultDispatcher handles thinking→result internally
  inputPlaceholderKey: "home.consultPlaceholder",
  schema: ConsultResponseDataSchema,
  fixture: consultFixture,
  onResponse: (res, store) => {
    if (res.type !== "consult") return;
    store.setPendingResult(res.data);
    store.tryRevealResult(); // waits on animation flag
  },
  Component: ConsultDispatcher,
};
```

### Example — adding Flow 12 tomorrow ("Review a place")

To add a new flow that lets the user ask "What did I think of Fuji Ramen?" and renders a review card from the server:

1. **Extend the discriminated union** in `libs/shared/src/lib/types.ts`:
   ```ts
   export type ChatResponseType =
     | "consult"
     | "recall"
     | "extract-place"
     | "assistant"
     | "clarification"
     | "error"
     | "review";
   export interface ReviewChatResponse {
     type: "review";
     message: string;
     data: ReviewData;
   }
   ```
2. **Extend `ClientIntent`** in `apps/web/src/lib/classify-intent.ts` (add `'review'` + detection rule, e.g. regex on `"what did I think"`).
3. **Extend `FlowId`** in `flow-definition.ts` and **extend `HomePhase`** in the store with `'reviewing'` and/or `'review-result'`.
4. **Create the flow folder** `apps/web/src/flows/review/`:
   - `ReviewCard.tsx` (the UI)
   - `review.schema.ts` (zod schema for `ReviewData`)
   - `review.fixtures.ts` (canned responses keyed off known phrases)
   - `index.ts` (exports `reviewFlow: FlowDefinition<ReviewData>`)
5. **Add one line** to `flows/registry.ts`:
   ```ts
   review: reviewFlow,
   ```
6. **Add i18n keys** under `flow12.*` in `en.json` / `he.json`.

Zero changes to `home/page.tsx`. Zero changes to the store's `submit()` dispatcher. Zero changes to `chat-client.ts`. The `satisfies` constraint on the registry catches any missed FlowId at compile time. `ts` enforces that every `ChatResponseType` has a registered flow via `FLOW_BY_RESPONSE_TYPE` type coverage.

### What stays outside the registry

Not everything fits the "one flow = one response branch" model, and trying to force-fit it hurts more than it helps. Three categories of state are **orthogonal** and stay outside the registry:

- **Resting states** (`hydrating`, `cold-0`, `cold-1-4`, `taste-profile`, `idle`, `starter-pack`, `error`) — these are not the result of a chat submission. They are phases the user lands on from hydration, navigation, or error. They render via the `switch (phase)` in the page component, not via registry lookup.
- **Orthogonal slots** (`ClarificationHint`, `SavedSnackbar`, `HomeGreeting`) — these overlay the message area regardless of what flow or phase is active. Registered as permanent children of `<Layout>`, driven by store slots (`clarificationMessage`, `phase === 'save-snackbar'`, the greeting derivation), not by registry lookup.
- **Sub-screens** (`CityStarterPack`) — owned by a parent flow or resting state but rendered as a separate phase. Handled in the page's resting-state switch, because they aren't entered via `submit()`.

Mixing these into the registry would force every new flow author to understand the orthogonal/resting distinction. Keeping them in the page's resting-state switch keeps the registry clean: **"if it's a thing the user typed into the chat bar and the server responded to, it's a flow. Everything else is layout."**

### Tradeoffs

- **Registry is mutable at module init** — import order matters. Mitigated by the `satisfies` constraint on `FLOW_REGISTRY` so TypeScript errors at compile time if any `FlowId` is missing from the object literal.
- **`onResponse` gives flows direct store access** — powerful but requires discipline. Safer alternative: `onResponse` returns a state patch that the store applies. Traded off in favor of the direct approach because the current state shape is small and each flow's update pattern is unique (consult has the race-on-animation, save has the sheet-status machine, recall has no race at all). A patch object would just push the complexity into each flow anyway.
- **Phase enum still has to be updated** — the registry avoids switch statements but not enum extensions. Acceptable because TypeScript coverage on `HomePhase` catches incomplete switches in the page's resting-state section.
- **Clarification looks like it should be a flow** — it has a response type, a schema, a fixture, a component. But it never flips the phase, and its UI is orthogonal (above the input bar, not in the message area). It's registered in the registry so the schema/fixture/onResponse boilerplate is consistent, but its `Component` is a no-op and the real rendering happens via `Layout`'s orthogonal slot. Alternative: leave it out of the registry entirely and handle it as a `clarificationMessage` slot in the store, period. Picking the registered-but-inert approach because it keeps the pattern uniform — every flow has the same shape even when rendering is handled elsewhere.

### Where the existing sections fit

The Components section below describes individual React components. With the registry pattern:

- Components live inside their flow's folder (`flows/consult/ConsultThinking.tsx`, etc.) instead of a flat `components/home/`.
- The flow's `index.ts` is the assembly point — it imports its components, schema, fixture, and exports the `FlowDefinition`.
- Resting-state components (`ColdStartZero`, `ColdStartOneToFour`, `TasteProfileCelebration`, `HomeIdle`, `CityStarterPack`, `ConsultError`) stay under `apps/web/src/components/home/` because they are not flow outputs.
- Orthogonal components (`ClarificationHint`, `SavedSnackbar`, `HomeGreeting`) live under `apps/web/src/components/layout/` because they belong to the page layout, not to any single flow.

## Components

New files under `apps/web/src/components/home/`. One per phase, each under 150 lines.

### `TasteProfileCelebration.tsx` — Flow 9

```ts
interface Props {
  chips: string[];
  onStartExploring: () => void;
}
```

Renders the celebration: `TotoroExcited` illustration, headline "Your taste profile is ready.", subline "Is this you? Confirm or correct.", three chips, gold "Start exploring" CTA.

Each chip has local `pending | confirmed | dismissed` state. Confirmed → forest green treatment (`#d8ecc8` bg / `#3a6018` fg / `#b0d090` border, inline hex with `TODO: tokenize`). Dismissed → 25% opacity. Chip state is thrown away on CTA — only `tasteProfileConfirmed` boolean persists.

### `HomeIdle.tsx` — empty state with suggestions

Replaces `home-empty-state.tsx`. `TotoroIdleWelcoming` illustration, "What are you in the mood for?" headline, three suggestion chips.

```ts
interface Props {
  suggestions: string[];
  onSuggestionClick: (text: string) => void;
}
```

Dumb component, props only.

### `ConsultThinking.tsx` — Flow 2 thinking state

Header: small-caps "thinking about" label, the user's query underneath, gold context pills. Pills prefer `response.data.context_chips` when present; fall back to parsing `reasoning_steps[0].summary` on `·` when the backend hasn't added `context_chips` yet; render nothing if both are missing. Six step rows rendered from a static `FLOW_2_STEPS` constant. Skeleton card appears after step 3 completes.

```ts
interface Props {
  query: string;
  contextPills: string[];
  reasoningSteps: ReasoningStep[];
  onAnimationComplete: () => void;
}

const FLOW_2_STEPS = [
  { key: "understanding", i18nKey: "flow2.steps.understanding" },
  { key: "savedPlaces", i18nKey: "flow2.steps.savedPlaces" },
  { key: "discovering", i18nKey: "flow2.steps.discovering" },
  { key: "openNow", i18nKey: "flow2.steps.openNow" },
  { key: "comparing", i18nKey: "flow2.steps.comparing" },
  { key: "found", i18nKey: "flow2.steps.found" },
];
```

Internal state: `activeStep`, `completedSteps`, `showSkeleton`. Driven by a single `useEffect` that schedules six `setTimeout`s against the canonical schedule and cleans up on unmount.

Per-step row transition: `translateY(8px → 0) + opacity 0 → 1`, 200 ms ease. Active dot: gold border + pulsing inner dot (1.1 s keyframe from `v10.html` line 23). Completed dot: gold border + checkmark, fade-in 100 ms.

Skeleton card: appears at 2200 ms (after step 3 completes). 110 px gray block + three shimmer bars. Shimmer keyframe: `opacity 0.5 → 1 → 0.5, 1400ms infinite`. Fades in over 200 ms.

`onAnimationComplete` fires at 4100 ms (after step 6 duration completes).

### `ConsultResult.tsx` — Flow 2 result state

Composition:

```tsx
<ConsultResult>
  <ResultHeader /> {/* "totoro recommends" + gold check */}
  <PrimaryResultCard result={result.primary}>
    <TasteMatchArc /> {/* placeholder value */}
    <CommunityProofLine /> {/* placeholder value */}
  </PrimaryResultCard>
  <AlternativesDivider /> {/* "or, depending on your mood…" italic */}
  <AlternativesGrid>
    {result.alternatives.map(alt => (
      <AlternativeCard alt={alt} />
    ))}
  </AlternativesGrid>
</ConsultResult>
```

Child components:

- **`PrimaryResultCard.tsx`** — hero photo (16:9, 110 px tall), place name over dark label, context pills (cuisine · price · distance), reasoning block with gold left border (2 px, `#c8890a`, warm background `#f5ead8`), source attribution below reasoning, action row (Directions / Call / Share / Menu). Entry: `scale 0.95 → 1.0, 300 ms spring, shadow deepen`.

- **`TasteMatchArc.tsx`** — radial progress SVG, placeholder value from `constants/placeholders.ts`. Sits top-right of the primary card header, 44×44 px, gold stroke, `stroke-dasharray` trick.

- **`CommunityProofLine.tsx`** — single italic muted line. Placeholder count from the same constants file. Sits below the reasoning block, above source attribution.

- **`AlternativeCard.tsx`** — small photo, name, subline. Two per row, 1:1 grid. Slides in 400 ms after primary reveals (`translateY(12px → 0) + opacity 0 → 1, 400 ms ease`). No reasoning, no actions — subordinate.

### `ConsultError.tsx`

`TotoroIdleWelcoming` (reused — no dedicated concerned pose in the existing illustrations), headline from error category, body message, "Try again" gold button. Button calls `store.reset()` and flips phase back to the correct resting phase (`cold-0` / `cold-1-4` / `idle` based on `savedPlaceCount`) with the last query pre-filled in the input bar.

Only handles `offline` / `timeout` / `server` / `generic` client error categories. Clarification responses (`type === 'clarification'`) are rendered by `ClarificationHint` instead and never flip to the `'error'` phase — they are orthogonal to the phase state machine.

### `ClarificationHint.tsx` — inline clarification (server `type === 'clarification'`)

```ts
interface Props {
  message: string;
}
```

A muted italic single-line hint rendered _directly above_ the input bar (inside `ibw`, above `ib`), not inside the message area. Decoupled from `phase` — it's a slot on the input-bar container that renders whenever `store.clarificationMessage` is non-null, regardless of the active phase. The input bar stays focused, the previous query stays in the field, and a new submission clears the hint (`clarificationMessage = null`). No dismiss affordance, no animation beyond a 150 ms fade-in on mount. See decision 15 for why clarification is an error variant, not its own phase.

### `ColdStartZero.tsx` — Flow 7 (saved count = 0)

```ts
interface Props {
  onSuggestionClick: (text: string) => void;
}
```

Renders `TotoroIdleWelcoming` (or a new `TotoroRaining` variant if the rain-lines pose reads distinct enough — decided during implementation) + headline "Save places you love. I'll figure out the rest." + subline "The easiest way to save is from TikTok or Instagram" + three numbered share-extension steps in a vertical list + "or paste a link or type a name below" muted hint + two static consult suggestion pills.

Suggestions are **static text only** per the user spec — clicking them fills the input bar but fires nothing. The "input bar always does something" rule is satisfied by the real input bar; the example prompts are teaching aids, not interactive.

No backend call. No state. Dumb, props only. Input-bar placeholder while in this phase: `"Paste a link or type a name…"`.

### `ColdStartOneToFour.tsx` — Flow 8 (saved count 1–4)

```ts
interface Props {
  savedPlaces: SavedPlaceStub[]; // from saved-places-storage
  onStarterPackClick: () => void;
}
```

Renders a small Totoro illustration (`TotoroEncouraging` — new, or re-crop of an existing friendly pose) + headline "The more you save, the better I get." + subline "Recall works now. Consult shows what's good nearby." + compact saves list (one row per `SavedPlaceStub`, small square thumbnail + name + source/location) + `"What's good nearby"` small-caps label + placeholder `PopularNearbyCard` seeded from consult fixtures + `"City starter pack"` link at the bottom.

`savedPlaces` is read from `localStorage.totoro.savedPlaces`. If the array is empty but `savedPlaceCount > 0` (edge case — user cleared savedPlaces but count is non-zero), show a single placeholder row. Normal path: list matches the count.

When the user is in this phase and successfully saves a new place, the `SavedSnackbar` shows with the Flow 8 addendum: an extra gold italic line `"Taste signals updating."` above the regular snackbar body. This does **not** show at higher save counts (see decision 16).

### `PopularNearbyCard.tsx` — Flow 8 result wrapper

Wraps a Flow 2 `PrimaryResultCard` child with:

- A `"Popular right now"` small-caps label above the card
- A dashed gold border (`1px dashed #c8a060` — inline hex, `TODO: tokenize`)
- A muted italic footnote below the reasoning block: `"Save more places to get picks matched to your taste"`

Used by the home page when `phase === 'result'` AND `savedPlaceCount < 5`. One component, one decision point, one render path. The primary card itself is unchanged.

### `RecallResults.tsx` — Flow 3

```ts
interface Props {
  query: string;
  results: RecallItem[];
  hasMore: boolean;
  onModeOverride: () => void;
  onRequestMore: () => void;
}
```

Renders:

- Small-caps `"Found in your saves"` header
- `ModeOverridePill` directly below the header
- Results list, one `RecallItem` per row: 38 × 38 px thumbnail (fallback muted square if `thumbnail_url` absent), bold place name, muted provenance line `"Saved from {source} · {saved_at formatted} · {city}"` built from `item.match_reason` or composed from `source_url` + `saved_at` + `address`
- Empty-state footer when `hasMore === false` **and** `results.length <= 2`: dashed-border card with `"Nothing else matches. Want me to find more like this?"` — tapping it calls `onRequestMore()` which forces a consult on the same query

**Cascade animation:** each row has `style={{ animationDelay: \`${i \* 80}ms\` }}`driving an 80 ms staggered`opacity 0 → 1, translateY(4px → 0)` entry. 200 ms transition duration, linear cascade.

**No thinking animation.** If the recall fetch exceeds 600 ms, the store sets `recallBreadcrumb = true` and the component shows a muted single-line `"searching your saves…"` in place of the header until the results land. Matches decision 12.

### `ModeOverridePill.tsx` — Flow 3 consult pivot

Single tap pivots the current query from recall to consult. Gold pill, checkmark icon, text from `flow3.modeOverride`. Calls `store.submit(lastQuery, { forceIntent: 'consult' })` which bypasses the classifier and goes straight into the thinking animation. Matches v10.html `.mo` class visual.

### `SaveSheet.tsx` — Flow 4 half-sheet

```ts
interface Props {
  place: SaveSheetPlace; // { name, source, location, thumbnail_url? }
  status: "pending" | "saving" | "duplicate" | "error";
  originalSavedAt?: string; // populated when status === 'duplicate'
  errorMessage?: string; // populated when status === 'error'
  onSave: () => void;
  onDismiss: () => void;
  onViewSaved?: () => void; // populated when status === 'duplicate'
}
```

Half-sheet from the bottom edge, dark overlay behind (`rgba(60,40,20,.2)`), tap-outside dismisses. Covers ~35% of the screen. Handle bar + 52 × 52 px thumbnail + place name in Georgia serif + source badge (gold pill) + location text.

Status switches the body:

- **`pending`** — "Save to Totoro" gold full-width button, enabled
- **`saving`** — same button text shows "Saving…", button disabled, inline spinner
- **`duplicate`** — `TotoroKnowing` illustration + headline `"Already in your places"` + sub `"{place.name} · Saved {originalSavedAt formatted}"` + gold outline button `"View saved place"` which calls `onViewSaved`
- **`error`** — muted error line showing `errorMessage` + `"Try again"` gold button that calls `onSave` again

The sheet is a peer of the message area (not swapped in), mounted at the `<HomePage>` root layer so it overlays any phase. Driven by `store.phase === 'save-sheet' | 'save-duplicate'`.

### `SavedSnackbar.tsx` — Flow 4 success confirmation

Always mounted at the `<HomePage>` root. Slides up from the bottom edge when `store.phase === 'save-snackbar'`. Content:

- Small Totoro illustration (reuse of existing welcoming pose)
- Bold `"Saved!"` + `place.name + " · from " + place.source` subline
- `"Undo"` gold text link on the right
- **Flow 8 addendum**: when `savedPlaceCount >= 1 && savedPlaceCount <= 4` at the moment of save (the increment hasn't happened yet at display time), an extra italic gold line `"Taste signals updating."` appears above the "Saved!" line. Gated by decision 16.

Auto-dismisses after 2800 ms. `Undo` calls `store.undoLastSave()` (out of scope for this task — log `TODO` and leave a no-op binding).

### `AssistantReplyCard.tsx` — Flow 11

```ts
interface Props {
  message: string;
  onDismiss: () => void;
}
```

Single muted card rendered in the message area when `phase === 'assistant-reply'`. Just the `message` text inside a rounded card with a subtle border, no illustration, no actions. 200 ms fade-in on mount. Tapping the card or typing a new query dismisses it (`onDismiss` is called by the tap handler; new-query dismissal is handled by `submit()` which clears `assistantMessage` before dispatching).

No loading state, no animation beyond the fade-in. Per decision 14, the only loading affordance anywhere in Flow 11 is a small spinner on the send button while the chat request is in flight.

### `apps/web/src/components/home/index.ts`

Barrel export so `home/page.tsx` has one tidy import.

### `apps/web/src/constants/placeholders.ts`

```ts
export const PLACEHOLDER_TASTE_MATCH_PERCENT = 78;
export const PLACEHOLDER_COMMUNITY_SIMILAR_COUNT = 12;
export const TASTE_CHIP_BANK = ["Ramen lover", "Budget-friendly", "Night owl"];
export const CONSULT_SUGGESTIONS = [
  "Cheap dinner nearby, not crowded",
  "Something romantic for tonight",
  "Coffee spot to work from",
];
```

Swap to real fields by editing this file only.

### i18n

Every user-facing string goes through `next-intl`. New keys added to `apps/web/messages/en.json` and `apps/web/messages/he.json`:

- `flow2.steps.understanding` → "Understanding your request"
- `flow2.steps.savedPlaces` → "Checking your saved places"
- `flow2.steps.discovering` → "Discovering nearby options"
- `flow2.steps.openNow` → "Checking what's open"
- `flow2.steps.comparing` → "Comparing your best options"
- `flow2.steps.found` → "Found your match"
- `flow2.thinkingAbout` → "thinking about"
- `flow2.totoroRecommends` → "totoro recommends"
- `flow2.orDependingOnMood` → "or, depending on your mood…"
- `flow2.action.directions` → "Directions"
- `flow2.action.call` → "Call"
- `flow2.action.share` → "Share"
- `flow2.action.menu` → "Menu"
- `flow9.headline` → "Your taste profile is ready."
- `flow9.subline` → "Is this you? Confirm or correct."
- `flow9.startExploring` → "Start exploring"
- `home.idle.headline` → "What are you in the mood for?"
- `error.offline` → "You're offline. Check your connection and try again."
- `error.timeout` → "That took longer than expected. Try again?"
- `error.generic` → "I couldn't find a match right now. Try again?"
- `error.tryAgain` → "Try again"
- `flow3.header` → "Found in your saves"
- `flow3.modeOverride` → "Want a recommendation instead?"
- `flow3.emptyFooter` → "Nothing else matches. Want me to find more like this?"
- `flow3.breadcrumb` → "searching your saves…"
- `flow3.provenance` → "Saved from {source} · {date} · {city}" (ICU message with named args)
- `flow4.saveToTotoro` → "Save to Totoro"
- `flow4.saving` → "Saving…"
- `flow4.saved` → "Saved!"
- `flow4.savedSubline` → "{placeName} · from {source}" (ICU)
- `flow4.tasteSignalsUpdating` → "Taste signals updating." (Flow 8 only)
- `flow4.duplicate.title` → "Already in your places"
- `flow4.duplicate.body` → "{placeName} · Saved {date}" (ICU)
- `flow4.duplicate.cta` → "View saved place"
- `flow4.undo` → "Undo"
- `flow4.error` → "Couldn't save right now. Try again?"
- `flow7.headline` → "Save places you love. I'll figure out the rest."
- `flow7.subline` → "The easiest way to save is from TikTok or Instagram"
- `flow7.step1.title` → "Find a place on TikTok or Instagram"
- `flow7.step1.sub` → "Any post, reel, or video mentioning a place"
- `flow7.step2.title` → "Tap Share → Totoro"
- `flow7.step2.sub` → "No need to open the app or copy any link"
- `flow7.step3.title` → "I extract and save it automatically"
- `flow7.step3.sub` → "Place name, location, and context — done"
- `flow7.pasteHint` → "or paste a link or type a name below"
- `flow7.placeholder` → "Paste a link or type a name…" (input bar override while in cold-0)
- `flow7.suggestion1` → "Cheap dinner nearby, not crowded"
- `flow7.suggestion2` → "Something romantic for tonight"
- `flow8.headline` → "The more you save, the better I get."
- `flow8.subline` → "Recall works now. Consult shows what's good nearby."
- `flow8.whatsGood` → "What's good nearby"
- `flow8.popularRightNow` → "Popular right now"
- `flow8.popularFootnote` → "Save more places to get picks matched to your taste"
- `flow8.starterPack` → "City starter pack"
- `flow8.savedListEmpty` → "Your first saves will show up here."
- `flow11.placeholder` → (none — reuses default input bar copy)

Hebrew translations added alongside each.

### Illustrations — registry, mapping, and extensibility

The existing illustration system (`apps/web/src/components/illustrations/totoro-illustrations.tsx`) is a flat file of one-liner wrapper components around an `SvgImg` helper that loads an SVG from `/public/illustrations/` and attaches a CSS animation class from `libs/ui/styles/tokens.css`. Example (current code):

```tsx
function SvgImg({
  src,
  alt,
  animations,
}: {
  src: string;
  alt: string;
  animations?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width="100%"
      height="100%"
      className={cn(animations)}
    />
  );
}

export function TotoroAuth() {
  return (
    <SvgImg
      src="/illustrations/totoro-auth.svg"
      alt="Totoro auth"
      animations="anim-breathe"
    />
  );
}
```

The pattern is fine, but the current file mixes "illustrations used somewhere" with "illustrations that exist but nothing consumes them." Half the entries (`TotoroStepListen`, `TotoroStepRead`, `TotoroStepMove`, `TotoroStepCheck`, `TotoroStepEvaluate`, `TotoroStepComplete`, `TotoroHomeInput`, `TotoroResultCard`, `TotoroPlaceDetail`, `TotoroHoverPeek`, `TotoroSplash`, `TotoroSuccess`, `TotoroError`, `TotoroProcessing`) are orphaned — they were staged for flows that never landed in this form.

This task rewrites the illustration layer with the same philosophy as the Flow Registry: **one file per illustration, one registry map, one place to look for "which flow uses which pose."** Adding a new illustration tomorrow is a single registry entry.

#### `IllustrationId` union and registry

```ts
// apps/web/src/components/illustrations/registry.ts
export type IllustrationId =
  | "auth" // Flow 1 — sign-in screen
  | "idle-welcoming" // Flow 7 cold-0, idle fallback
  | "raining" // Flow 7 cold-0 (rain-lines variant, may fold into idle-welcoming)
  | "encouraging" // Flow 8 cold-1-4 header
  | "excited" // Flow 9 taste celebration
  | "knowing" // Flow 4 save-sheet duplicate variant
  | "welcome-back" // Flow 10 return-user banner (asset only, component deferred)
  | "listen" // Flow 5 voice input (asset kept, flow out of scope)
  | "empty" // /places empty state (pre-existing)
  | "add-place" // /places add-place modal (pre-existing)
  | "add-place-processing"
  | "add-place-success";

export interface IllustrationDefinition {
  id: IllustrationId;
  src: string; // public path under /illustrations/
  altKey: string; // i18n key for alt text
  animation: AnimationClass; // class name from libs/ui/styles/tokens.css
  sourceRef?: string; // v10.html line numbers or designer export note
}

export type AnimationClass =
  | "anim-breathe" // slow in/out scale, idle poses
  | "anim-bob" // gentle y-axis bob, active/waiting poses
  | "anim-float" // wider y-axis float, attention poses
  | "anim-nod" // head-nod on completion
  | "anim-bounce" // scale bounce on success
  | "anim-sway" // side-to-side sway, processing states
  | "anim-sway-gentle"
  | "anim-peek" // hover-reveal peek
  | "anim-none"; // no animation

export const ILLUSTRATION_REGISTRY = {
  auth: {
    id: "auth",
    src: "/illustrations/totoro-auth.svg",
    altKey: "illustrations.auth",
    animation: "anim-breathe",
  },
  "idle-welcoming": {
    id: "idle-welcoming",
    src: "/illustrations/totoro-idle-welcoming.svg",
    altKey: "illustrations.idleWelcoming",
    animation: "anim-breathe",
    sourceRef: "renamed from totoro-home-input.svg",
  },
  raining: {
    id: "raining",
    src: "/illustrations/totoro-raining.svg",
    altKey: "illustrations.raining",
    animation: "anim-breathe",
    sourceRef:
      "renamed from totoro-splash.svg — already has rain lines + mushroom cap",
  },
  encouraging: {
    id: "encouraging",
    src: "/illustrations/totoro-encouraging.svg",
    altKey: "illustrations.encouraging",
    animation: "anim-bob",
    sourceRef:
      "renamed from totoro-place-detail.svg — small sitting pose with leaves",
  },
  excited: {
    id: "excited",
    src: "/illustrations/totoro-excited.svg",
    altKey: "illustrations.excited",
    animation: "anim-bounce",
    sourceRef:
      "renamed from totoro-success.svg — already has gold star accents + big smile",
  },
  knowing: {
    id: "knowing",
    src: "/illustrations/totoro-knowing.svg",
    altKey: "illustrations.knowing",
    animation: "anim-sway-gentle",
    sourceRef: "renamed from totoro-hover-peek.svg — peeking-from-behind pose",
  },
  "welcome-back": {
    id: "welcome-back",
    src: "/illustrations/totoro-welcome-back.svg",
    altKey: "illustrations.welcomeBack",
    animation: "anim-bob",
    sourceRef: "renamed from totoro-step-complete.svg — tilted head + smile",
  },
  listen: {
    id: "listen",
    src: "/illustrations/totoro-step-listen.svg",
    altKey: "illustrations.listen",
    animation: "anim-float",
  },
  empty: {
    id: "empty",
    src: "/illustrations/totoro-empty.svg",
    altKey: "illustrations.empty",
    animation: "anim-bob",
  },
  "add-place": {
    id: "add-place",
    src: "/illustrations/totoro-add-place.svg",
    altKey: "illustrations.addPlace",
    animation: "anim-breathe",
  },
  "add-place-processing": {
    id: "add-place-processing",
    src: "/illustrations/totoro-add-place-processing.svg",
    altKey: "illustrations.addPlaceProcessing",
    animation: "anim-bob",
  },
  "add-place-success": {
    id: "add-place-success",
    src: "/illustrations/totoro-add-place-success.svg",
    altKey: "illustrations.addPlaceSuccess",
    animation: "anim-bounce",
  },
} as const satisfies Record<IllustrationId, IllustrationDefinition>;
```

#### Single rendering component

Replace the 15+ one-liner wrapper exports with one generic component that looks up the registry:

```tsx
// apps/web/src/components/illustrations/Illustration.tsx
import { useTranslations } from "next-intl";
import { cn } from "@totoro/ui";
import { ILLUSTRATION_REGISTRY, type IllustrationId } from "./registry";

interface Props {
  id: IllustrationId;
  className?: string;
  animate?: boolean; // default true; set false to freeze (e.g. screenshots, reduced-motion)
}

export function Illustration({ id, className, animate = true }: Props) {
  const t = useTranslations();
  const def = ILLUSTRATION_REGISTRY[id];
  return (
    <img
      src={def.src}
      alt={t(def.altKey)}
      width="100%"
      height="100%"
      className={cn(
        animate && def.animation !== "anim-none" && def.animation,
        className,
      )}
    />
  );
}
```

Usage in flow components:

```tsx
// flows/consult/TasteProfileCelebration.tsx
<Illustration id="excited" className="size-20" />

// components/home/ColdStartZero.tsx
<Illustration id="raining" className="size-20" />

// flows/save/SaveSheet.tsx (duplicate variant)
<Illustration id="knowing" className="size-12" />
```

No more named exports. One import (`Illustration`), one prop (`id`). Consumers don't care about the SVG path, the animation class, or the alt text. Adding a new illustration is: drop the SVG in `/public/illustrations/`, add one registry entry, consume it via `<Illustration id="new-pose" />`.

#### Per-flow illustration mapping

This is the authoritative table — which illustration renders in which flow / phase / component. Implementation must not introduce illustration references outside this mapping without updating the table.

| Flow / phase                              | Component                             | Illustration                             | Notes                                                                                                                     |
| ----------------------------------------- | ------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Flow 1 Auth (pre-existing)                | `login/page.tsx`                      | `auth`                                   | Untouched this task.                                                                                                      |
| Flow 2 Consult — `thinking`               | `ConsultThinking`                     | _none_                                   | "Character absent during active use" — UI spec Fix 5.                                                                     |
| Flow 2 Consult — `result`                 | `ConsultResult` / `PrimaryResultCard` | _none_                                   | Result card is photo-driven, not character-driven.                                                                        |
| Flow 3 Recall — `recall`                  | `RecallResults`                       | _none_                                   | Same absence rule.                                                                                                        |
| Flow 4 Save — `save-sheet` pending/saving | `SaveSheet`                           | _none_                                   | Place thumbnail drives the header, not a character.                                                                       |
| Flow 4 Save — `save-duplicate`            | `SaveSheet` (duplicate variant)       | `knowing`                                | The "Already in your places" knowing look.                                                                                |
| Flow 4 Save — `save-snackbar`             | `SavedSnackbar`                       | `welcome-back` (small inline)            | Reuse the small welcome-back Totoro head from the snackbar position in v10.html line 402.                                 |
| Flow 5 Voice (out of scope)               | _pending_                             | `listen`                                 | Asset kept for future work.                                                                                               |
| Flow 6 Profile (pre-existing)             | `profile-menu.tsx`                    | _none_                                   | Clerk avatar, not a Totoro.                                                                                               |
| Flow 7 Cold-0 — `cold-0`                  | `ColdStartZero`                       | `raining` or `idle-welcoming`            | Pick one during implementation — the rain-lines variant is closer to the screenshot but may not justify a separate asset. |
| Flow 8 Cold-1-4 — `cold-1-4`              | `ColdStartOneToFour`                  | `encouraging`                            | Small inline pose next to the headline.                                                                                   |
| Flow 8 sub-screen — `starter-pack`        | `CityStarterPack`                     | _none_                                   | Browsing view, no character.                                                                                              |
| Flow 9 Cold-5+ — `taste-profile`          | `TasteProfileCelebration`             | `excited`                                | Wide-eyes + gold star accents pose.                                                                                       |
| Flow 10 Return user (out of scope)        | _pending_                             | `welcome-back`                           | Asset added ahead of time, banner component deferred.                                                                     |
| Flow 11 Assistant — `assistant-reply`     | `AssistantReplyCard`                  | _none_                                   | Just a text card.                                                                                                         |
| Clarification (orthogonal)                | `ClarificationHint`                   | _none_                                   | Inline hint above input bar.                                                                                              |
| Resting — `idle`                          | `HomeIdle`                            | `idle-welcoming`                         | Default home state with the welcoming pose.                                                                               |
| `/places` empty tab (pre-existing)        | `places/page.tsx`                     | `empty`                                  | Untouched this task.                                                                                                      |
| `/places` add-place modal (pre-existing)  | `add-place-modal.tsx`                 | `add-place` / `-processing` / `-success` | Untouched this task.                                                                                                      |
| Error — `error`                           | `ConsultError`                        | `idle-welcoming`                         | UI spec does not define a concerned pose; reuse idle-welcoming per earlier decision.                                      |

Totals: **9 illustrations actively used** across the home page (5 from this task's new assets: `idle-welcoming`, `raining`, `encouraging`, `excited`, `knowing`, plus the existing `auth` / `empty` / `add-place` family and the deferred `welcome-back` / `listen`). The 6 orphaned illustrations in the current `totoro-illustrations.tsx` (`TotoroSplash`, `TotoroHomeInput`, `TotoroResultCard`, `TotoroPlaceDetail`, `TotoroHoverPeek`, the 5 `TotoroStep*` variants not listed above, `TotoroProcessing`, `TotoroSuccess`, `TotoroError`) are **deleted** from the registry and their SVG files are removed from `/public/illustrations/` — see the "Illustrations deleted" table in the cleanup pass.

#### Rename process — no SVG extraction needed

The new illustrations (`idle-welcoming`, `raining`, `encouraging`, `excited`, `knowing`, `welcome-back`) are **all satisfied by renaming existing SVG files** in `apps/web/public/illustrations/`. No extraction from `v10.html`, no vector editing, no Figma round-trip. Every rename maps the existing asset to a new semantic name — the SVG content itself is unchanged.

| Existing SVG               | Renamed to                  | New registry `id` | Why this matches                                                                                                                |
| -------------------------- | --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `totoro-home-input.svg`    | `totoro-idle-welcoming.svg` | `idle-welcoming`  | Simple standing Totoro with arms down — the welcoming-idle pose.                                                                |
| `totoro-splash.svg`        | `totoro-raining.svg`        | `raining`         | **Already has rain lines** (`#A8D5E2` strokes at the top) plus a red mushroom cap on a stick — literal match for Flow 7 cold-0. |
| `totoro-success.svg`       | `totoro-excited.svg`        | `excited`         | **Already has gold star accents** (`#F4C430` circles) + big smile — exact Flow 9 taste-celebration pose.                        |
| `totoro-place-detail.svg`  | `totoro-encouraging.svg`    | `encouraging`     | Small Totoro sitting on a path with leaves — friendly non-hero inline pose for Flow 8.                                          |
| `totoro-hover-peek.svg`    | `totoro-knowing.svg`        | `knowing`         | Totoro peeking from behind a ledge — reads as "I see you" / knowing. Flow 4 duplicate-detection.                                |
| `totoro-step-complete.svg` | `totoro-welcome-back.svg`   | `welcome-back`    | Tilted head + closed smiling eyes — nodding/satisfied. Flow 10 banner (deferred).                                               |

Procedure per illustration:

1. `git mv apps/web/public/illustrations/<old>.svg apps/web/public/illustrations/<new>.svg`.
2. Update the matching registry entry's `src` to the new path.
3. Update any existing React consumer to use `<Illustration id="<id>" />` instead of the old named export.
4. TypeScript compiler + the rename-and-usage verification grep catch stragglers at build time.

Zero vector editing. Every rename preserves existing animation and file size.

**If a rename turns out to be visually wrong during implementation:** fall back to extracting the authoritative pose from `v10.html` per the original plan. Line references are still in this spec under the earlier "Source material" section. This should not be necessary for any of the six new illustrations based on the SVG inspection done during planning, but the escape hatch is documented in case the rendered pose doesn't match the screenshot expectations.

#### Animation class reference

The animation classes are pre-existing in `libs/ui/styles/tokens.css`. This task does not add new animations — it only picks from the existing set. A short description of each is in the `AnimationClass` union comments above. If a flow's pose feels wrong with all existing classes, the correct fix is to add a new class to `tokens.css` in a follow-up task, **not** to inline keyframes in the illustration component.

#### i18n alt-text keys

Add to `en.json` and `he.json` under a new top-level `illustrations` section (mirrors the registry keys, lowercased/camelCased):

- `illustrations.auth` → "Totoro holding a lantern"
- `illustrations.idleWelcoming` → "Totoro welcoming you"
- `illustrations.raining` → "Totoro in the rain with a lantern and a mushroom"
- `illustrations.encouraging` → "Totoro with an encouraging smile"
- `illustrations.excited` → "Totoro excited, surrounded by gold stars"
- `illustrations.knowing` → "Totoro with a knowing expression"
- `illustrations.welcomeBack` → "Totoro saying welcome back"
- `illustrations.listen` → "Totoro listening with ear raised"
- `illustrations.empty` / `illustrations.addPlace` / `illustrations.addPlaceProcessing` / `illustrations.addPlaceSuccess` — keep existing strings.

Alt text is for screen readers and accessibility, not decoration. Every illustration gets a meaningful description, not `"Totoro"`.

#### Tradeoffs

- **Single generic component vs. per-illustration named exports** — named exports give better grep-ability (`TotoroExcited` is easy to find), but force 15+ files to update when the SVG path convention changes. Generic component is one change point. Grep is still possible via the registry entry or the `id="excited"` string.
- **String IDs vs. literal components** — `<Illustration id="excited" />` loses TypeScript autocomplete on the import statement. Mitigated by the `IllustrationId` union — the `id` prop is strictly typed, IDEs autocomplete the string literals.
- **Registry file size** — a few hundred lines for the full app's illustrations. Acceptable because it's append-only and every entry is ~8 lines. Splitting it (`illustrations/registry/home.ts` + `registry/places.ts`) is an option if it grows past ~30 entries.
- **Orphaned SVGs** — deleting unused illustrations from both the registry AND `/public/illustrations/` risks breaking a forgotten consumer. Mitigation: grep for each deleted `TotoroXxx` export name across the codebase before the PR merges, plus TypeScript compilation will catch missing component imports. Add to the verification checklist.

## Data flow and fetch layer

### Typed `ChatResponseDto` — `libs/shared/src/lib/types.ts`

Replace the current untyped `data: Record<string, unknown>` with a discriminated union:

```ts
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location: { lat: number; lng: number } | null; // always sent; null if user hasn't set a location
}

export type ChatResponseDto =
  | ConsultChatResponse
  | ExtractPlaceChatResponse
  | RecallChatResponse
  | AssistantChatResponse
  | ClarificationChatResponse
  | ErrorChatResponse;

// --- Consult (Flow 2) ---

export interface ConsultChatResponse {
  type: "consult";
  message: string;
  data: ConsultResponseData;
}

export interface ConsultResponseData {
  query: string;
  context_chips: string[];
  reasoning_steps: ReasoningStep[];
  primary: ConsultPlace;
  alternatives: ConsultPlace[];
}

export interface ReasoningStep {
  step: string;
  summary: string;
}

export interface ConsultPlace {
  place_name: string;
  address: string;
  reasoning: string;
  source: "saved" | "discovered";
  photo_url?: string;
  cuisine?: string;
  price_range?: string;
  distance_km?: number;
  source_attribution?: string;
}

// --- Extract-place / Save (Flow 4) ---

export interface ExtractPlaceChatResponse {
  type: "extract-place";
  message: string;
  data: ExtractPlaceData;
}

export interface ExtractPlaceData {
  place_id: string | null;
  place: {
    place_name: string | null;
    address: string | null;
    cuisine: string | null;
    price_range: string | null;
    thumbnail_url?: string;
  };
  confidence: number;
  status: "resolved" | "unresolved" | "duplicate";
  requires_confirmation: boolean;
  source_url: string | null;
  original_saved_at?: string; // populated when status === 'duplicate'
}

// --- Recall (Flow 3) ---

export interface RecallChatResponse {
  type: "recall";
  message: string;
  data: RecallData;
}

export interface RecallData {
  results: RecallItem[];
  total: number;
  has_more: boolean;
}

export interface RecallItem {
  place_id: string;
  place_name: string;
  address: string;
  cuisine?: string;
  price_range?: string;
  source_url?: string;
  saved_at: string; // ISO 8601
  match_reason: string;
  thumbnail_url?: string;
}

// --- Assistant (Flow 11) ---

export interface AssistantChatResponse {
  type: "assistant";
  message: string;
  data: null;
}

// --- Clarification (server-side "need more info", rendered inline near input bar) ---

export interface ClarificationChatResponse {
  type: "clarification";
  message: string; // LLM-generated clarification question
  data: null;
}

// --- Error (network / server failure) ---

export interface ErrorChatResponse {
  type: "error";
  message: string; // human-readable, e.g. "Something went wrong, please try again."
  data: {
    detail?: string; // server stack detail when available (from totoro-ai ChatService.run exception handler)
  } | null;
}

// Client-side error categorization — derived from fetch errors / HTTP status, NOT from the server response.
// Used by ConsultError to pick the right copy. Server-side errors always map to 'server' or 'generic'.
export type ClientErrorCategory =
  | "offline" // navigator.onLine === false or TypeError: Failed to fetch
  | "timeout" // AbortError after 30s
  | "server" // 5xx / response.type === 'error'
  | "generic"; // everything else
```

`context_chips` is a schema extension needed from `totoro-ai`. Forward-compatible with the "tolerates extra fields" rule. Frontend uses it if present, otherwise derives chips from `reasoning_steps[0].summary` by splitting on `·`.

**Clarification is its own response type.** Server code in `totoro-ai/src/totoro_ai/core/chat/service.py` returns `type: 'clarification'` as a distinct branch when `classify_intent` sets `clarification_needed`. The store captures the `message` into `store.clarificationMessage`, which is orthogonal to `phase` — rendered by `ClarificationHint` above the input bar regardless of the current phase. See decision 15.

**Error shape matches FastAPI.** `totoro-ai` returns `data: {"detail": str(exc)}` on caught exceptions. The frontend treats `detail` as an opt-in debug string for console logging, not for display — user-facing text comes from the top-level `message`. Client-originated errors (network unreachable, timeout) never populate `data.detail`; they flow through `ClientErrorCategory` in the store instead.

**Recall has no separate fetch endpoint.** A recall request is just `POST /api/v1/chat` with a message the server's classifier identifies as a recall. The client pre-classifies to open the UI immediately, but the network path is the same single endpoint.

**Save has no separate fetch endpoint either.** The save sheet opens sync (client-classified), then the "Save to Totoro" button calls `POST /api/v1/chat` with the same message — the server returns `type: 'extract-place'` with `data.status: 'resolved' | 'unresolved' | 'duplicate'`. The store reads `status` to drive `save-snackbar` / `save-duplicate` / `error` transitions.

### Fetch layer — `apps/web/src/api/`

```
apps/web/src/api/
  client.ts                 (existing)
  transports/               (existing)
  chat-client.ts            NEW — switchable real vs fixtures
  fixtures/
    consult-fixtures.ts     NEW — three canned consult responses from v10.html line 437
    recall-fixtures.ts      NEW — three canned recall responses from v10.html line 438
    save-fixtures.ts        NEW — three canned save responses from v10.html line 439
    assistant-fixtures.ts   NEW — fall-through Flow 11 canned replies
  schemas/
    chat-response.schema.ts NEW — zod validation at the boundary for every branch
```

`chat-client.ts`:

```ts
export interface ChatClient {
  chat(request: ChatRequestDto, signal?: AbortSignal): Promise<ChatResponseDto>;
}

export const chatClient: ChatClient =
  process.env.NEXT_PUBLIC_CHAT_FIXTURES === "true"
    ? chatClientFixtures
    : chatClientHttp;
```

`chatClientHttp` hits `POST /api/v1/chat` via the existing `HttpClient` transport, passing the `AbortSignal` through for cancellation, validating the response against the zod schema at the boundary (one schema per branch of the discriminated union), and throwing a `ChatContractError` on validation failure.

`chatClientFixtures` runs `classifyIntent(request.message)` first, then dispatches to the matching fixture file:

```ts
async chat(req, signal) {
  const intent = classifyIntent(req.message);
  switch (intent) {
    case 'recall': return recallFixture(req, signal);
    case 'save':   return saveFixture(req, signal);
    case 'consult': return consultFixture(req, signal);
    case 'assistant':
    default:       return assistantFixture(req, signal);
  }
}
```

Fixture delays (tuned so each UI state gets visible time):

- **Consult** — 2500 ms (thinking animation has room to run)
- **Recall** — 400 ms (no thinking state; cascade needs nearly-instant payload)
- **Save** — 800 ms (enough for the sheet to show the `saving` state visibly)
- **Assistant** — 300 ms (just long enough for the send-button spinner to register)

Per-intent fixture key maps:

- `consult-fixtures.ts` — `"cheap dinner nearby, not crowded"`, `"something romantic for tonight"`, `"coffee spot to work from"`. Unknown consult query falls through to the first fixture.
- `recall-fixtures.ts` — `"that ramen place from TikTok"` (2 results, `has_more: true`), `"the cafe near Sukhumvit"` (3 results, `has_more: false`), `"Japanese spot in Tokyo"` (1 result, `has_more: true`). Unknown recall query returns `{ results: [], total: 0, has_more: false }` so the empty-state footer renders.
- `save-fixtures.ts` — `"tiktok.com/@foodie/ramen123"` (new TikTok URL → `status: 'resolved'`, confidence 0.92), `"Paste Bangkok restaurant"` (name search → `status: 'resolved'`, confidence 0.78), `"Fuji Ramen Bangkok"` (existing save → `status: 'duplicate'`, `original_saved_at: "2026-02-12"`). Unknown save input returns a confidence-0.35 extraction with `status: 'resolved'` + `requires_confirmation: true` so the sheet still renders.
- `assistant-fixtures.ts` — single fall-through that returns `{ type: 'assistant', message: "I'm not sure how to help with that yet — try asking for a place or pasting a link.", data: null }`. Also contains one deliberate clarification fixture: messages matching the exact string `"clarify me"` return `{ type: 'clarification', message: "Could you add a cuisine or area so I can narrow it down?", data: null }` for manually exercising the `ClarificationHint`. Matches the server's real clarification branch in `totoro-ai/src/totoro_ai/core/chat/service.py`.

`NEXT_PUBLIC_CHAT_FIXTURES` defaults to `true` in development and `false` in production. Flipping to live is a one-line `.env.local` edit. A per-intent escape hatch (e.g. `NEXT_PUBLIC_CHAT_FIXTURES_INTENTS=recall,save`) is an optional follow-up if FastAPI lands some branches before others.

### Auth

NestJS expects a Clerk token in the request header. The existing `HttpClient` transport should handle this. Verify during implementation; if Clerk isn't wired into the fetch layer yet, add that as a prerequisite step in the plan.

### Client-side classifier — `apps/web/src/lib/classify-intent.ts`

```ts
export type ClientIntent = "consult" | "recall" | "save" | "assistant";

const URL_RE = /https?:\/\/[^\s]+/i;

// Memory-language hints: "that X", "I saved", "from TikTok/Instagram/etc", "the X I/we …"
const RECALL_HINTS =
  /\b(that\s+\w+|i\s+saved|from\s+(tiktok|instagram|twitter|youtube|blog)|the\s+.+\s+(place|spot|cafe|restaurant|bar)\s+(i|we))/i;

export function classifyIntent(message: string): ClientIntent {
  const trimmed = message.trim();
  if (!trimmed) return "consult";

  // URL anywhere in the message → save (strongest signal)
  if (URL_RE.test(trimmed)) return "save";

  // Memory-language hints → recall
  if (RECALL_HINTS.test(trimmed)) return "recall";

  // Short imperative place name (1–3 words, title-cased) → save
  const words = trimmed.split(/\s+/);
  if (words.length <= 3 && /^[A-Z]/.test(words[0] ?? "")) return "save";

  // Everything else → consult
  return "consult";
}
```

This is a **pre-router only.** FastAPI is always the source of truth. If the classifier routes to `save` and opens the sheet, but the server returns `type: 'consult'`, the store dismisses the sheet and jumps to `thinking`. The classifier's job is to make the happy path feel instant, not to be 100% correct — a 5% miss rate is acceptable because the sheet misclass → consult transition is visually smooth.

The classifier is a pure function, trivial to unit-test, no dependencies. Lives in `lib` not `api` because it's not network-adjacent.

### localStorage — `apps/web/src/lib/saved-places-storage.ts`

```ts
const KEY = "totoro.savedPlaces";

export interface SavedPlaceStub {
  place_id: string;
  place_name: string;
  source: string; // "TikTok" | "Instagram" | "Name search" | …
  location: string;
  saved_at: string; // ISO 8601
  thumbnail_url?: string;
}

export function readSavedPlaces(): SavedPlaceStub[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPlaceStub[]) : [];
  } catch {
    return [];
  }
}

export function appendSavedPlace(next: SavedPlaceStub): SavedPlaceStub[] {
  if (typeof window === "undefined") return [];
  try {
    const current = readSavedPlaces();
    // Dedupe by place_id
    if (current.some(p => p.place_id === next.place_id)) return current;
    const updated = [next, ...current];
    localStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
```

Used by the Cold 1–4 screen to render its compact saves list, and by `store.incrementSavedCount()` during Flow 4 to accumulate the list as new saves land. SSR-safe and defensive — private browsing or quota failures silently no-op. User in private browsing sees Cold-0 on every visit; acceptable per decision 4.

### localStorage — `apps/web/src/lib/taste-profile-storage.ts`

```ts
const KEY = "totoro.tasteProfile";

interface TasteProfileStorage {
  confirmed: boolean;
  savedPlaceCount: number;
}

const DEFAULT: TasteProfileStorage = { confirmed: false, savedPlaceCount: 5 };

export function readTasteProfile(): TasteProfileStorage {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function writeTasteProfile(next: Partial<TasteProfileStorage>): void {
  if (typeof window === "undefined") return;
  try {
    const current = readTasteProfile();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...next }));
  } catch {
    // private browsing, quota exceeded — silently no-op
  }
}
```

SSR-safe, defensive on every read/write.

### localStorage — `apps/web/src/lib/location-storage.ts`

```ts
const KEY = "totoro.location";

export interface StoredLocation {
  lat: number;
  lng: number;
}

export function readLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

export function writeLocation(location: StoredLocation | null): void {
  if (typeof window === "undefined") return;
  try {
    if (location === null) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, JSON.stringify(location));
    }
  } catch {
    // private browsing, quota exceeded — silently no-op
  }
}
```

Used by `store.hydrate()` to seed `store.location` on page load, and by `store.setLocation()` to persist any location update. To manually set your location for development: open DevTools → Application → Local Storage → set `totoro.location` to `{"lat":13.7563,"lng":100.5018}`, then reload. `setLocation(null)` clears it.

## Error handling

### Failure mode 1 — fetch rejects (network, 500, timeout)

`chatClient.chat()` throws. Store catches and branches on animation state:

- **Animation still running:** set `pendingError`, let animation play to 4100 ms, then flip to `error`. Prevents visual glitch.
- **Animation already done:** flip immediately.

Error classifier maps raw errors to three user-facing categories:

- Network / offline (`navigator.onLine === false` or `TypeError: Failed to fetch`) → `'offline'`
- Timeout (>30 s per api-contract) → `'timeout'`
- Anything else → `'generic'`

Raw error strings never hit the UI. Logged to console for developers.

### Failure mode 2 — HTTP 200 but `type === 'error'`

Use `response.message` as-is. Category `'server'`.

### Failure mode 3 — HTTP 200, `type === 'consult'`, malformed data

Handled by zod schema at the fetch-layer boundary:

```ts
// apps/web/src/api/schemas/consult.schema.ts
import { z } from "zod";

export const ReasoningStepSchema = z.object({
  step: z.string(),
  summary: z.string(),
});

export const ConsultPlaceSchema = z.object({
  place_name: z.string().min(1),
  address: z.string(),
  reasoning: z.string(),
  source: z.enum(["saved", "discovered"]),
  photo_url: z.string().url().optional(),
  cuisine: z.string().optional(),
  price_range: z.string().optional(),
  distance_km: z.number().optional(),
  source_attribution: z.string().optional(),
});

export const ConsultResponseDataSchema = z.object({
  query: z.string(),
  context_chips: z.array(z.string()).default([]),
  reasoning_steps: z.array(ReasoningStepSchema).min(1),
  primary: ConsultPlaceSchema,
  alternatives: z.array(ConsultPlaceSchema).max(2),
});
```

```ts
// apps/web/src/flows/recall/recall.schema.ts
import { z } from "zod";

export const RecallItemSchema = z.object({
  place_id: z.string().min(1),
  place_name: z.string().min(1),
  address: z.string(),
  cuisine: z.string().optional(),
  price_range: z.string().optional(),
  source_url: z.string().url().optional(),
  saved_at: z.string().datetime(), // ISO 8601
  match_reason: z.string(),
  thumbnail_url: z.string().url().optional(),
});

export const RecallResponseDataSchema = z.object({
  results: z.array(RecallItemSchema), // may be empty — empty recall is a valid state, not an error
  total: z.number().int().nonnegative(),
  has_more: z.boolean(),
});
```

```ts
// apps/web/src/flows/save/save.schema.ts
import { z } from "zod";

export const ExtractPlaceDataSchema = z.object({
  place_id: z.string().nullable(),
  place: z.object({
    place_name: z.string().nullable(),
    address: z.string().nullable(),
    cuisine: z.string().nullable(),
    price_range: z.string().nullable(),
    thumbnail_url: z.string().url().optional(),
  }),
  confidence: z.number().min(0).max(1),
  status: z.enum(["resolved", "unresolved", "duplicate"]),
  requires_confirmation: z.boolean(),
  source_url: z.string().url().nullable(),
  original_saved_at: z.string().datetime().optional(), // populated only on duplicate
});
```

```ts
// apps/web/src/flows/assistant/assistant.schema.ts
import { z } from "zod";

// Assistant has no data payload — validation is just the top-level envelope,
// but we still ship a schema for consistency with the Flow Registry contract.
export const AssistantResponseDataSchema = z.null();
```

```ts
// apps/web/src/flows/clarification/clarification.schema.ts
import { z } from "zod";

export const ClarificationResponseDataSchema = z.null();
```

The fetch layer (`chatClientHttp`) picks the right schema based on `response.type` after parsing the envelope, and runs it against `response.data`. A helper `parseChatResponse(raw: unknown): ChatResponseDto` lives in `apps/web/src/api/schemas/chat-response.schema.ts` and wires them together:

```ts
// apps/web/src/api/schemas/chat-response.schema.ts
import { z } from "zod";
import { ConsultResponseDataSchema } from "@/flows/consult/consult.schema";
import { RecallResponseDataSchema } from "@/flows/recall/recall.schema";
import { ExtractPlaceDataSchema } from "@/flows/save/save.schema";
import { AssistantResponseDataSchema } from "@/flows/assistant/assistant.schema";
import { ClarificationResponseDataSchema } from "@/flows/clarification/clarification.schema";

const EnvelopeBase = z.object({ message: z.string() });

export const ChatResponseSchema = z.discriminatedUnion("type", [
  EnvelopeBase.extend({
    type: z.literal("consult"),
    data: ConsultResponseDataSchema,
  }),
  EnvelopeBase.extend({
    type: z.literal("extract-place"),
    data: ExtractPlaceDataSchema,
  }),
  EnvelopeBase.extend({
    type: z.literal("recall"),
    data: RecallResponseDataSchema,
  }),
  EnvelopeBase.extend({
    type: z.literal("assistant"),
    data: AssistantResponseDataSchema,
  }),
  EnvelopeBase.extend({
    type: z.literal("clarification"),
    data: ClarificationResponseDataSchema,
  }),
  EnvelopeBase.extend({
    type: z.literal("error"),
    data: z.object({ detail: z.string().optional() }).nullable(),
  }),
]);

export function parseChatResponse(raw: unknown): ChatResponseDto {
  const parsed = ChatResponseSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Chat contract error", parsed.error);
    throw new ChatContractError(
      "Server response failed schema validation",
      parsed.error,
    );
  }
  return parsed.data as ChatResponseDto;
}
```

`ChatContractError` is a single error class thrown by the fetch layer. The store maps it to the `'generic'` client error category and logs the full zod issue tree to the console for debugging.

### Store — recall slice and `submitRecall()` implementation

`recallResults: RecallItem[] | null` and `recallHasMore: boolean` live alongside the other store fields. `submitRecall()` skips the entire thinking race (no animation, no `pendingResult`/`pendingError` double-await) and runs a single linear path:

```ts
async submitRecall(message: string) {
  // Cancel any in-flight fetch from a previous submit
  get().abortController?.abort();
  const abortController = new AbortController();

  set({
    phase: 'recall',
    activeFlowId: 'recall',
    query: message,
    recallResults: null,
    recallHasMore: false,
    recallBreadcrumb: false,
    abortController,
    error: null,
  });

  // Breadcrumb after 600 ms if the fetch hasn't resolved yet — decision 12
  const breadcrumbTimer = setTimeout(() => {
    if (get().recallResults === null) set({ recallBreadcrumb: true });
  }, 600);

  try {
    const res = await chatClient.chat(
      { user_id: userId(), message },
      abortController.signal,
    );
    clearTimeout(breadcrumbTimer);

    // Server may disagree with client pre-route — if so, jump to the correct flow
    if (res.type !== 'recall') {
      const finalFlow = FLOW_BY_RESPONSE_TYPE[res.type];
      finalFlow?.onResponse(res, storeApi);
      return;
    }

    set({
      recallResults: res.data.results,
      recallHasMore: res.data.has_more,
      recallBreadcrumb: false,
    });
  } catch (err) {
    clearTimeout(breadcrumbTimer);
    if ((err as Error).name === 'AbortError') return;   // silent — caller cancelled
    set({
      phase: 'error',
      error: classifyError(err),
      recallResults: null,
      recallBreadcrumb: false,
    });
  }
}
```

`submitRecall` is **not** behind the Flow 2 animation race. Recall has no pulsing-dot animation, no `markAnimationComplete`, no `tryReveal()`. The phase flips synchronously to `'recall'`, the component renders in its "loading" state (empty list, breadcrumb hidden), and the results replace null as soon as the response lands. The 80 ms cascade happens in the component via CSS `animation-delay`, not in the store.

Empty results (`res.data.results.length === 0`) is a valid successful state — `recallResults` becomes `[]`, and `RecallResults` renders the empty-state footer (`"Nothing else matches. Want me to find more like this?"` bridging to consult). It is **not** an error.

### Failure mode 4 — response type mismatches the client pre-route

Client classifier routes to one flow, server returns a different `type`. Handled by the Flow Registry's reverse lookup: `FLOW_BY_RESPONSE_TYPE[res.type]` resolves the correct flow, and the store delegates via that flow's `onResponse`. The user may see a brief flicker (sheet opens, sheet dismisses, thinking state starts) but never a stuck state.

`assistant` and `clarification` responses bypass the normal flow-registry `onResponse` path: `assistant` flips to `'assistant-reply'` and stores `assistantMessage`; `clarification` sets `clarificationMessage` and leaves `phase` untouched (orthogonal slot, see decision 15).

### Failure mode 5 — animation finishes but fetch is still in flight

Step 6 stays active with the pulsing dot until the fetch resolves. If fetch takes longer than 30 s, `chatClient` times out and rejects, falling into failure mode 1.

### Failure mode 6 — user submits a new query while phase is `thinking`

Cancel the in-flight fetch and start a new one. Store holds the current `AbortController`, calls `.abort()` on resubmit, and resets animation state. `ConsultThinking` unmounts and remounts with the new query (keyed on `query` prop), starting the animation fresh.

### Failure mode 7 — localStorage unavailable

`readTasteProfile` returns defaults. `writeTasteProfile` silently no-ops. User sees Flow 9 on every visit in private browsing. Acceptable.

### Failure mode 8 — hydration mismatch

`phase` starts as `'hydrating'` on the server. Message area renders nothing. Client reads localStorage in `useEffect`, flips to real phase. One frame of blank on first paint; no flash.

## Testing

### Unit tests (no DOM)

- `taste-profile-storage.test.ts` — round-trip write/read, defaults on error, SSR-safe.
- `saved-places-storage.test.ts` — round-trip, dedupe by `place_id`, SSR-safe, quota no-op.
- `classify-intent.test.ts` — URL anywhere → `save`; recall hints ("that ramen place from tiktok") → `recall`; short title-cased → `save`; default → `consult`; empty string → `consult`.
- `chat-response.schema.test.ts` — accepts fixtures for every branch (consult, extract-place, recall, assistant, clarification, error), rejects missing required fields, tolerates optional fields, rejects malformed `data.status` on extract-place.
- `chat-client-fixtures.test.ts` — each intent routes to the right fixture file, fall-through for unknown, delays verified with mock timers (2500 consult / 400 recall / 800 save / 300 assistant), `"clarify me"` → clarification shape.
- `home-store.test.ts` — the state machine is where bugs live:
  - **Consult (Flow 2):**
    - `submit()` with consult classification flips phase `idle → thinking` synchronously and sets `query`
    - `submit()` + successful response waits for both animation and fetch before flipping to `result`
    - Race handling: result-before-animation and animation-before-result both work
    - `submit()` with network error holds until animation complete
    - `submit()` with error after animation complete flips immediately
    - Re-submit while `thinking` aborts the previous fetch
  - **Recall (Flow 3):**
    - `submitRecall()` fires on recall-classified messages, flips to `'recall'` phase after fetch resolves
    - Breadcrumb `recallBreadcrumb` flips on after 600 ms if fetch still in flight
    - Empty results still populates `recallResults = []`, never leaves the phase unset
    - `submit(message, { forceIntent: 'consult' })` bypasses the classifier and goes to thinking (mode override pill)
  - **Save (Flow 4):**
    - `openSaveSheet()` flips to `'save-sheet'` with `status: 'pending'` synchronously, no network
    - `confirmSave()` flips status to `'saving'`, fires the request, lands on `'save-snackbar'` on resolved, `'save-duplicate'` on duplicate, `'error'` on failure
    - `incrementSavedCount()` writes localStorage and updates the in-memory count
    - `dismissSaveSheet()` clears the sheet state without flipping to a result
  - **Assistant + Clarification (Flow 11 + orthogonal hint):**
    - `submit()` with assistant classification flips to `'assistant-reply'` after fetch resolves
    - `dismissAssistantReply()` clears the message and returns to resting phase
    - `type: 'clarification'` response populates `clarificationMessage` without changing `phase`
    - A new `submit()` clears `clarificationMessage`
  - **Taste profile + hydration:**
    - `confirmTasteProfile()` writes localStorage and flips to `idle`
    - `reset()` clears state
    - `hydrate()` picks `cold-0` at count 0, `cold-1-4` at 1–4, `taste-profile` at ≥5 unconfirmed, `idle` at ≥5 confirmed
    - `NEXT_PUBLIC_DEV_SAVED_COUNT` override wins over localStorage in dev builds
    - Hydration ignores the dev override in production builds

### Component tests (RTL)

- `taste-profile-celebration.test.tsx` — three chips render, confirm turns forest green, dismiss drops to 25 %, CTA calls handler.
- `consult-thinking.test.tsx` — fake timers:
  - Six step labels from the constant
  - Step 1 active at 0 ms, completes at 600 ms
  - Step 2 active at 700 ms
  - Skeleton appears at 2200 ms
  - Sub-labels render from `reasoningSteps`, fade in on prop update
  - `onAnimationComplete` fires at 4100 ms
- `primary-result-card.test.tsx` — all fields render, arc shows placeholder percent, proof line shows placeholder count, four action buttons present.
- `alternative-card.test.tsx` — subordinate shape, 400 ms entry delay.
- `consult-error.test.tsx` — each client error category renders correct copy, button calls handler.
- `home-idle.test.tsx` — suggestions render, click calls handler.
- `cold-start-zero.test.tsx` — illustration + headline + three numbered steps + two static suggestion pills render. Clicking a suggestion fills the input bar (via `onSuggestionClick`) and does **not** call any network method.
- `cold-start-one-to-four.test.tsx` — saves list renders one row per `SavedPlaceStub` from props, starter pack link fires handler. With empty `savedPlaces` array, the empty-list copy renders.
- `popular-nearby-card.test.tsx` — wraps a child `PrimaryResultCard`, renders the "Popular right now" label and footnote, dashed border style present.
- `recall-results.test.tsx` — 80 ms stagger verified by checking each row's `animationDelay` inline style matches `${i * 80}ms`, empty-state footer renders when `results.length <= 2 && !hasMore`, mode override pill click calls handler, breadcrumb renders when `isBreadcrumbing` is true.
- `mode-override-pill.test.tsx` — click fires handler with the last query.
- `save-sheet.test.tsx` — each `status` variant renders the correct body (pending, saving, duplicate, error), save button enabled only in `pending`, tapping the overlay outside calls `onDismiss`, `originalSavedAt` formatted correctly in duplicate variant.
- `saved-snackbar.test.tsx` — auto-dismiss at 2800 ms with fake timers, undo calls handler, Flow 8 addendum line shows only when the `includesTasteSignalsUpdating` prop is true.
- `assistant-reply-card.test.tsx` — message renders, dismiss handler fires on tap.
- `clarification-hint.test.tsx` — non-null message renders above input bar with muted italic, null message renders nothing, new submission clears it.

### Integration test

`home-page.integration.test.tsx` with fixtures chat client and mocked localStorage:

- **Cold 0 → first save → cold 1–4:** empty localStorage → `cold-0` renders → type a TikTok URL → save sheet opens → tap "Save to Totoro" → snackbar appears → savedPlaceCount increments → reload → `cold-1-4` renders with the new save in the list.
- **Cold 1–4 consult with popular wrap:** `NEXT_PUBLIC_DEV_SAVED_COUNT=3` → `cold-1-4` renders → type a consult query → thinking → result wraps in `PopularNearbyCard` with the "Popular right now" label and footnote.
- **Cold 1–4 recall cascade:** `NEXT_PUBLIC_DEV_SAVED_COUNT=3` → type "that ramen place from TikTok" → no thinking state → `RecallResults` mounts → items animate in with 80 ms stagger → mode override pill click pivots to consult on the same query.
- **Taste profile Flow 9 path:** `NEXT_PUBLIC_DEV_SAVED_COUNT=7`, unconfirmed → `taste-profile` phase → click "Start exploring" → `idle` phase.
- **Consult happy path (idle):** confirmed ≥5 → type query → `thinking` → advance timers → `result` → fixture data renders.
- **Consult error path:** chat client throws → wait for animation → `error` → "Try again" restores resting phase.
- **Confirmed user path:** localStorage has `confirmed: true` and savedPlaceCount ≥5 → hydration goes straight to `idle` → `TasteProfileCelebration` never mounts.
- **Assistant fall-through:** type gibberish → fixtures assistant fall-through → `assistant-reply` card renders with the canned message → typing a new query clears it.
- **Clarification inline hint:** type `"clarify me"` → server returns `type: 'clarification'` → `ClarificationHint` renders above the input bar → the current phase does not change → typing a new query clears the hint.
- **Save duplicate flow:** type `"Fuji Ramen Bangkok"` → save sheet opens → tap Save → duplicate fixture returns → sheet swaps to "Already in your places" variant with the original saved date.

### Not tested

- Real network calls to `/api/v1/chat` — fixtures cover the contract shape.
- Clerk auth middleware — NestJS concern.
- Visual regression — no snapshot tests.
- Animation frame accuracy — manual check.

### Manual verification

1. `pnpm nx test web` — all tiers green.
2. `pnpm nx lint web` — no errors, no warnings.
3. `pnpm nx build web` — production build succeeds (catches SSR hydration issues).
4. `pnpm nx dev web` — open `/en/home` with fresh localStorage:
   - See Flow 9, confirm two chips, dismiss one, tap "Start exploring"
   - See idle state, click a suggestion
   - Watch animation, verify skeleton at step 3, verify sub-labels come from fixtures
   - Verify primary card entry, arc, proof line, alternatives delay
   - Submit second query, verify replacement
5. Reload. Verify Flow 9 does not reappear.
6. Open `/he/home`. Verify Hebrew strings and RTL mirroring.
7. Dark mode check. Known-risk: light-mode primary. Flag issues, don't fix in this task.

## Cleanup pass

### Files deleted from `apps/web/src/components/`

| File                      | Reason                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| `AgentResponseBubble.tsx` | Replaced by new Flow 2 components                                          |
| `AgentStep.tsx`           | Only consumer was `AgentResponseBubble`                                    |
| `ChatMessage.tsx`         | Home no longer echoes user text                                            |
| `home-empty-state.tsx`    | Replaced by `components/home/HomeIdle.tsx`                                 |
| `PlaceCard.tsx`           | Replaced by `PrimaryResultCard` + `AlternativeCard`                        |
| `ReasoningBlock.tsx`      | Only consumer was `PlaceCard`; reimplemented inline in `PrimaryResultCard` |
| `LoadingState.tsx`        | Already orphaned                                                           |
| `PasteIndicator.tsx`      | Already orphaned                                                           |
| `Modal.tsx`               | Already orphaned                                                           |
| `PastePreview.tsx`        | Paste flow dropped per UI spec                                             |

### `ChatInput.tsx` simplification

Strip all paste-handling logic and imports. Reduce to three elements per the UI spec: microphone (left), text field (center), send button (right). Nothing else.

### `add-place-modal.tsx`

Not touched in this task. Still consumed by the Places flow (verify during implementation); a separate cleanup task can address it.

### Old API contract and Bruno files

The NestJS gateway was unified into `POST /api/v1/chat` in commit `31e963c`. The old three-endpoint contract (`/v1/extract-place`, `/v1/consult`, `/v1/recall`) no longer exists on NestJS. Sub-plan 1 cleans up the leftover artifacts:

| File | Action | Reason |
| ---- | ------ | ------ |
| `docs/api-contract.md` | Add deprecation banner at the top | File documents the old three-endpoint contract. Full rewrite is a separate task; the banner prevents future confusion. |
| `totoro-config/bruno/nestjs-api/consult-stream.bru` | Delete | Hit the old `/v1/consult` streaming endpoint. No longer valid. |
| `totoro-config/bruno/places/extract-place.bru` | Delete | Hit the old `/v1/extract-place` endpoint. No longer valid. |

Deprecation banner to add at the top of `docs/api-contract.md`:

```
> **OUTDATED — do not use for NestJS integration.**
> The NestJS gateway was unified into a single endpoint in commit `31e963c`.
> The three endpoints documented here (`/v1/extract-place`, `/v1/consult`, `/v1/recall`)
> no longer exist on NestJS. The current contract is `POST /api/v1/chat` with
> `ChatRequestDto` / `ChatResponseDto` defined in `libs/shared/src/lib/types.ts`.
> This file documents the **totoro ↔ totoro-ai** internal contract only (FastAPI still
> exposes these paths internally). A rewrite of this doc for the unified chat endpoint
> is tracked as a follow-up task.
```

### No route pages deleted

All pages in `apps/web/src/app/` stay. The `/home` route is rewritten in place. `/places` and `/login` are untouched.

### Illustrations deleted from `totoro-illustrations.tsx` and `public/illustrations/`

| Illustration         | SVG file                   |
| -------------------- | -------------------------- |
| `TotoroSplash`       | `totoro-splash.svg`        |
| `TotoroPlaceDetail`  | `totoro-place-detail.svg`  |
| `TotoroSuccess`      | `totoro-success.svg`       |
| `TotoroHoverPeek`    | `totoro-hover-peek.svg`    |
| `TotoroHomeInput`    | `totoro-home-input.svg`    |
| `TotoroResultCard`   | `totoro-result-card.svg`   |
| `TotoroAddPlace`     | `totoro-add-place.svg`     |
| `TotoroStepListen`   | `totoro-step-listen.svg`   |
| `TotoroStepRead`     | `totoro-step-read.svg`     |
| `TotoroStepMove`     | `totoro-step-move.svg`     |
| `TotoroStepCheck`    | `totoro-step-check.svg`    |
| `TotoroStepEvaluate` | `totoro-step-evaluate.svg` |
| `TotoroStepComplete` | `totoro-step-complete.svg` |
| `TotoroProcessing`   | `totoro-processing.svg`    |
| `TotoroError`        | `totoro-error.svg`         |

### Illustrations kept

| Illustration               | Used by               |
| -------------------------- | --------------------- |
| `TotoroAuth`               | `login/page.tsx`      |
| `TotoroAddPlaceProcessing` | `add-place-modal.tsx` |
| `TotoroAddPlaceSuccess`    | `add-place-modal.tsx` |
| `TotoroEmpty`              | `places/page.tsx`     |

### Illustrations added

- `TotoroIdleWelcoming` — `totoro-idle-welcoming.svg`, source: `v10.html` lines 146–155. Used by Flow 7 cold-start and default idle.
- `TotoroExcited` — `totoro-excited.svg`, source: `v10.html` lines 327–337. Used by Flow 9 taste celebration.
- `TotoroRaining` — `totoro-raining.svg`, source: `v10.html` lines 275–291. Rain-lines / lantern pose used in the screenshots for Flow 7. If the pose reads identical enough to `TotoroIdleWelcoming` during implementation, fold the two together and keep only one asset.
- `TotoroEncouraging` — `totoro-encouraging.svg`, source: `v10.html` line 311. Small inline pose used in Flow 8 header.
- `TotoroKnowing` — `totoro-knowing.svg`, source: `v10.html` line 233. Used by the Flow 4 save-sheet duplicate variant ("Already in your places").
- `TotoroWelcomeBack` — `totoro-welcome-back.svg`, source: `v10.html` line 141 (inside the `rtb` return-user banner). Small inline pose for the Flow 10 banner — kept even though Flow 10 is still out of scope, because the banner visual is referenced by the return-user screenshot and the asset extraction cost is trivial.

### Greeting strip

The screenshots show a persistent header on home/idle/return-user phases: `"Hey {firstName}"` + `"{count} places saved"` + optional `WelcomeBackBanner`. This is **not** a component per-phase — it's a `<HomeGreeting>` component mounted at the top of the message area whenever `phase` is one of `idle | cold-1-4 | cold-0` and rendered with the user's first name from Clerk (`useUser()`) and `savedPlaceCount` from the store. Cold-0 shows `"0 places saved"` or hides the count entirely — decide during implementation. Adds ~30 lines to the component list.

### City Starter Pack — Flow 8 sub-screen

The Flow 8 "City starter pack" link in the Cold 1–4 card, when tapped, opens a sub-screen listing five curated places with `+ Save` buttons per row (see screenshot 12 in the user's reference set). Per the UI spec line 242, "Five curated local places, one-tap '+ Save' each. Real places, not dummy data."

Scope decision: in this task, **the sub-screen renders from a hardcoded `CITY_STARTER_PACK` constant in `apps/web/src/constants/city-starter-pack.ts`** (five Bangkok places matching the v10.html list: Samlor Restaurant, Fuji Ramen, Roots Coffee, Paste Bangkok, Laab Ubol). Tapping `+ Save` calls `store.confirmSave()` with that stub, same as a normal save. Real city-based curation is a follow-up.

Sub-screen is rendered via a new phase `'starter-pack'` on the enum (which brings the total to 14). Enter via `onStarterPackClick` handler on `ColdStartOneToFour`. Back button returns to `cold-1-4`. Component file: `apps/web/src/components/home/CityStarterPack.tsx`, props `{ places, onSave, onBack }`.

Update the `HomePhase` enum section above to include `'starter-pack'` — it was omitted in the first pass.

### Colors — explicitly not addressed

No changes to `globals.css` tokens or `tailwind.config.js` theme. Where the spec demands colors outside the token set, inline raw hex with `TODO: tokenize` comments. Dark mode is a known gap, not fixed in this task.

## Dependencies added

- `zustand` — state store for the home page. Small (~1 kb), no transitive dependencies of note.
- `zod` — response validation at the fetch-layer boundary. May already be in the tree via NestJS — verify during implementation.

## Open questions for implementation

1. Is `totoro-ai`'s classification + pipeline behind `/api/v1/chat` returning real data today for each intent (consult / recall / save / assistant), or is any branch still stubbed? Unknown from this repo alone. If stubbed, the fixtures client covers development; if real, toggle `NEXT_PUBLIC_CHAT_FIXTURES=false` and verify end-to-end. A per-intent fallback flag (`NEXT_PUBLIC_CHAT_FIXTURES_RECALL_ONLY` etc.) is cheap to add if only some branches are ready.
2. Does the existing `HttpClient` transport in `apps/web/src/api/transports/` already attach the Clerk bearer token to outgoing requests? If not, that's a prerequisite step in the plan.
3. Does `apps/web/src/components/add-place-modal.tsx` still have consumers? If not, it joins the cleanup list; if yes, it's a separate follow-up.

These get resolved during plan execution, not during design.

## Out of scope

- Backend changes. No new NestJS endpoints, no FastAPI endpoints. The unified `POST /api/v1/chat` is the only HTTP call the frontend makes.
- Taste model integration. Flow 9 chips are hardcoded.
- Real taste-signal inference on save. The Flow 8 post-save toast copy is static placeholder ("Taste signals updating.").
- City Starter Pack real curation. The five places are hardcoded per decision in the Flow 8 sub-screen section.
- Color tokens and dark mode. Inline hex with `TODO: tokenize` wherever the spec demands colors outside the existing token set.
- Flow 5 (Voice input). Deferred — `TotoroStepListen` illustration stays in-repo for when it's picked up.
- Flow 6 (Profile menu). Pre-existing in `apps/web/src/components/profile-menu.tsx` — not re-specified, not touched.
- Flow 10 (Return user banner). `WelcomeBackBanner` illustration asset is added ahead of time, but the banner component and the "gap since last session" detection logic are a follow-up task.
- Visual regression testing. Manual diff against the screenshots during `pnpm nx dev web` is the verification.
- Streaming / SSE from `/chat`. Synchronous JSON only for now.
- Backend Bruno additions beyond `chat.bru`. Other endpoints stay as-is.

## Bruno prerequisite — `totoro-config/bruno/nestjs-api/chat.bru`

Before the Flow 4 and Flow 3 live-wire steps in the build order, add one Bruno request file at `totoro-config/bruno/nestjs-api/chat.bru` with multiple variants (one per intent) to exercise the unified `POST /api/v1/chat` endpoint end-to-end. Variants:

- `Chat — consult` → body `{ message: "cheap dinner nearby, not crowded", location: {...} }` → expect `type: "consult"` with `data.primary` present
- `Chat — save URL` → body `{ message: "https://www.tiktok.com/@foodie/video/123 amazing ramen" }` → expect `type: "extract-place"` with `data.status: "resolved" | "unresolved"`
- `Chat — save name` → body `{ message: "Fuji Ramen Bangkok" }` → expect `type: "extract-place"`
- `Chat — recall` → body `{ message: "that ramen place I saved from TikTok" }` → expect `type: "recall"` with `data.results[]`
- `Chat — assistant` → body `{ message: "what's a good cuisine for a first date" }` → expect `type: "assistant"`
- `Chat — clarification` → body `{ message: "something" }` (deliberately vague) → expect `type: "clarification"` with a clarification question in `message`

The existing `consult-stream.bru` can be deleted or annotated "deprecated — use chat.bru" depending on whether any other work still needs the streaming endpoint.
