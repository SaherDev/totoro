# Home page — Sub-plans 1 & 2 — Infrastructure, Flow 2, Flow 9

**Part:** 1 of 2 — See also: `2026-04-10-home-subplans-3-7.md` for sub-plans 3-7.
**Master spec:** `2026-04-10-home-flow2-flow9-design.md` — source of truth for all cross-cutting decisions.


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

