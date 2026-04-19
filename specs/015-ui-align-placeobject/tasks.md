# Tasks: UI Alignment to PlaceObject Contract (015)

**Feature**: `015-ui-align-placeobject` | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

---

## Phase 1 — New Primitives (blocking: all later phases depend on these)

- [ ] T001 Create `apps/web/src/lib/place-schema.ts` — Zod PlaceObjectSchema with all 3 tiers, satisfies z.ZodType<PlaceObject>
- [ ] T002 Create `apps/web/src/components/PlaceCard.tsx` — unified card using mockup as base: collapsed header (photo/avatar, name, subcategory, price dots, badge slot), expanded body (tags, attributes, tier-2 address gate, tier-3 enrichment gate, map button, phone tel: link, action slot), framer-motion layout + AnimatePresence
- [ ] T003 Add `placeCard` i18n keys to `apps/web/messages/en.json` (openMap, expand, collapse, openNow, closed)

---

## Phase 2 — Consult Flow [US1]

- [ ] T004 [US1] Rewrite `apps/web/src/flows/consult/consult.schema.ts` — new shape: recommendation_id, results[]{place,source}, reasoning_steps; satisfies z.ZodType<ConsultResponseData>
- [ ] T005 [US1] Rewrite `apps/web/src/flows/consult/consult.fixtures.ts` — full PlaceObject fixtures with recommendation_id + results[]
- [ ] T006 [US1] Rewrite `apps/web/src/flows/consult/ConsultResult.tsx` — results[0] expanded PlaceCard (primary), results[1..] collapsed list; accept/reject action slot calling store.acceptPlace/rejectPlace
- [ ] T007 [US1] Add consult i18n keys to `apps/web/messages/en.json` (consult.result.actions.accept, consult.result.actions.reject)
- [ ] T008 [US1] Delete `apps/web/src/flows/consult/PrimaryResultCard.tsx` and `AlternativeCard.tsx`

---

## Phase 3 — Recall Flow [US3]

- [ ] T009 [US3] Rewrite `apps/web/src/flows/recall/index.tsx` — strict RecallResponseDataSchema (total_count, empty_state), replace manual normalization with Zod parse
- [ ] T010 [US3] Rewrite `apps/web/src/flows/recall/recall.fixtures.ts` — full PlaceObject + match_reason + total_count + empty_state
- [ ] T011 [US3] Rewrite `apps/web/src/flows/recall/RecallResults.tsx` — PlaceCard per result with MatchReasonBadge; "Showing N of M" hint
- [ ] T012 [US3] Rewrite `apps/web/src/components/home/RecallResultBubble.tsx` — PlaceCard instead of RecallCard; data.total_count / data.empty_state

---

## Phase 4 — Save Flow [US2]

- [ ] T013 [US2] Rewrite `apps/web/src/flows/save/save.schema.ts` — ExtractPlaceItemSchema + ExtractPlaceDataSchema; satisfies shared types
- [ ] T014 [US2] Rewrite `apps/web/src/flows/save/save.fixtures.ts` — 4 scenarios: saved, tiktok url saved, needs_review×2, pending fallback
- [ ] T015 [US2] Rewrite `apps/web/src/flows/save/index.ts` onResponse — ExtractPlaceDataSchema.parse; store.openSaveSheet with sourceUrl
- [ ] T016 [US2] Rewrite `apps/web/src/flows/save/SaveSheet.tsx` — PlaceCard per item where place!=null; ConfidencePill badge; StatusButton action; pending/failed summary lines; auto-save on status==='saved'
- [ ] T017 [US2] Update `apps/web/src/flows/save/SaveFlow.tsx` — replace SaveExtractPlace with ExtractPlaceItem types

---

## Phase 5 — New API Clients [US4, US5]

- [ ] T018 [P] [US4] Create `apps/web/src/lib/signal-client.ts` — acceptRecommendation, rejectRecommendation, confirmChips; fixture mode resolves immediately; real mode POST /api/v1/signal; swallow 404 with console.warn
- [ ] T019 [P] [US4] Create `apps/web/src/lib/user-context-client.ts` — getUserContext(); fixture returns {signal_tier:'active',chips:[],saved_places_count:0}; real mode GET /api/v1/user/context
- [ ] T020 [P] [US4] Create `apps/web/src/lib/cold-suggestions.ts` — 6–8 hardcoded PlaceObject entries, Tier 1 only, placeholder comment

---

## Phase 6 — Store Rewrite [US1, US2, US3, US4, US5]

- [ ] T021 Rewrite `apps/web/src/store/home-store.ts` — replace RecallItem/SaveExtractPlace/SaveSheetPlace imports with RecallResult/ExtractPlaceItem; add signalTier, chips, savedPlacesCountFromContext, saveSheetSourceUrl state; rewrite pickRestingPhase (tier-first); add loadUserContext(), acceptPlace(), rejectPlace(), confirmChips(); update openSaveSheet signature; update submitRecall; update confirmSave auto-save rule to status==='saved'; add signal_tier to client.chat() call

---

## Phase 7 — Tier-Gated UI [US4]

- [ ] T022 [US4] Add `'chip-selection'` to HomePhase union in `apps/web/src/flows/flow-definition.ts` and to RESTING_PHASES set
- [ ] T023 [US4] Add `signal_tier` to ChatClientOptions in `apps/web/src/lib/chat-client.ts`; include in POST body when non-null; fixture client ignores it
- [ ] T024 [US4] Create `apps/web/src/components/home/ChipSelectionBoard.tsx` — actionable chips as 3-state toggles (pending→confirmed→rejected), fromBefore read-only section, Done/Skip footer; mobile full-screen, desktop centred modal
- [ ] T025 [US4] Create `apps/web/src/components/home/TasteChipsSidebar.tsx` — read-only chips; confirmed=filled, rejected=strikethrough, pending=outline; desktop right rail, mobile bottom strip
- [ ] T026 [US4] Create `apps/web/src/components/home/SavedProgressNudge.tsx` — progress bar + "{count} of 5 saved"; visible only on warming tier + count<5
- [ ] T027 [US4] Update `apps/web/src/app/[locale]/(main)/home/page.tsx` — add chip-selection case to phase switch; add TasteChipsSidebar on warming/active; add SavedProgressNudge on warming; call loadUserContext() after init(); update ColdStartZero to render COLD_SUGGESTIONS as PlaceCards
- [ ] T028 [US4] Add tier-gated i18n keys to `apps/web/messages/en.json` (chipSelection.*, savedProgress.*)

---

## Phase 8 — Verify

- [ ] T029 Run `pnpm nx lint web` — zero errors
- [ ] T030 Run `pnpm nx typecheck web` — zero errors
- [ ] T031 Run `pnpm nx build web` — successful production build

---

## Dependency Order

```
T001 → T002 → T003
T001,T002,T003 → T004–T020 (phases 2–5, any order among themselves)
T004–T020 → T021 (store rewrite needs all new types + clients)
T021,T022 → T023–T028 (tier UI needs store + HomePhase)
T023–T028 → T029–T031 (verify last)
```

## Parallel Opportunities

- T018, T019, T020 can run in parallel (different files, no dependencies on each other)
- T004–T008 (consult), T009–T012 (recall), T013–T017 (save) can run in any order relative to each other
