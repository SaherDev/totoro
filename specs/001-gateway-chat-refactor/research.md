# Research: Gateway Chat Refactor

**Feature**: 001-gateway-chat-refactor  
**Date**: 2026-04-09

---

## 1. TypeORM with NestJS 11 — Setup Pattern

**Decision**: Use `@nestjs/typeorm` v10+ with `TypeOrmModule.forRootAsync()` injecting `ConfigService` for the database URL. `synchronize: true` enabled as specified.

**Rationale**: `forRootAsync()` is the canonical NestJS pattern for async config; it lets the connection use `ConfigService` so `database.url` flows from YAML config (ADR-003). `synchronize: true` is appropriate at this stage — small team, no production data, and the user explicitly chose it.

**Alternatives considered**: `TypeOrmModule.forRoot()` (synchronous) — rejected because it hardcodes config instead of injecting it.

**Risk**: `synchronize: true` will attempt to ALTER or CREATE columns to match entity definitions on every startup. If entity definitions don't exactly mirror existing column names, TypeORM silently creates new columns or renames existing ones. Mitigation: entity definitions must use explicit `@Column({ name: '...' })` decorators to match Prisma-created column names precisely.

---

## 2. Column Name Alignment — Prisma → TypeORM

**Decision**: All TypeORM entity column decorators use explicit `name` parameter matching Prisma-created column names.

**Rationale**: Prisma stores column names in the database exactly as they appear in the schema (camelCase, no transformation). The actual PostgreSQL columns are:
- `users`: `id`, `email`, `createdAt`, `updatedAt`
- `user_settings`: `id`, `userId`, `locale`, `theme`, `createdAt`, `updatedAt`

TypeORM's `@CreateDateColumn()` and `@UpdateDateColumn()` default to `created_at` / `updated_at` (snake_case). Without explicit names, TypeORM with `synchronize: true` would try to create NEW columns (`created_at`) while leaving the old ones (`createdAt`) intact — a silent data integrity problem.

**Required decorators**:
```typescript
@CreateDateColumn({ name: 'createdAt' }) createdAt: Date
@UpdateDateColumn({ name: 'updatedAt' }) updatedAt: Date
@Column({ name: 'userId', unique: true }) userId: string
```

---

## 3. CUID Primary Key Generation

**Decision**: Use `@BeforeInsert()` lifecycle hook with `@paralleldrive/cuid2` to generate IDs, using `@PrimaryColumn()` (not `@PrimaryGeneratedColumn()`).

**Rationale**: Existing rows use CUID format (Prisma's `@default(cuid())`). `@PrimaryGeneratedColumn()` would switch to UUID or auto-increment, incompatible with existing data. `@PrimaryColumn()` with a `@BeforeInsert()` hook replicates Prisma's CUID generation without schema changes.

**Alternatives considered**: UUID via `@PrimaryGeneratedColumn('uuid')` — rejected because it breaks consistency with existing user IDs stored in Clerk and referenced across tables.

---

## 4. AiServiceClient Reduction — Single `chat()` Method

**Decision**: Replace the `IAiServiceClient` interface's four methods (`consult`, `consultStream`, `extractPlace`, `recall`) with a single `chat(payload: ChatRequestDto): Promise<ChatResponseDto>` method. Implementation calls `POST /v1/chat` with a 30-second timeout.

**Rationale**: The AI service now handles all intent classification internally. NestJS has no reason to know whether a message is a consult, recall, or extract-place — that is the AI service's concern. One method, one endpoint, one timeout.

**Timeout**: 30 seconds. The old consult timeout was 20s and extract-place was 10s. A unified endpoint may handle any intent type, so the conservative upper bound is used. This is configurable via YAML if needed.

**Alternatives considered**: Keeping separate methods but routing to a single AI endpoint — rejected because it adds routing logic to NestJS that doesn't belong there.

**Impact on SSE streaming**: `consultStream()` is removed. Streaming support is deferred — it can be added as a separate `chatStream()` method in a future ADR if the frontend requires it. The SSE note in ADR-009 remains valid for the future.

---

## 5. Shared Types Strategy — Additive, Not Destructive

**Decision**: ADD `ChatRequestDto` and `ChatResponseDto` to `libs/shared/types.ts`. Keep existing types (`ConsultResponse`, `PlaceResult`, etc.) in place — do not delete them in this feature.

**Rationale**: `apps/web/src/app/api/consult/route.ts` currently calls NestJS `/consult`. The file has a TODO saying it's disconnected from the frontend, but it still compiles as part of the workspace. If the old shared types are removed and the route file references them, the build breaks. Removing old types is a follow-up task after the consult route is updated or deleted.

**Verification**: `apps/web` does not appear to import `ConsultResponse` or `PlaceResult` directly in the checked files. If confirmed clean by grepping, old types CAN be removed. The plan marks this as a verification step before deletion.

---

## 6. Module Consolidation — Four Modules → One

**Decision**: Delete `ConsultModule`, `PlacesModule`, `RecallModule`, and `RecommendationsModule`. Replace with a single `ChatModule` containing `ChatController` and `ChatService`.

**Rationale**: All four modules served the same purpose: receive a user request, forward to AI, return the response. The only real differences were endpoint path and payload shape — both now unified. One module is cleaner and aligns with the "thin gateway" principle.

**ConsultService complexity (streaming)**: The current `ConsultService` has streaming logic (`handleStreaming`, `handleNonStreaming`, pipeline, SSE headers). All of this is removed. The new `ChatService` is a simple async method that calls `aiClient.chat()` and returns the result. Streaming is deferred.

---

## 7. Prisma Removal Sequence

**Decision**: Run the `remove_recommendations_table` migration BEFORE removing Prisma packages. Prisma must be present to generate and run the migration. After the migration is committed, Prisma is removed.

**Order**:
1. Delete `Recommendation` model from `prisma/schema.prisma`
2. Run `pnpm prisma migrate dev --name remove_recommendations_table`
3. Commit migration
4. Remove `prisma` and `@prisma/client` from root `package.json`
5. Remove `PrismaModule`, `PrismaService`, `prisma/` directory from `services/api`

**Rationale**: Reversing this order means the migration can't be generated (Prisma already removed). The migration record in `prisma/migrations/` is retained for history even after Prisma is removed as a package.

---

## 8. Webhook Handler — Prisma Usage Check

**Decision**: `ClerkWebhookController` at `services/api/src/webhooks/clerk.webhook.ts` must be checked for PrismaService usage. If it creates or reads users, it must be migrated to the TypeORM `UserEntity` repository.

**Finding**: This file exists but was not fully read. The plan includes an explicit step to inspect it and update any Prisma calls to TypeORM before removing PrismaModule.

---

## 9. Packages

**Add to root `package.json`**:
- `@nestjs/typeorm` — NestJS TypeORM integration
- `typeorm` — TypeORM core
- `pg` — PostgreSQL driver (TypeORM requires it; `@prisma/adapter-pg` was in root but for different purposes)
- `@paralleldrive/cuid2` — CUID generation (replaces Prisma's built-in)

**Remove from root `package.json`**:
- `prisma`
- `@prisma/client`

**Note**: `@nestjs/axios` stays — `AiServiceClient` still uses `HttpService` for the single `chat()` call.

---

## 10. New ADRs Required (Before Implementation)

Per Constitution Section III, implementation cannot begin until superseding ADRs are written.

| New ADR | Supersedes/Updates | Content |
|---------|-------------------|---------|
| ADR-035 | Supersedes ADR-005, ADR-015 | TypeORM replaces Prisma in services/api |
| ADR-036 | Updates ADR-016; updates Constitution §I, §V, §VI | Single /v1/chat endpoint; NestJS no longer writes recommendations |
