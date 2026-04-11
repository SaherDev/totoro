# Research: Place Extraction API Infrastructure

**Branch**: `002-extract-place-api` | **Date**: 2026-03-25

---

## Decision 1: ValidationPipe Registration

**Decision:** Register `ValidationPipe` globally in `main.ts` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

**Rationale:** ADR-017 mandates this exact configuration. It's already an accepted architectural decision. No new research needed — just implement it.

**Alternatives considered:**
- Per-controller pipes: Rejected (inconsistent coverage, violates ADR-017)
- Per-endpoint pipes: Rejected (same reason)

---

## Decision 2: Exception Filter Structure

**Decision:** A single `@Catch()` filter class at `services/api/src/common/filters/all-exceptions.filter.ts` handles all exceptions. It is registered globally via `app.useGlobalFilters()` in `main.ts`.

**Rationale:** ADR-018 prescribes this exact location and registration approach. The filter catches `AxiosError` (from AI service calls) and generic `Error`. Error mapping rules are fixed:

| Trigger | Response |
|---|---|
| `AxiosError` with status 400 | 400 Bad Request (pass through) |
| `AxiosError` with status 422 | 422 with message "couldn't understand your request" |
| `AxiosError` with status 500 | 503 with message "service temporarily unavailable, please retry" |
| `AxiosError` with `code: 'ECONNABORTED'` or no response | 503 with message "service temporarily unavailable, please retry" |
| `HttpException` (NestJS built-in) | Pass through status and message |
| Any other `Error` | 500 Internal Server Error (no details leaked) |

**Alternatives considered:**
- Per-service error handling (`handleError` method in `ConsultService`): Already exists there but inconsistent with ADR-018. The new filter supersedes per-service error handling for AI service errors.
- `HttpException`-based approach in services: Rejected — tightly couples service logic to HTTP concerns.

---

## Decision 3: PlacesModule Structure

**Decision:** `PlacesModule` at `services/api/src/places/` containing:
- `places.module.ts` — imports `AiServiceModule`
- `places.controller.ts` — `@Controller('places')`, one method `@Post('extract')` calling service
- `places.service.ts` — one method `extractPlace()` calling `aiClient.extractPlace()`
- `dto/extract-place-request.dto.ts` — `raw_input: string` with `class-validator` decorators

**Rationale:** ADR-014 (one module per domain), ADR-032 (facade controller), ADR-033 (inject via `IAiServiceClient`). Mirrors exactly how `ConsultModule` is structured. Controller is a pure facade. Service makes one AI client call. No DB, no business logic.

**Alternatives considered:**
- Adding to `AppController`: Rejected — violates ADR-014 (one module per domain)
- Reusing `ConsultModule`: Rejected — different domain, different endpoint

---

## Decision 4: DTO Validation for `raw_input`

**Decision:** Use `class-validator` decorators:
- `@IsString()` — ensures the field is a string
- `@IsNotEmpty()` — rejects empty strings (satisfies FR-002)
- `@MaxLength(10240)` — enforces 10KB limit (satisfies FR-002a, ~10240 chars ≈ 10KB for ASCII)

**Rationale:** ADR-017 requires `class-validator` on all DTOs. The 10KB limit from spec FR-002a is implemented as `@MaxLength(10240)`. NestJS `ValidationPipe` with `transform: true` auto-validates on every request.

**Alternatives considered:**
- Custom pipe: Rejected — `class-validator` is sufficient and consistent with existing DTO patterns
- Byte-level size check: Deferred — `@MaxLength` checks character count, adequate for Phase 2 use case

---

## Decision 5: `extract-place` Stub Removal

**Decision:** Remove the `@Post('extract-place')` stub from `app.controller.ts`. The real endpoint lives at `POST /api/v1/places/extract` (controller prefix `places`, method prefix `extract`).

**Rationale:** The stub was a placeholder per the spec. The new `PlacesModule` with `@Controller('places')` + `@Post('extract')` creates the correct route. The stub's presence in `AppController` would create a conflicting route at `/extract-place`.

**Alternatives considered:**
- Keeping the stub: Rejected — creates route conflict and violates single responsibility
