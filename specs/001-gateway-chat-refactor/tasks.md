# Tasks: Gateway Chat Refactor

**Input**: Design documents from `/specs/001-gateway-chat-refactor/`  
**Branch**: `001-gateway-chat-refactor`  
**Plan**: plan.md | **Spec**: spec.md | **Data model**: data-model.md | **Contract**: contracts/chat-endpoint.md

**Organization**: Tasks are grouped by user story. US1 (unified chat) is the critical path. US2 (no recommendation storage) and US3 (TypeORM) follow independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Package changes required before any code can be written or tested.

- [ ] T001 Add `@nestjs/typeorm`, `typeorm`, and `@paralleldrive/cuid2` to root `package.json` dependencies
- [ ] T002 Remove `prisma` and `@prisma/client` from root `package.json` dependencies (run `pnpm install` after both T001 and T002)
- [ ] T003 Verify `pg` PostgreSQL driver is present in root `package.json` (add if missing — TypeORM requires it)

**Checkpoint**: `pnpm install` completes with no errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: ADRs and shared type contracts that MUST exist before any code changes begin. Both are Constitution gates.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Write ADR-035 to `docs/decisions.md`: TypeORM replaces Prisma in services/api (supersedes ADR-005 and ADR-015 — include rationale: two-table service, synchronize:true acceptable at this stage)
- [ ] T005 Write ADR-036 to `docs/decisions.md`: Single `/v1/chat` endpoint replaces three-endpoint AI contract (updates ADR-016, updates Constitution §I removing "recommendations" from NestJS responsibilities, §V removing recommendations from NestJS DB writes, §VI replacing three endpoints with one)
- [ ] T006 Add `ChatRequestDto` interface to `libs/shared/src/lib/types.ts` (fields: `user_id: string`, `message: string`, `location?: { lat: number; lng: number }`)
- [ ] T007 Add `ChatResponseDto` interface to `libs/shared/src/lib/types.ts` (fields: `type` union, `message: string`, `data: Record<string, unknown> | null`)
- [ ] T008 Export `ChatRequestDto` and `ChatResponseDto` from `libs/shared/src/index.ts`
- [ ] T009 Grep `apps/web/src` for imports of old AI types (`ConsultResponse`, `PlaceResult`, `PlaceSource`, `ConsultRequest`, `SseEvent`). If none found: delete those types from `libs/shared/src/lib/types.ts`. If found: leave old types and open a follow-up note.

**Checkpoint**: `pnpm nx build api` and `pnpm nx build web` both compile cleanly with new types exported.

---

## Phase 3: User Story 1 — Unified Chat Interaction (Priority: P1) 🎯 MVP

**Goal**: All user input routes through a single `POST /api/v1/chat` endpoint. NestJS authenticates, injects `user_id`, forwards to AI service via `aiClient.chat()`, and returns `ChatResponseDto` as-is.

**Independent Test**: Send `POST /api/v1/chat` with a message and valid Clerk token via Bruno. Confirm the response body has `type`, `message`, and `data` fields. Repeat for consult, extract-place, and recall intent messages.

### AiServiceClient Refactor

- [ ] T010 [US1] Replace `IAiServiceClient` interface in `services/api/src/ai-service/ai-service-client.interface.ts`: remove all four old methods and payload/response types; add single `chat(payload: ChatRequestDto): Promise<ChatResponseDto>` method (import types from `@totoro/shared`); keep `AI_SERVICE_CLIENT` symbol
- [ ] T011 [US1] Replace `AiServiceClient` implementation in `services/api/src/ai-service/ai-service.client.ts`: remove `consult()`, `consultStream()`, `extractPlace()`, `recall()` methods; add `chat()` method calling `POST /v1/chat` via HttpService with 30s timeout; import `ChatRequestDto`, `ChatResponseDto` from `@totoro/shared`
- [ ] T012 [US1] Verify `services/api/src/ai-service/ai-service.module.ts` still compiles (no structural changes needed — it still provides `AI_SERVICE_CLIENT`)

### Chat Module

- [ ] T013 [US1] Create `services/api/src/chat/dto/chat-request.dto.ts` with `LocationDto` (lat, lng with `@IsNumber()`) and `ChatRequestBodyDto` (message with `@IsString() @IsNotEmpty()`, optional location with `@ValidateNested() @Type(() => LocationDto)`)
- [ ] T014 [US1] Create `services/api/src/chat/chat.service.ts`: inject `IAiServiceClient` via `@Inject(AI_SERVICE_CLIENT)`, single `chat(userId: string, dto: ChatRequestBodyDto): Promise<ChatResponseDto>` method that calls `aiClient.chat({ user_id: userId, message: dto.message, location: dto.location })`
- [ ] T015 [US1] Create `services/api/src/chat/chat.controller.ts`: `@Controller('chat')`, single `@Post() @RequiresAi()` method, `@CurrentUser()` for userId, `@Body()` for dto, returns `chatService.chat(userId, dto)` directly (ADR-032 facade pattern — one service call, no logic)
- [ ] T016 [US1] Create `services/api/src/chat/chat.module.ts`: imports `AiServiceModule`, declares `ChatController` and `ChatService`
- [ ] T017 [US1] Add `ChatModule` import to `services/api/src/app/app.module.ts`
- [ ] T018 [US1] Run `pnpm nx build api` and confirm `/chat` endpoint is reachable (fix any compile errors)

**Checkpoint**: Bruno `POST /api/v1/chat` with a test message returns a valid `ChatResponseDto` shape (even if AI service isn't running — verify NestJS routing and auth are wired correctly).

---

## Phase 4: User Story 2 — No Recommendation History Storage (Priority: P2)

**Goal**: NestJS stops writing to the database on AI responses. Recommendations module, repository, and table are completely removed. The old consult/places/recall endpoints no longer exist.

**Independent Test**: Send any chat request. Confirm zero rows are written to any database table. Confirm `POST /api/v1/consult`, `POST /api/v1/places/extract`, and `POST /api/v1/recall` return 404.

### Remove Old Modules

- [ ] T019 [US2] Inspect `services/api/src/webhooks/clerk.webhook.ts` for any `PrismaService` or `RecommendationsRepository` usage — record findings (needed before any module deletion)
- [ ] T020 [US2] Remove `RecommendationsModule`, `ConsultModule`, `PlacesModule`, `RecallModule` imports from `services/api/src/app/app.module.ts`
- [ ] T021 [P] [US2] Delete `services/api/src/consult/` directory entirely
- [ ] T022 [P] [US2] Delete `services/api/src/places/` directory entirely
- [ ] T023 [P] [US2] Delete `services/api/src/recall/` directory entirely
- [ ] T024 [P] [US2] Delete `services/api/src/recommendations/` directory entirely
- [ ] T025 [US2] Run `pnpm nx build api` — fix any remaining import errors referencing deleted modules

### Prisma Migration (Drop Recommendations Table)

- [X] T026 [US2] Delete the `Recommendation` model block from `prisma/schema.prisma` (lines 42–65 — the `model Recommendation` definition with all its fields and `@@map("recommendations")`)
- [X] T027 [US2] Run `pnpm prisma migrate dev --name remove_recommendations_table` — verify migration applies cleanly and `recommendations` table is dropped
- [X] T028 [US2] Confirm `prisma/migrations/` has new migration directory for `remove_recommendations_table`

**Checkpoint**: `pnpm nx build api` clean. `POST /api/v1/consult` returns 404. No rows written after any request.

---

## Phase 5: User Story 3 — Simplified Database Layer (Priority: P3)

**Goal**: Prisma is fully removed from services/api. TypeORM manages only users and user_settings. API starts cleanly with TypeORM, and all user CRUD continues to work.

**Independent Test**: Start the API with `pnpm nx serve api`. Confirm it connects to PostgreSQL via TypeORM. Create a user record and verify it appears in the `users` table. Confirm no Prisma-related files or imports remain in `services/api/`.

### TypeORM Entities

- [X] T029 [P] [US3] Create `services/api/src/database/entities/user.entity.ts`: `@Entity('users')`, `@PrimaryColumn({ type: 'varchar' }) id`, `@Column({ unique: true }) email`, `@CreateDateColumn({ name: 'createdAt' }) createdAt`, `@UpdateDateColumn({ name: 'updatedAt' }) updatedAt`, `@OneToOne` to UserSettingsEntity, `@BeforeInsert()` to generate CUID via `createId()` from `@paralleldrive/cuid2`
- [X] T030 [P] [US3] Create `services/api/src/database/entities/user-settings.entity.ts`: `@Entity('user_settings')`, `@PrimaryColumn({ type: 'varchar' }) id`, `@Column({ name: 'userId', unique: true }) userId`, `@OneToOne` + `@JoinColumn({ name: 'userId' })` back to UserEntity, `@Column({ default: 'en' }) locale`, `@Column({ default: 'system' }) theme`, `@CreateDateColumn({ name: 'createdAt' })`, `@UpdateDateColumn({ name: 'updatedAt' })`, `@BeforeInsert()` for CUID

### DatabaseModule

- [X] T031 [US3] Create `services/api/src/database/database.module.ts`: `@Global() @Module()`, `TypeOrmModule.forRootAsync()` with `ConfigService` injected, reads `database.url` from config, registers `[UserEntity, UserSettingsEntity]`, sets `synchronize: true`, exports `TypeOrmModule`
- [X] T032 [US3] Add `DatabaseModule` import to `services/api/src/app/app.module.ts` and remove `PrismaModule` import

### Webhook Migration (if needed from T019 finding)

- [X] T033 [US3] Update `services/api/src/webhooks/clerk.webhook.ts`: replace any `PrismaService` calls with `@InjectRepository(UserEntity)` repository calls from TypeORM (inject via `TypeOrmModule.forFeature([UserEntity])` in webhook module — or via DatabaseModule's global export)

### Remove Prisma

- [X] T034 [US3] Delete `services/api/src/prisma/` directory (PrismaModule and PrismaService)
- [X] T035 [US3] Run `pnpm nx build api` — confirm clean build with no Prisma imports
- [X] T036 [US3] Start `pnpm nx serve api` — confirm TypeORM connects, `synchronize: true` runs without schema errors, users and user_settings tables still intact

**Checkpoint**: API starts. TypeORM logs show connection established. No `@prisma/client` import anywhere in `services/api/src/`. User creation via webhook works.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup completing FR-013 (docker-compose removal), ADR-021 (Bruno file), and any lingering Prisma references.

- [X] T037 Delete `docker-compose.yml` from repository root (FR-013, SC-007)
- [X] T038 [P] Create `totoro-config/bruno/chat.bru` — see `contracts/chat-endpoint.md` for exact `.bru` file content (ADR-021)
- [X] T039 [P] Remove any `prisma` npm scripts from root `package.json` (e.g., `prisma:migrate`, `prisma:generate`, `prisma:studio` if present) — none found, no-op
- [X] T040 Run full verification: `pnpm nx test api` (all pass), `pnpm nx run-many -t lint` (no errors), `pnpm nx build api` (clean)
- [ ] T041 Manual Bruno verification: send chat requests for all three intent types (consult, extract-place, recall) and confirm `ChatResponseDto` shape returned with correct `type` field each time

**Checkpoint**: All success criteria SC-001 through SC-007 verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — critical path
- **Phase 4 (US2)**: Depends on Phase 2 — can begin after Phase 2, independently of Phase 3
- **Phase 5 (US3)**: Depends on Phase 4 (Prisma migration must run before Prisma is removed) — requires T028 complete
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P2)**: After Phase 2 — no dependency on US1 (old modules deleted independently of new chat module)
- **US3 (P3)**: After US2 — **must follow US2** because Prisma migration (T026–T028) must run while Prisma is still installed; TypeORM setup (T029–T034) begins only after migration is committed

### Within Each User Story

- AiServiceClient (T010–T012) before ChatModule (T013–T018) — service used by module
- Module deletion (T020–T024) before Prisma migration (T026–T028)
- TypeORM entities (T029–T030) before DatabaseModule (T031) — entities registered in module
- DatabaseModule (T031–T032) before webhook migration (T033) and Prisma deletion (T034)

---

## Parallel Opportunities

### Phase 1
T001, T002, T003 are sequentially dependent (T002 packages removal, then install — keep as written)

### Phase 2
T004 and T005 (ADRs) can run in parallel — different sections of docs/decisions.md  
T006, T007, T008 are sequential (add types, then export)  
T009 can run in parallel with T004/T005

### Phase 3 (US1)
T010–T012 (AiServiceClient refactor) in sequence  
T013–T016 (Chat module files) — T013 and T014 can run in parallel (different files); T015 and T016 after T014

### Phase 4 (US2)
T021, T022, T023, T024 (module deletions) can all run in parallel — different directories

### Phase 5 (US3)
T029 (UserEntity) and T030 (UserSettingsEntity) can run in parallel

### Phase 6 (Polish)
T037, T038, T039 can all run in parallel

---

## Parallel Example: Phase 4 Module Deletions

```
# All four deletions at once (different directories):
Task T021: Delete services/api/src/consult/
Task T022: Delete services/api/src/places/
Task T023: Delete services/api/src/recall/
Task T024: Delete services/api/src/recommendations/
```

---

## Implementation Strategy

### MVP (US1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T009)
3. Complete Phase 3: US1 unified chat endpoint (T010–T018)
4. **STOP AND VALIDATE**: Bruno test confirms `POST /api/v1/chat` works end-to-end
5. Old endpoints still exist but are irrelevant — can demo chat with new endpoint immediately

### Full Delivery (All User Stories)

1. Phase 1 + 2 → Foundation
2. Phase 3 → New `/chat` endpoint live
3. Phase 4 → Old endpoints removed, recommendations table dropped
4. Phase 5 → Prisma gone, TypeORM live
5. Phase 6 → docker-compose deleted, Bruno file added, all tests pass

---

## Task Count Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Phase 1: Setup | 3 | — |
| Phase 2: Foundational | 6 | — |
| Phase 3: US1 (Chat endpoint) | 9 | US1 |
| Phase 4: US2 (Remove recommendations) | 10 | US2 |
| Phase 5: US3 (TypeORM) | 8 | US3 |
| Phase 6: Polish | 5 | — |
| **Total** | **41** | |

---

## Notes

- T027 (`prisma migrate dev`) requires PostgreSQL to be running and reachable
- T033 (webhook migration) depends on T019 finding — if webhook doesn't use Prisma, T033 is a no-op
- T009 (grep + optionally delete old types) is the only task with a conditional outcome — document result before proceeding
- Commit after each phase to maintain clean rollback points
- US2 and US3 are sequential (US3 depends on US2's migration) — do not start T029 before T028 is committed
