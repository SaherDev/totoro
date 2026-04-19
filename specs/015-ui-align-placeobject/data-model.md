# Data Model: UI Alignment to PlaceObject Contract

All canonical types live in `libs/shared/src/lib/types.ts`. This document maps them to UI state and describes validation rules.

---

## Core Type: `PlaceObject`

The unified place shape. Three tiers — only Tier 1 is always present.

| Field         | Tier | Type                  | UI Rule                                             |
| ------------- | ---- | --------------------- | --------------------------------------------------- |
| `place_id`    | 1    | `string`              | React key                                           |
| `place_name`  | 1    | `string`              | Always shown; PlaceAvatar seed                      |
| `place_type`  | 1    | `PlaceType` enum      | Not shown in card (implicit from subcategory)       |
| `subcategory` | 1    | `string \| null`      | Shown in collapsed state                            |
| `tags`        | 1    | `string[]`            | Shown as chips in expanded state                    |
| `attributes`  | 1    | `PlaceAttributes`     | Cuisine/ambiance/dietary/good_for in expanded       |
| `source_url`  | 1    | `string \| null`      | Not shown in card                                   |
| `source`      | 1    | `PlaceSource \| null` | Not shown in card                                   |
| `provider_id` | 1    | `string \| null`      | Map button visibility gate; strip prefix before URL |
| `created_at`  | 1    | `string \| null`      | Shown only for duplicate status                     |
| `lat` / `lng` | 2    | `number \| null`      | Tier 2 gate: show address only when non-null        |
| `address`     | 2    | `string \| null`      | Shown in expanded when `geo_fresh \|\| lat != null` |
| `geo_fresh`   | 2    | `boolean`             | Tier 2 gate                                         |
| `hours`       | 3    | `PlaceHours \| null`  | Open-now summary in expanded when `enriched`        |
| `rating`      | 3    | `number \| null`      | Stars in expanded when `enriched`                   |
| `phone`       | 3    | `string \| null`      | Shown as `<a href="tel:…">` in expanded when `enriched` |
| `photo_url`   | 3    | `string \| null`      | Hero image; fallback to PlaceAvatar                 |
| `popularity`  | 3    | `float \| null`       | Popularity bar in expanded when `enriched`          |
| `enriched`    | 3    | `boolean`             | Tier 3 gate                                         |

---

## Zod Schema Hierarchy

```
PlaceObjectSchema          ← apps/web/src/lib/place-schema.ts
  └─ PlaceAttributesSchema
  └─ PlaceHoursSchema
  └─ PlaceLocationContextSchema

ConsultResponseDataSchema  ← apps/web/src/flows/consult/consult.schema.ts
  └─ ConsultResultSchema
      └─ PlaceObjectSchema

RecallResponseDataSchema   ← apps/web/src/flows/recall/index.tsx
  └─ RecallResultSchema
      └─ PlaceObjectSchema

ExtractPlaceDataSchema     ← apps/web/src/flows/save/save.schema.ts
  └─ ExtractPlaceItemSchema
      └─ PlaceObjectSchema.nullable()
```

All schemas use `satisfies z.ZodType<SharedType>` to stay in sync with `libs/shared`.

---

## Store State Additions

| Field                         | Type                 | Source                     | Consumed by                                                  |
| ----------------------------- | -------------------- | -------------------------- | ------------------------------------------------------------ |
| `signalTier`                  | `SignalTier \| null` | `GET /api/v1/user/context` | `pickRestingPhase`, `submit()` tier guard, home page routing |
| `chips`                       | `ChipItem[]`         | `GET /api/v1/user/context` | `ChipSelectionBoard`, `TasteChipsSidebar`                    |
| `savedPlacesCountFromContext` | `number \| null`     | `GET /api/v1/user/context` | `SavedProgressNudge`                                         |
| `saveSheetSourceUrl`          | `string \| null`     | `openSaveSheet()`          | `SaveResultBubble`                                           |

---

## `ExtractPlaceItem` Status State Machine

```
pending  →  (AI resolves)  →  saved | needs_review | duplicate | failed
needs_review  →  (user confirms)  →  saved (client-side only, no new API call)
```

| `status`       | `place`       | UI behaviour                                                            |
| -------------- | ------------- | ----------------------------------------------------------------------- |
| `saved`        | `PlaceObject` | PlaceCard + "Saved" badge; auto-saved on sheet mount                    |
| `needs_review` | `PlaceObject` | PlaceCard + ConfidencePill + "Confirm" button                           |
| `duplicate`    | `PlaceObject` | PlaceCard + "Duplicate" badge; `created_at` shown as original save date |
| `pending`      | `null`        | Excluded from card grid; counted in summary line                        |
| `failed`       | `null`        | Excluded from card grid; counted in summary line                        |

---

## `ChipItem` Lifecycle

| `status`                  | `selection_round` | UI                                                    |
| ------------------------- | ----------------- | ----------------------------------------------------- |
| `pending` (current round) | non-null          | Actionable 3-state toggle in ChipSelectionBoard       |
| `pending` (older round)   | non-null          | Read-only in "From before" section                    |
| `confirmed`               | non-null          | Read-only confirmed pill in sidebar and "From before" |
| `rejected`                | non-null          | Read-only rejected (strikethrough) pill               |

Actionable filter (from spec Decision 10):

```typescript
const currentRound = chips.find(c => c.status === "pending")?.selection_round;
const actionable = chips.filter(
  c => c.status === "pending" && c.selection_round === currentRound,
);
```

---

## `SignalTier` → Home Phase Mapping

| `signalTier`       | `pickRestingPhase` returns | Home empty-state component                              |
| ------------------ | -------------------------- | ------------------------------------------------------- |
| `'cold'`           | `'cold-0'`                 | `ColdStartZero` (with COLD_SUGGESTIONS)                 |
| `'chip_selection'` | `'chip-selection'`         | `ChipSelectionBoard`                                    |
| `'warming'`        | `'idle'`                   | `HomeIdle` + `TasteChipsSidebar` + `SavedProgressNudge` |
| `'active'`         | `'idle'`                   | `HomeIdle` + `TasteChipsSidebar`                        |
| `null` (fallback)  | count-based                | existing behaviour                                      |

---

## Signal Variants (POST /api/v1/signal)

Handled by `signal-client.ts` — three named methods map to three `signal_type` values:

| Method                                 | `signal_type`             | Additional fields                               |
| -------------------------------------- | ------------------------- | ----------------------------------------------- |
| `acceptRecommendation(recId, placeId)` | `recommendation_accepted` | `recommendation_id`, `place_id`                 |
| `rejectRecommendation(recId, placeId)` | `recommendation_rejected` | `recommendation_id`, `place_id`                 |
| `confirmChips(chips)`                  | `chip_confirm`            | `metadata.chips[]` (each with updated `status`) |

All three are fire-and-forget: 202 → resolve, 404 → `console.warn`, 5xx → log, network error → rethrow.
