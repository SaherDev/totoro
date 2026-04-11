# Component Contracts: Home Page Sub-plans 3–7

**Branch**: `012-home-subplans-3-7` | **Date**: 2026-04-11

All components receive the Zustand store via a `store` prop (same pattern as `ConsultDispatcher`). Dumb leaf components receive typed props only.

---

## `ColdStartZero` — Flow 7

```ts
// apps/web/src/components/home/ColdStartZero.tsx
interface Props {
  onSuggestionClick: (text: string) => void;
}
```

- Stateless. All data from constants (`CONSULT_SUGGESTIONS`) and i18n.
- `onSuggestionClick` fills the input bar (handled by home/page.tsx).

---

## `ColdStartOneToFour` — Flow 8

```ts
// apps/web/src/components/home/ColdStartOneToFour.tsx
interface Props {
  savedPlaces: SavedPlaceStub[];   // from localStorage
  savedPlaceCount: number;
  onStarterPackClick: () => void;
}
```

- `savedPlaces` may be an empty array if localStorage has count > 0 but no stubs (edge case — show placeholder row).
- `PopularNearbyCard` is rendered inline using the consult fixture data.

---

## `PopularNearbyCard` — Flow 8 result wrapper

```ts
// apps/web/src/components/home/PopularNearbyCard.tsx
interface Props {
  children: React.ReactNode;   // expects a PrimaryResultCard
}
```

- Renders a dashed gold border wrapper, "Popular right now" label, and footnote.
- Used by `home/page.tsx` when `phase === 'result' && savedPlaceCount < 5`.

---

## `SaveSheet` — Flow 4

```ts
// apps/web/src/flows/save/SaveSheet.tsx
interface Props {
  place: SaveSheetPlace;
  status: 'pending' | 'saving' | 'duplicate' | 'error';
  originalSavedAt?: string;
  errorMessage?: string;
  onSave: () => void;
  onDismiss: () => void;
  onViewSaved?: () => void;
}
```

- Mounted at `<HomePage>` root, visible when `phase === 'save-sheet' | 'save-duplicate'`.
- `onSave` calls `store.confirmSave()`.
- `onDismiss` calls `store.dismissSaveSheet()`.
- `onViewSaved` — no-op for now, logs TODO.

---

## `SavedSnackbar` — Flow 4

```ts
// apps/web/src/flows/save/SavedSnackbar.tsx
interface Props {
  place: SaveSheetPlace;
  showTasteSignals: boolean;   // true when savedPlaceCount was 1–4 at save time
  onUndo: () => void;
  onDismiss: () => void;
}
```

- Mounted at `<HomePage>` root, visible when `phase === 'save-snackbar'`.
- `onUndo` — no-op, logs TODO.
- `onDismiss` calls `store.dismissSaveSheet()` (same action restores `preSavePhase`).
- Auto-dismiss via `useEffect` with 2800 ms timeout that calls `onDismiss`.

---

## `RecallResults` — Flow 3

```ts
// apps/web/src/flows/recall/RecallResults.tsx
interface Props {
  store: HomeStoreApi;
}
```

Reads from store: `recallResults`, `recallHasMore`, `recallQuery`, `recallBreadcrumb`.

---

## `ModeOverridePill` — Flow 3

```ts
// apps/web/src/flows/recall/ModeOverridePill.tsx
interface Props {
  onOverride: () => void;
}
```

- `onOverride` calls `store.submit(recallQuery, { forceIntent: 'consult' })`.

---

## `AssistantReplyCard` — Flow 11

This component is not a standalone phase component. Assistant and clarification responses land in the thread as `AssistantBubble` entries (already built). The `AssistantReplyCard` variant renders inside the thread when the entry type is `'assistant'` (distinct from `'clarification'` which already renders).

```ts
// Rendered by AssistantBubble.tsx when entry.type === 'assistant'
// No separate component file needed — extend AssistantBubble
```

---

## `Illustration` — Registry component

```ts
// apps/web/src/components/illustrations/Illustration.tsx
interface Props {
  id: IllustrationId;
  className?: string;
  animate?: boolean;   // default true; CSS motion-reduce also applies
}
```

- Looks up `ILLUSTRATION_REGISTRY[id]` for src, altKey, animation class.
- Applies `motion-reduce:!animate-none` unconditionally (OS preference).
- When `animate === false`, suppresses the animation class entirely (screenshots, testing).

---

## Flow Registry entries (new)

### `recallFlow`
```ts
{
  id: 'recall',
  matches: { clientIntent: 'recall', responseType: 'recall' },
  phase: 'recall',
  inputPlaceholderKey: 'home.idle.placeholder',
  schema: RecallResponseDataSchema,
  fixture: recallFixture,
  onResponse: (res, store) => {
    store.set({ recallResults: res.data.results, recallHasMore: res.data.has_more });
  },
  Component: RecallResults,
}
```

### `saveFlow`
```ts
{
  id: 'save',
  matches: { clientIntent: 'save', responseType: 'extract-place' },
  phase: 'save-sheet',
  inputPlaceholderKey: 'home.idle.placeholder',
  schema: ExtractPlaceDataSchema,
  fixture: saveFixture,
  onResponse: (res, store) => { /* handled by confirmSave() directly */ },
  Component: SaveSheet,  // rendered at root layer, not via flow dispatch
}
```

### `assistantFlow`
```ts
{
  id: 'assistant',
  matches: { clientIntent: 'assistant', responseType: 'assistant' },
  phase: 'assistant-reply',
  inputPlaceholderKey: 'home.idle.placeholder',
  schema: z.object({ message: z.string() }),
  fixture: assistantFixture,
  onResponse: (res, store) => {
    const entry = { id: nextId(), role: 'assistant', type: 'assistant', message: res.message, dismissed: false };
    store.set({ thread: [...store.thread, entry], phase: pickRestingPhase(...) });
  },
  Component: () => null,  // renders via thread, not as a phase component
}
```
