# Data Model: Home Page Sub-plans 3–7

**Branch**: `012-home-subplans-3-7` | **Date**: 2026-04-11

---

## 1. Shared Types — `libs/shared/src/lib/types.ts`

### Changes (additive — no breaking changes)

#### `RecallResponseData` — add `has_more`
```ts
export interface RecallResponseData {
  results: RecallItem[];
  total: number;
  has_more: boolean;   // NEW
}
```

#### `RecallItem` — add `thumbnail_url`
```ts
export interface RecallItem {
  place_id: string;
  place_name: string;
  address: string;
  cuisine: string | null;
  price_range: string | null;
  source_url: string | null;
  saved_at: string;           // ISO 8601
  match_reason: string;
  thumbnail_url?: string;     // NEW
}
```

#### `SavedPlaceStub` — extend for save flow + cold-1-4 list
```ts
export interface SavedPlaceStub {
  place_id: string;
  place_name: string;
  address: string;
  saved_at: string;           // ISO 8601
  source_url: string | null;  // NEW — for provenance display
  thumbnail_url?: string;     // NEW — for cold-1-4 saves list thumbnail
}
```

#### `ExtractPlaceData` — new (save flow server response shape)
```ts
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
  status: 'resolved' | 'unresolved' | 'duplicate';
  requires_confirmation: boolean;
  source_url: string | null;
  original_saved_at?: string;   // populated when status === 'duplicate'
}
```

#### `SaveSheetPlace` — new (save sheet display model)
```ts
export interface SaveSheetPlace {
  name: string;
  source: string;       // human-readable: "TikTok", "Instagram", or domain
  location: string;     // address string for display
  thumbnail_url?: string;
}
```

---

## 2. Store State — `apps/web/src/store/home-store.ts`

### New state fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `preSavePhase` | `HomePhase \| null` | `null` | Phase to restore after snackbar dismisses |
| `saveSheetMessage` | `string \| null` | `null` | Original user message that triggered the save sheet |
| `recallQuery` | `string \| null` | `null` | Active recall query (for mode-override re-submit) |
| `recallBreadcrumb` | `boolean` | `false` | `true` when recall fetch exceeds 600 ms |

### Updated state fields

| Field | Current Type | Updated Type | Reason |
|-------|-------------|-------------|--------|
| `saveSheetPlace` | `SavedPlaceStub \| null` | `SaveSheetPlace \| null` | Needs richer display model |
| `recallResults` | `RecallItem[] \| null` | `RecallItem[] \| null` | Already correct |
| `recallHasMore` | `boolean` | `boolean` | Already correct |

### Thread entry type extensions

```ts
// New entry types (added to ThreadEntry union)
| { id: string; role: 'assistant'; type: 'assistant'; message: string; dismissed?: boolean }
| { id: string; role: 'assistant'; type: 'recall'; data: RecallResponseData }
| { id: string; role: 'assistant'; type: 'save'; data: ExtractPlaceData }

// Updated existing clarification entry (add dismissed)
| { id: string; role: 'assistant'; type: 'clarification'; message: string; dismissed?: boolean }
```

### State transitions

```
openSaveSheet(message)
  → preSavePhase = current phase
  → saveSheetMessage = message
  → saveSheetStatus = 'pending'
  → phase = 'save-sheet'

confirmSave()
  → saveSheetStatus = 'saving'
  → [fetch]
    → status 'resolved': incrementSavedCount(place), saveSheetStatus = 'saving', phase = 'save-snackbar'
    → status 'duplicate': saveSheetStatus = 'duplicate', saveSheetOriginalSavedAt = ..., phase = 'save-duplicate'
    → error: saveSheetStatus = 'error', phase = 'save-sheet'

[snackbar auto-dismiss / dismissSaveSheet after snackbar]
  → phase = preSavePhase ?? pickRestingPhase()
  → preSavePhase = null

submitRecall(message)
  → recallQuery = message
  → recallResults = null
  → recallHasMore = false
  → recallBreadcrumb = false
  → phase = 'recall'
  → [start 600ms breadcrumb timer]
  → [fetch]
    → results land: recallResults = results, recallHasMore = has_more, recallBreadcrumb = false
    → timer fires before results: recallBreadcrumb = true

dismissAssistantReply()
  → find last assistant/clarification thread entry with dismissed !== true
  → set dismissed = true on that entry (map, no splice)
```

---

## 3. localStorage Schema

### `totoro.savedCount` — existing (integer string)
No change.

### `totoro.savedPlaces` — new (JSON array)
Written only on server `status: 'resolved'`. Read by `ColdStartOneToFour`.

```ts
// Schema: SavedPlaceStub[]
// Key: 'totoro.savedPlaces'
// Written: after confirmed save (status: 'resolved')
// Read: by saved-places-storage.ts getSavedPlaces()
// Max displayed in cold-1-4 list: last 4 entries (most recent first)
```

New functions in `saved-places-storage.ts`:
- `getSavedPlaces(): SavedPlaceStub[]`
- `appendSavedPlace(place: SavedPlaceStub): void`

### `totoro.savedCount` — existing, also incremented on save
`incrementSavedPlaceCount()` already exists. Called alongside `appendSavedPlace()`.

---

## 4. Zod Schemas — `apps/web/src/api/schemas/`

### `recall.schema.ts`
```ts
export const RecallItemSchema = z.object({
  place_id: z.string(),
  place_name: z.string(),
  address: z.string(),
  cuisine: z.string().nullable(),
  price_range: z.string().nullable(),
  source_url: z.string().nullable(),
  saved_at: z.string(),
  match_reason: z.string(),
  thumbnail_url: z.string().optional(),
});

export const RecallResponseDataSchema = z.object({
  results: z.array(RecallItemSchema),
  total: z.number(),
  has_more: z.boolean(),
});
```

### `save.schema.ts`
```ts
export const ExtractPlaceDataSchema = z.object({
  place_id: z.string().nullable(),
  place: z.object({
    place_name: z.string().nullable(),
    address: z.string().nullable(),
    cuisine: z.string().nullable(),
    price_range: z.string().nullable(),
    thumbnail_url: z.string().optional(),
  }),
  confidence: z.number(),
  status: z.enum(['resolved', 'unresolved', 'duplicate']),
  requires_confirmation: z.boolean(),
  source_url: z.string().nullable(),
  original_saved_at: z.string().optional(),
});
```

---

## 5. Illustration Registry — `apps/web/src/components/illustrations/registry.ts`

```ts
export type IllustrationId =
  | 'auth'
  | 'idle-welcoming'
  | 'raining'
  | 'encouraging'
  | 'excited'
  | 'knowing'
  | 'welcome-back'
  | 'listen'
  | 'empty'
  | 'add-place'
  | 'add-place-processing'
  | 'add-place-success';

export type AnimationClass =
  | 'anim-breathe'
  | 'anim-bob'
  | 'anim-float'
  | 'anim-nod'
  | 'anim-bounce'
  | 'anim-sway'
  | 'anim-sway-gentle'
  | 'anim-peek'
  | 'anim-none';

export interface IllustrationDefinition {
  id: IllustrationId;
  src: string;
  altKey: string;
  animation: AnimationClass;
  sourceRef?: string;
}
```

### SVG rename map

| Old filename | New filename | Registry id |
|-------------|-------------|-------------|
| `totoro-home-input.svg` | `totoro-idle-welcoming.svg` | `idle-welcoming` |
| `totoro-splash.svg` | `totoro-raining.svg` | `raining` |
| `totoro-success.svg` | `totoro-excited.svg` | `excited` |
| `totoro-place-detail.svg` | `totoro-encouraging.svg` | `encouraging` |
| `totoro-hover-peek.svg` | `totoro-knowing.svg` | `knowing` |
| `totoro-step-complete.svg` | `totoro-welcome-back.svg` | `welcome-back` |

### Orphaned SVGs to delete

`totoro-error.svg`, `totoro-processing.svg`, `totoro-result-card.svg`, `totoro-step-check.svg`, `totoro-step-evaluate.svg`, `totoro-step-listen.svg`, `totoro-step-move.svg`, `totoro-step-read.svg`

_(Verify no consumers via grep before deleting.)_
