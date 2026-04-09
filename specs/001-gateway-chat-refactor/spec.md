# Feature Specification: Gateway Chat Refactor

**Feature Branch**: `001-gateway-chat-refactor`  
**Created**: 2026-04-09  
**Status**: Draft  
**Input**: User description: "NestJS becoming a pure gateway. All AI endpoint calls replaced with a single POST /v1/chat call. Recommendations table removed from Prisma. Prisma dropped and replaced with TypeORM."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Unified Chat Interaction (Priority: P1)

A user sends any input through the Totoro interface — a place URL to save, a natural language recommendation query, or a memory recall fragment. The NestJS gateway authenticates the request, injects the user context, and forwards the message to the AI service through a single unified chat endpoint. The AI service returns a typed response indicating what kind of action occurred (save, recommendation, recall, etc.), which the frontend renders appropriately. The user never sees the routing logic.

**Why this priority**: Every user interaction depends on this path. If this is broken, nothing works. It is also the primary driver of the entire refactor — simplifying the gateway to one call.

**Independent Test**: Can be fully tested by sending save, consult, and recall inputs through the full stack and confirming that each returns a `ChatResponseDto` with the correct `type` field.

**Acceptance Scenarios**:

1. **Given** a user sends a TikTok URL as input, **When** NestJS forwards it to the AI service, **Then** the response has `type: "extract-place"` and the correct place data in `data`
2. **Given** a user sends a natural language query like "good ramen nearby", **When** NestJS forwards it, **Then** the response has `type: "consult"` with recommendations in `data`
3. **Given** a user sends a memory fragment like "that ramen place from TikTok", **When** NestJS forwards it, **Then** the response has `type: "recall"` with matched places in `data`
4. **Given** the AI service returns any `ChatResponseDto`, **When** NestJS passes it to the frontend, **Then** the shape is preserved exactly — no fields added or removed

---

### User Story 2 — No Recommendation History Storage (Priority: P2)

When a consult request completes, NestJS no longer writes a recommendation record to the database. The response is passed through to the frontend and the interaction ends. No database write occurs for AI responses.

**Why this priority**: This simplifies NestJS's role to a pure gateway. Removing this write responsibility removes a class of database bugs and the FK constraint between recommendations and users.

**Independent Test**: Can be fully tested by sending a consult request and confirming no records are written to any database table beyond what existed before the request.

**Acceptance Scenarios**:

1. **Given** a consult request is made, **When** the AI service responds, **Then** no recommendation record is inserted into the database
2. **Given** the recommendations table no longer exists, **When** the API processes any request, **Then** no errors occur and no code references the removed table

---

### User Story 3 — Simplified Database Layer (Priority: P3)

The database layer in NestJS manages exactly two tables: users and user_settings. All access goes through TypeORM entities. Prisma is completely removed from the service. The schema synchronises automatically from entity definitions.

**Why this priority**: This completes the gateway simplification by removing the ORM coupling to AI-adjacent tables. It is a clean-up step that reduces the surface area of the NestJS service.

**Independent Test**: Can be fully tested by starting the API service, confirming no Prisma references exist, and verifying that user creation and settings retrieval work via TypeORM.

**Acceptance Scenarios**:

1. **Given** Prisma is removed, **When** the API starts, **Then** it connects to the database successfully via TypeORM
2. **Given** a new user is created, **When** TypeORM persists it, **Then** the record appears in the users table with the correct fields
3. **Given** TypeORM synchronize:true is enabled, **When** the app starts, **Then** the users and user_settings tables match the entity definitions

---

### Edge Cases

- What happens if the AI service returns a `type` not in the known enum? The frontend must not crash — the response still passes through.
- What happens if the `data` field is `null` for an error response? The frontend must handle `null` gracefully.
- What happens if the AI service is unreachable? NestJS must return an appropriate 503 response as per ADR-018.
- When the AI service returns `type: "error"` in a healthy response, NestJS returns HTTP 200 — error handling is the frontend's responsibility via the `type` field. HTTP error codes (503, 400) are reserved for network/timeout failures only.
- What happens when TypeORM `synchronize:true` encounters a schema mismatch on startup? The app should fail with a clear error, not silently corrupt data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shared contract (libs/shared) MUST expose `ChatRequestDto` and `ChatResponseDto` as the only AI interaction types, replacing all previous AI request/response types
- **FR-002**: `ChatRequestDto` MUST contain `user_id` (string), `message` (string), and optional `location` (`{ lat: number; lng: number }`)
- **FR-003**: `ChatResponseDto` MUST contain `type` (one of: `extract-place`, `consult`, `recall`, `assistant`, `clarification`, `error`), `message` (string), and `data` (`Record<string, unknown> | null`)
- **FR-004**: The `AiServiceClient` interface MUST expose exactly one method: `chat(payload: ChatRequestDto): Promise<ChatResponseDto>` — all previous methods are removed
- **FR-005**: The concrete `AiServiceClient` implementation MUST call `POST /v1/chat` on the AI service
- **FR-006**: Every NestJS service method that previously called a separate AI endpoint MUST be replaced with a single call to `aiServiceClient.chat(payload)`
- **FR-007**: NestJS MUST still authenticate every request (Clerk) and inject `user_id` before forwarding to the AI service
- **FR-014**: The `/chat` endpoint MUST be decorated with `@RequiresAi()` — the global kill switch and per-user `ai_enabled` flag (ADR-022) apply to all chat requests
- **FR-008**: The Prisma `Recommendation` model MUST be removed from the schema, and a migration dropping the recommendations table (including all existing rows) MUST be generated and applied
- **FR-009**: Prisma MUST be completely removed from `services/api` — no Prisma client, no PrismaService, no Prisma imports
- **FR-010**: TypeORM MUST be installed and configured in `services/api` with `synchronize: true`
- **FR-011**: TypeORM MUST manage exactly two entities: User and UserSettings, corresponding to the existing `users` and `user_settings` tables
- **FR-012**: All existing user and user_settings CRUD behaviour MUST continue to function after the TypeORM migration
- **FR-013**: `docker-compose.yml` MUST be removed from the repository — local PostgreSQL is managed outside of Docker Compose

### Key Entities

- **ChatRequest**: A user's message forwarded to the AI service, plus their identity and optional location context
- **ChatResponse**: The AI service's typed reply — a discriminated union-style response that tells the frontend what happened and what data to render
- **User**: A person using Totoro, identified by Clerk user ID — managed by TypeORM in this service
- **UserSettings**: Per-user preferences — managed by TypeORM in this service

### Decision Changes

This feature supersedes or modifies the following ADRs:

- **ADR-005** (Prisma over TypeORM): Superseded. TypeORM replaces Prisma in `services/api`.
- **ADR-016** (AiServiceClient with multiple typed methods): Updated. AiServiceClient now exposes one method — `chat()`. The previous `extractPlace()`, `consult()`, and `recall()` methods are removed.
- **ADR-026** (Migration ownership split): Updated. Prisma no longer manages any tables. TypeORM with `synchronize:true` manages `users` and `user_settings`. No Prisma migrations are run after this feature.
- **ADR-015** (PrismaService as global singleton): Superseded. TypeORM's connection and entity management replaces PrismaService.
- **ADR-014** (One module per domain): `RecommendationsModule` is removed. `UsersModule` and `AiServiceModule` remain. Domain module count reduces to two.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three interaction intents (save, consult, recall) return valid `ChatResponseDto` responses when sent through the full stack — Next.js → NestJS → AI service
- **SC-002**: Zero recommendation records are written to the database after any request completes
- **SC-003**: All NestJS unit tests pass with no references to Prisma, PrismaService, or the old AI endpoint methods
- **SC-004**: The API service starts cleanly with TypeORM managing users and user_settings with no schema errors
- **SC-005**: All existing user CRUD operations (create, read, update) produce the same results before and after the TypeORM migration
- **SC-006**: The entire test suite (`pnpm nx test api`) and lint check (`pnpm nx run-many -t lint`) pass with zero errors
- **SC-007**: `docker-compose.yml` no longer exists in the repository root

## Clarifications

### Session 2026-04-09

- Q: How is PostgreSQL provisioned for CI and new developers after docker-compose is removed? → A: Already handled externally — just delete docker-compose.yml with no in-repo replacement needed.
- Q: When the AI service returns `type: "error"` in ChatResponseDto, does NestJS return HTTP 200 or translate to HTTP error? → A: HTTP 200 always — frontend reads the `type` field to handle errors.
- Q: Does existing recommendations table data need to be preserved before the table is dropped? → A: Delete permanently — no data worth preserving.
- Q: Should AiEnabledGuard (@RequiresAi()) still apply after all AI routes collapse into one /chat endpoint? → A: Yes — @RequiresAi() is applied to the /chat endpoint.

## Assumptions

- The AI service (`totoro-ai`) has already implemented `POST /v1/chat` and returns the `ChatResponseDto` shape before this feature is tested end-to-end
- The existing `users` and `user_settings` table structures remain unchanged — TypeORM entity definitions will mirror the columns already created by Prisma migrations
- `synchronize:true` is acceptable for this stage of the project (small team, controlled schema, no production data at risk) — it can be replaced with migrations in a future ADR if the team grows
- The frontend (`apps/web`) is not being changed in this feature — it calls NestJS endpoints as before; the chat unification is internal to the gateway layer
- Bruno `.bru` request files for the new `/chat` endpoint will be added as part of this feature (per ADR-021)
- PostgreSQL provisioning for local dev and CI is handled externally — `docker-compose.yml` is removed with no in-repo replacement
