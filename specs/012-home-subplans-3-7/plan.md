# Implementation Plan: Home Page Sub-plans 3–7

**Branch**: `012-home-subplans-3-7` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)

## Summary

Implement the remaining home-page flows (Recall/Flow 3, Save/Flow 4, Assistant Reply/Flow 11, Cold-Start Zero/Flow 7, Cold-Start 1–4/Flow 8) and refactor the illustration system to a typed registry. All flows run in fixture mode. The shared-types layer, store state machine, and fetch layer are extended — no new backend endpoints. CSS-only animations throughout (framer-motion pending approval).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 LTS  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Zustand, Zod, Tailwind v3, shadcn/ui, next-intl, next-themes, Clerk v5  
**Storage**: localStorage only (`totoro.savedCount`, `totoro.savedPlaces`, `totoro.tasteProfile`, `totoro.location`) — no DB changes  
**Testing**: Jest + React Testing Library (`pnpm nx test web`)  
**Target Platform**: Web — Next.js App Router, mobile-first  
**Performance Goals**: Save flow visible within 3s; recall results within 600ms; cold-start render within 1s of page load  
**Constraints**: RTL logical properties only; all strings via next-intl; Tailwind v3 semantic tokens only; `motion-reduce:!animate-none` for reduced-motion; no framer-motion until approved  
**Scale/Scope**: ~15 new components/files, ~6 SVG renames, ~60 new i18n keys, 1 shared-types update

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| Two-repo boundary (§I) | ✅ Pass | Frontend only — no NestJS, no AI calls |
| Nx module boundaries (§II) | ✅ Pass | `apps/web` imports `libs/shared` + `libs/ui` only |
| ADR-007: Tailwind v3 (§III) | ✅ Pass | No v4 features used |
| ADR-003: No .env files (§IV) | ✅ Pass | `NEXT_PUBLIC_CHAT_FIXTURES` in `.env.local` (gitignored) |
| Frontend standards — RTL (§VII) | ✅ Pass | All logical properties enforced in components |
| Frontend standards — i18n (§VII) | ✅ Pass | All strings via `next-intl` |
| Frontend standards — dark mode (§VII) | ✅ Pass | CSS variables, no raw colors |
| Code standards — naming (§VIII) | ✅ Pass | `kebab-case` files, `PascalCase` components |
| Shared types in `libs/shared` (§VIII) | ✅ Pass | `ChatResponseDto`, `SavedPlaceStub`, etc. live in shared |
| Required skills §X | ✅ Noted | `nextjs16-skills`, `vercel-react-best-practices`, `web-design-guidelines` must be invoked at implement time |

**No violations. Gate passes.**

## Project Structure

### Documentation (this feature)

```text
specs/012-home-subplans-3-7/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── component-contracts.md
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
libs/shared/src/lib/
└── types.ts                         UPDATE — add has_more, thumbnail_url, ExtractPlaceData, SaveSheetPlace

apps/web/src/
  components/home/
    ColdStartZero.tsx                NEW
    ColdStartOneToFour.tsx           NEW
    PopularNearbyCard.tsx            NEW
    index.ts                         NEW — barrel export
    [HomeIdle, HomeGreeting, etc.]   UNCHANGED

  components/illustrations/
    registry.ts                      NEW — IllustrationId union + ILLUSTRATION_REGISTRY
    Illustration.tsx                 NEW — single generic component
    totoro-illustrations.tsx         DELETE — replaced by above

  flows/
    recall/
      index.ts                       NEW — recallFlow definition
      RecallResults.tsx              NEW
      ModeOverridePill.tsx           NEW
      recall.schema.ts               NEW
      recall.fixtures.ts             NEW
    save/
      index.ts                       NEW — saveFlow definition
      SaveSheet.tsx                  NEW
      SavedSnackbar.tsx              NEW
      save.schema.ts                 NEW
      save.fixtures.ts               NEW
    assistant/
      index.ts                       NEW — assistantFlow definition
      assistant.fixtures.ts          NEW
    consult/                         UNCHANGED
    registry.ts                      UPDATE — wire recall, save, assistant flows
    flow-definition.ts               UPDATE — add 'save-duplicate', verify HomePhase completeness

  store/
    home-store.ts                    UPDATE — preSavePhase, recallQuery, recallBreadcrumb;
                                              implement all 6 stubbed actions;
                                              extend ThreadEntry union

  lib/
    chat-client.ts                   UPDATE — per-intent fixture dispatch + per-intent delays

  api/schemas/
    recall.schema.ts                 NEW (re-export from flows/recall for boundary validation)
    save.schema.ts                   NEW (re-export from flows/save)

  storage/
    saved-places-storage.ts          UPDATE — add getSavedPlaces(), appendSavedPlace()

  app/[locale]/(main)/home/
    page.tsx                         UPDATE — wire cold-0, cold-1-4, recall, save-sheet,
                                              save-snackbar, save-duplicate, assistant-reply phases;
                                              PopularNearbyCard wrapper for result phase

  messages/
    en.json                          UPDATE — ~60 new keys (flow3/4/7/8/11, illustrations)
    he.json                          UPDATE — same keys in Hebrew

public/illustrations/
  totoro-idle-welcoming.svg          RENAME (was totoro-home-input.svg)
  totoro-raining.svg                 RENAME (was totoro-splash.svg)
  totoro-excited.svg                 RENAME (was totoro-success.svg)
  totoro-encouraging.svg             RENAME (was totoro-place-detail.svg)
  totoro-knowing.svg                 RENAME (was totoro-hover-peek.svg)
  totoro-welcome-back.svg            RENAME (was totoro-step-complete.svg)
  [8 orphaned SVGs]                  DELETE (after grep verification)
```

---

## Implementation Phases

### Phase 1 — Foundation (no UI, unblocks everything)

**Files**: `libs/shared/types.ts`, `components/illustrations/`, SVG renames, i18n keys

1. Extend `libs/shared/src/lib/types.ts`:
   - Add `has_more: boolean` to `RecallResponseData`
   - Add `thumbnail_url?: string` to `RecallItem`
   - Add `source_url`, `thumbnail_url?` to `SavedPlaceStub`
   - Add `ExtractPlaceData` interface
   - Add `SaveSheetPlace` interface

2. Create `components/illustrations/registry.ts` — `IllustrationId` union + `ILLUSTRATION_REGISTRY`

3. Create `components/illustrations/Illustration.tsx` — generic component with `motion-reduce:!animate-none`

4. Rename 6 SVGs via `git mv`

5. Grep verify no consumers of old named exports, then delete `totoro-illustrations.tsx`

6. Delete 8 orphaned SVG files (after grep confirms no consumers)

7. Add all i18n keys to `en.json` and `he.json`

**Verify**: `pnpm nx build web` — zero TypeScript errors; grep for old illustration names returns zero

---

### Phase 2 — Fetch layer

**Files**: `flows/recall/recall.fixtures.ts`, `flows/save/save.fixtures.ts`, `flows/assistant/assistant.fixtures.ts`, `lib/chat-client.ts`

1. Create `flows/recall/recall.fixtures.ts` — 3 keyed responses + unknown fallback (empty)
2. Create `flows/save/save.fixtures.ts` — 4 keyed responses (resolved, duplicate, low-confidence, unknown fallback)
3. Create `flows/assistant/assistant.fixtures.ts` — fall-through assistant + `"clarify me"` clarification key
4. Update `lib/chat-client.ts`:
   - Import per-intent fixture files
   - Set per-intent delays: consult 2500ms, recall 400ms, save 800ms, assistant 300ms
   - Keep existing consult fixture in `flows/consult/consult.fixtures.ts`

**Verify**: `pnpm nx test web` — fixture dispatch unit tests pass

---

### Phase 3 — Store extension

**Files**: `store/home-store.ts`, `storage/saved-places-storage.ts`

1. Add new state fields: `preSavePhase`, `saveSheetMessage`, `recallQuery`, `recallBreadcrumb`

2. Extend `ThreadEntry` union with `assistant` (+ `dismissed`), `recall`, `save` types; add `dismissed?` to `clarification`

3. Implement `openSaveSheet(message)`:
   - Capture `preSavePhase = get().phase`
   - Set `phase: 'save-sheet'`, `saveSheetStatus: 'pending'`, `saveSheetMessage: message`
   - Derive `SaveSheetPlace` from the message (name extraction is client-side best-effort; server response fills real data)

4. Implement `confirmSave()`:
   - Set `saveSheetStatus: 'saving'`
   - Call `getChatClient(getToken).chat({ message: saveSheetMessage })`
   - On `status: 'resolved'`: call `incrementSavedCount(place)`, then set `phase: 'save-snackbar'`
   - On `status: 'duplicate'`: set `phase: 'save-duplicate'`, `saveSheetOriginalSavedAt`
   - On error: set `saveSheetStatus: 'error'`

5. Implement `dismissSaveSheet()`:
   - Restore `phase = preSavePhase ?? pickRestingPhase()`
   - Clear `preSavePhase`, `saveSheetPlace`, `saveSheetMessage`, `saveSheetStatus`

6. Implement `incrementSavedCount(place)`:
   - Call `incrementSavedPlaceCount()` (existing)
   - Call `appendSavedPlace(place)` (new)
   - Update `savedPlaceCount` in store

7. Implement `submitRecall(message)`:
   - Set `recallQuery: message`, `phase: 'recall'`, `recallResults: null`, `recallBreadcrumb: false`
   - Start 600ms timer → if still pending, set `recallBreadcrumb: true`
   - Call chat client, on response: set `recallResults`, `recallHasMore`, cancel timer

8. Implement `dismissAssistantReply()`:
   - Map thread, find last undismissed assistant/clarification entry, set `dismissed: true`

9. Add `getSavedPlaces()`, `appendSavedPlace()` to `saved-places-storage.ts`

**Verify**: `pnpm nx test web` — store unit tests; `pnpm nx build web` for type-check

---

### Phase 4 — Recall flow

**Files**: `flows/recall/`, `flows/registry.ts`

1. Create `flows/recall/recall.schema.ts` — `RecallResponseDataSchema`
2. Create `flows/recall/ModeOverridePill.tsx` — gold pill, calls `store.submit(recallQuery, { forceIntent: 'consult' })`
3. Create `flows/recall/RecallResults.tsx`:
   - Reads `recallResults`, `recallHasMore`, `recallBreadcrumb` from store
   - "Found in your saves" header (or breadcrumb if loading)
   - `ModeOverridePill`
   - Staggered result rows with 80ms delay per row
   - Thumbnail (38×38, muted fallback)
   - Provenance line from `source_url` + `saved_at` + `address`
   - Empty-state footer when `results.length ≤ 2 && !hasMore`
4. Create `flows/recall/index.ts` — `recallFlow` definition
5. Update `flows/registry.ts` — replace recall stub with `recallFlow`

**Verify**: Submit "that ramen place from TikTok" → recall results render with cascade animation

---

### Phase 5 — Save flow

**Files**: `flows/save/`, `flows/registry.ts`

1. Create `flows/save/save.schema.ts` — `ExtractPlaceDataSchema`
2. Create `flows/save/SaveSheet.tsx`:
   - Fixed bottom sheet, `translate-y-full → translate-y-0` CSS transition
   - Dark overlay `rgba(60,40,20,0.2)` → tap-outside calls `onDismiss`
   - Handle bar + 52×52 thumbnail + Georgia serif name + gold source badge + location
   - Status-driven body (pending / saving / duplicate / error)
   - `Illustration id="knowing"` in duplicate state
3. Create `flows/save/SavedSnackbar.tsx`:
   - Fixed bottom, slides up on mount
   - `Illustration id="welcome-back"` inline
   - Bold "Saved!" + subline + "Undo" gold link (no-op, TODO)
   - `showTasteSignals` prop → extra italic gold line when true
   - `useEffect` 2800ms auto-dismiss
4. Create `flows/save/index.ts` — `saveFlow` definition
5. Update `flows/registry.ts` — replace save stub with `saveFlow`

**Verify**: Submit `tiktok.com/@foodie/ramen123` → sheet opens → tap Save → snackbar → restores previous phase. Submit `Fuji Ramen Bangkok` → duplicate state.

---

### Phase 6 — Cold-start components

**Files**: `components/home/ColdStartZero.tsx`, `ColdStartOneToFour.tsx`, `PopularNearbyCard.tsx`, `home/page.tsx`

1. Create `ColdStartZero.tsx`:
   - `Illustration id="raining"` (or `"idle-welcoming"` — decide during impl)
   - Headline + subline from i18n
   - Three numbered steps (title + subtitle each)
   - Muted paste hint
   - Two suggestion pills from `CONSULT_SUGGESTIONS` → `onSuggestionClick`

2. Create `ColdStartOneToFour.tsx`:
   - `Illustration id="encouraging"` inline
   - Headline + subline
   - Compact saves list (up to 4 stubs from localStorage; placeholder row if empty)
   - "What's good nearby" label + consult fixture `PopularNearbyCard`
   - "City starter pack" link (no-op placeholder)

3. Create `PopularNearbyCard.tsx`:
   - Wraps children with dashed gold border (`border border-dashed` + inline `#c8a060` color TODO: tokenize)
   - "Popular right now" small-caps label above
   - Muted italic footnote below

4. Update `home/page.tsx`:
   - Wire `phase === 'cold-0'` → `<ColdStartZero />`
   - Wire `phase === 'cold-1-4'` → `<ColdStartOneToFour />`
   - Wrap `phase === 'result'` primary card in `<PopularNearbyCard>` when `savedPlaceCount < 5`
   - Mount `<SaveSheet />` and `<SavedSnackbar />` at root layer (always rendered, driven by phase)
   - Wire `phase === 'recall'` → `<RecallResults />`

5. Create `components/home/index.ts` — barrel export for all home components

**Verify**: localStorage manipulation → each phase renders correctly

---

### Phase 7 — Assistant flow + final wiring

**Files**: `flows/assistant/`, `components/home/AssistantBubble.tsx`, `flows/registry.ts`

1. Create `flows/assistant/index.ts` — `assistantFlow` definition
2. Update `flows/registry.ts` — replace assistant stub with `assistantFlow`
3. Update `components/home/AssistantBubble.tsx` — handle `type: 'assistant'` entry (currently only handles `type: 'clarification'`); render `dismissed` entries as `null`
4. Update `submit()` in store — set `dismissed: true` on last undismissed assistant/clarification bubble before dispatching new query

**Verify**: Type "clarify me" → clarification bubble appears. Type any unknown → assistant bubble. Tap bubble → dismissed (renders nothing). Type new query → previous bubble dismissed before new dispatch.

---

### Phase 8 — Verification & cleanup

1. `pnpm nx run-many -t build,lint,test` — all must pass
2. Grep for orphaned illustration exports → zero results
3. Grep for RTL violations (`pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`) in new files → zero
4. Grep for hardcoded strings in new components → zero (all through `t()`)
5. Manual browser test of all 8 phases (cold-0, cold-1-4, thinking, result, recall, save-sheet, save-snackbar, save-duplicate, assistant-reply, error)
6. Hebrew locale test (`/he/`) — all new strings render

---

## Complexity Tracking

No constitution violations. No complexity entries required.
