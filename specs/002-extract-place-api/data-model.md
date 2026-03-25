# Data Model: Place Extraction API Infrastructure

**Branch**: `002-extract-place-api` | **Date**: 2026-03-25

---

## Overview

This feature has no new database tables or Prisma schema changes. It introduces DTOs for HTTP contract validation and reuses the existing `AiExtractPlacePayload` / `AiExtractPlaceResponse` interfaces from `ai-service-client.interface.ts`.

---

## DTOs

### `ExtractPlaceRequestDto`

**Location**: `services/api/src/places/dto/extract-place-request.dto.ts`

**Purpose**: Validates the inbound HTTP request body before it reaches the service.

| Field | Type | Validation | Notes |
|---|---|---|---|
| `raw_input` | `string` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(10240)` | ~10KB limit per FR-002a |

**Validation behavior (via global ValidationPipe, ADR-017):**
- Missing `raw_input` → 400 Bad Request (FR-002)
- Empty string → 400 Bad Request (FR-002)
- Exceeds 10240 chars → 400 Bad Request (FR-002a)
- Extra fields stripped silently (whitelist mode)

---

## AI Service Contract (existing, no changes)

The `PlacesService` calls `aiClient.extractPlace()` with the following payload type from `ai-service-client.interface.ts`:

### `AiExtractPlacePayload` (existing)

| Field | Type | Source |
|---|---|---|
| `user_id` | `string` | Injected from Clerk auth via `@CurrentUser()` |
| `raw_input` | `string` | From validated `ExtractPlaceRequestDto` |

### `AiExtractPlaceResponse` (existing)

| Field | Type | Notes |
|---|---|---|
| `place_id` | `string \| null` | UUID of saved place, or null if not yet saved |
| `place` | `AiExtractedPlace` | Extracted place metadata |
| `place.place_name` | `string \| null` | Extracted name |
| `place.address` | `string \| null` | Extracted address |
| `place.cuisine` | `string \| null` | Nullable |
| `place.price_range` | `string \| null` | Nullable |
| `confidence` | `number` | 0–1 confidence score |
| `status` | `'resolved' \| 'unresolved'` | Resolution status |
| `requires_confirmation` | `boolean` | Whether user must confirm |
| `source_url` | `string \| null` | Original URL if provided |

The controller returns this response directly (pass-through facade).

---

## Error State Mapping

The `AllExceptionsFilter` handles all error translation. No error state is managed in the service or controller.

| Source | Condition | HTTP Response |
|---|---|---|
| `ValidationPipe` | Missing/invalid `raw_input` | 400 with validation message |
| `AxiosError` | AI service returns 400 | 400 (pass-through) |
| `AxiosError` | AI service returns 422 | 422 "couldn't understand your request" |
| `AxiosError` | AI service returns 500 | 503 "service temporarily unavailable, please retry" |
| `AxiosError` | No response / timeout | 503 "service temporarily unavailable, please retry" |
| Any other exception | — | 500 Internal Server Error |
