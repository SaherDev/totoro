# Recall — Phase 1 Design Spec

**Date:** 2026-03-16
**Status:** approved
**Feature:** Recall — natural language search over a user's saved places
**Phase:** 1 of 3 (foundation: contract, stub, UI shell, i18n)

---

## What Is Recall

Recall lets users retrieve saved places using natural language memory fragments:
"that ramen place I saved from TikTok", "everything I saved in Bangkok", "the cafe with the good matcha".

Recall is distinct from Consult. Consult takes intent and returns one recommendation (including external discovery). Recall takes a fuzzy memory fragment and returns a list of matching saved places from the user's collection only — no external discovery, no ranking, no taste model.

---

## Phase 1 Scope

Phase 1 builds the foundation only. No real AI call is made. The goal is:

1. Document the API contract for `POST /v1/recall`
2. Add a NestJS stub endpoint — returns 501 until Phase 3
3. Add the Recall chip to the home empty state — no wiring
4. Build the recall states inside `AgentResponseBubble` — mock data only
5. Rename `totoro-saved-places.svg` → `totoro-empty.svg`, update all references
6. Add all Recall i18n keys — no hardcoded strings

---

## Repo Split

### totoro (product repo) — all code changes
### totoro-ai — docs only (api-contract.md + architecture.md)
### totoro-config — Bruno request file for the new NestJS endpoint

---

## API Contract: POST /v1/recall

Defined in `totoro/docs/api-contract.md` (source of truth). Mirrored to `totoro-ai/docs/api-contract.md`.

`user_id` is injected from the authenticated Clerk context in NestJS — it is NOT sent by the frontend and NOT a field in `RecallRequestDto`. NestJS resolves it from the auth token and adds it when forwarding to totoro-ai. The contract JSON shows the full payload NestJS sends to totoro-ai, not what the frontend sends.

**Request (NestJS → totoro-ai):**
```json
{
  "user_id": "string",
  "query": "that ramen place I saved from TikTok"
}
```

**Frontend → NestJS request body:**
```json
{
  "query": "that ramen place I saved from TikTok"
}
```

**Response:**
```json
{
  "results": [
    {
      "place_id": "string",
      "place_name": "Fuji Ramen",
      "address": "123 Sukhumvit Soi 33, Bangkok",
      "cuisine": "ramen",
      "price_range": "low",
      "source_url": "https://www.tiktok.com/@foodie/video/123",
      "match_reason": "Saved from TikTok, tagged ramen"
    }
  ],
  "total": 1
}
```

**NestJS stub behavior:** Returns HTTP 501 with `{ "message": "Not Implemented" }`. This is a plain string, not an i18n key.

**Error handling:** Follows the same table as consult/extract-place (400, 422, 500, timeout).

---

## NestJS Module: recall

New domain module at `services/api/src/recall/`:

- `recall.module.ts` — registers controller and service
- `recall.controller.ts` — `POST /recall` (global prefix gives `/api/v1/recall`), facade: one service call
- `recall.service.ts` — returns 501 stub; will forward to AiServiceClient in Phase 3
- `dto/recall-request.dto.ts` — `{ query: string }` (user_id injected from auth context)
- `dto/recall-response.dto.ts` — `{ results: RecallPlaceDto[], total: number }`
- `dto/recall-place.dto.ts` — per-place shape

Module registered in `app.module.ts`.

---

## UI: AgentResponseBubble — recall flow

`AgentFlow` type extended: `"recommend" | "add-place" | "recall"`.

Four recall states inside `AgentResponseBubble`:

| State | Trigger | Content |
|-------|---------|---------|
| **loading** | phase = "thinking", flow = "recall" | `TotoroStepRead` avatar + `t('recall.searching')` + `t('recall.takesAbout')` |
| **results** | phase = "result", flow = "recall" | Header with `TotoroResultCard` + `t('recall.foundTitle')` + list of mock `RecallPlaceItem`s |
| **empty** | phase = "result", flow = "recall", results = [] | `TotoroEmpty` avatar + `t('recall.noResults')` + `t('recall.noResultsDesc')` |
| **error** | phase = "error" | Same error state as existing flows (shared) |

Mock data: 2–3 recall results hardcoded, same pattern as `MOCK_RESULTS` in recommend flow.

`RecallPlaceItem` is a compact display inside the bubble: place name, address, match reason. Not a full `PlaceCard`.

---

## UI: HomeEmptyState — Simplified to 3 chips

The suggestion chips are trimmed from 5 to 3 — one per flow type. This gives the user one clear example of each capability:

| Chip text (i18n key) | Flow triggered |
|---|---|
| `home.suggestions.consult` — "Cheap dinner nearby" | `recommend` |
| `home.suggestions.save` — "Save this place link" | `add-place` |
| `home.suggestions.recall` — "Recall a saved place" | `recall` |

The chip is unwired in Phase 1 — clicking it sends the text through the chat input, which routes by intent detection already in place for `recommend` and `add-place`. Recall chip routing is Phase 3.

---

## SVG Rename

`public/illustrations/totoro-saved-places.svg` → `public/illustrations/totoro-empty.svg`

The illustration is now shared across features (saved places empty state, recall empty state, any future empty state). All references updated:

- `totoro-illustrations.tsx`: export renamed `TotoroSavedPlaces` → `TotoroEmpty`, src updated
- `apps/web/src/app/[locale]/(main)/places/page.tsx`: import updated

---

## i18n Keys

Added to `messages/en.json`. Mirrored to `messages/he.json`.

**`home.suggestions`** — replace all 5 existing chips with 3:
```json
"suggestions": {
  "consult": "Cheap dinner nearby",
  "save": "Save this place link",
  "recall": "Recall a saved place"
}
```

**`recall` namespace** — new:

```json
"recall": {
  "chip": "Recall a saved place",
  "searching": "Searching your saved places",
  "takesAbout": "Looking through your collection",
  "foundTitle": "Found in your saves",
  "foundSubtitle": "Places that match your memory",
  "noResults": "Nothing matched",
  "noResultsDesc": "Try describing it differently — a cuisine, city, or how you saved it",
  "error": "Couldn't search your places",
  "matchReason": "Why this matched"
}
```

---

## Out of Scope for Phase 1

- FastAPI `/v1/recall` implementation (Phase 3)
- Real vector search or embedding comparison (Phase 3)
- Wiring the Recall chip to actually call the API (Phase 3)
- Recall history storage in the `recommendations` table (Phase 3)
- Pagination of recall results (Phase 3+)

---

## Bruno

New file: `totoro-config/bruno/nestjs-api/recall.bru`
POST to `{{baseUrl}}/api/v1/recall` with `{ "query": "test memory fragment" }`.
Expected response in Phase 1: 501 Not Implemented.
