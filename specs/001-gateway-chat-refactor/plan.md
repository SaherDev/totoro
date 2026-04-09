# Implementation Plan: Gateway Chat Refactor

**Branch**: `001-gateway-chat-refactor` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)

## Summary

Refactor NestJS into a pure gateway: replace four AI endpoint methods (consult, extract-place, recall + streaming) with a single `POST /v1/chat` forwarding call. Remove recommendation history storage. Drop Prisma and replace with TypeORM managing only users and user_settings. Delete docker-compose.yml.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 LTS  
**Primary Dependencies**: NestJS 11, `@nestjs/typeorm`, `typeorm`, `pg`, `@paralleldrive/cuid2`, `@nestjs/axios` (stays)  
**Storage**: PostgreSQL — TypeORM with `synchronize: true`, two entities (User, UserSettings)  
**Testing**: Jest (`pnpm nx test api`)  
**Target Platform**: Railway (NestJS service)  
**Project Type**: REST API gateway  
**Performance Goals**: 30s timeout for all AI service calls  
**Constraints**: TypeORM must match existing Prisma-created column names exactly (camelCase); see data-model.md  
**Scale/Scope**: Two TypeORM entities, one new NestJS module, four modules deleted

---

## Constitution Check

*Gate: Must pass before implementation begins. Violations below are all justified by documented spec Decision Changes.*

| Section | Check | Status | Notes |
|---------|-------|--------|-------|
| I — Two-Repo Boundary | NestJS does not call LLMs, embed, run vector search | ✅ PASS | Feature makes NestJS a *purer* gateway |
| II — Nx Boundaries | services/api imports only libs/shared | ✅ PASS | No boundary changes |
| III — ADRs as Constraints | ADR-005 (Prisma), ADR-015 (PrismaService), ADR-016 (AiServiceClient methods), ADR-026 (migration ownership) all superseded | ⚠️ JUSTIFIED | Spec "Decision Changes" documents all. **New ADRs must be written before code changes.** |
| IV — Config Rules | TypeORM uses `database.url` from YAML config | ✅ PASS | |
| V — DB Write Ownership | Removing recommendations from NestJS writes | ⚠️ JUSTIFIED | ADR-036 documents this change |
| VI — AI Service Contract | Three endpoints → one `/v1/chat` | ⚠️ JUSTIFIED | ADR-036 documents this change |
| VII — Frontend Standards | No frontend changes | ✅ PASS | |
| VIII — Code Standards | New files follow kebab-case, PascalCase, Dto suffix | ✅ PASS | |
| IX — Git & Commits | Conventional commits, feature branch off dev | ✅ PASS | |
| X — Required Skills | `nestjs-expert` invoked ✅ | ✅ PASS | |

**Gate result**: All violations are justified by spec. Proceed. New ADRs (ADR-035, ADR-036) are step 1.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-gateway-chat-refactor/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── chat-endpoint.md ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
ADDED
services/api/src/chat/
├── chat.controller.ts
├── chat.service.ts
├── chat.module.ts
└── dto/
    └── chat-request.dto.ts

services/api/src/database/
├── database.module.ts
└── entities/
    ├── user.entity.ts
    └── user-settings.entity.ts

totoro-config/bruno/chat.bru

MODIFIED
libs/shared/src/lib/types.ts            ← ADD ChatRequestDto, ChatResponseDto
libs/shared/src/index.ts                ← export new types
services/api/src/app/app.module.ts      ← swap modules
services/api/src/ai-service/ai-service-client.interface.ts  ← single chat() method
services/api/src/ai-service/ai-service.client.ts            ← single implementation
docs/decisions.md                       ← ADR-035, ADR-036
package.json (root)                     ← swap prisma → typeorm packages

DELETED
services/api/src/prisma/               (PrismaModule, PrismaService)
services/api/src/recommendations/      (RecommendationsModule, RecommendationsRepository)
services/api/src/consult/              (ConsultModule, ConsultController, ConsultService, dto/)
services/api/src/places/               (PlacesModule, PlacesController, PlacesService, dto/)
services/api/src/recall/               (RecallModule, RecallController, RecallService, dto/)
docker-compose.yml
prisma/schema.prisma → Recommendation model removed (file stays for migration history)
```

---

## Implementation Phases

### Phase A — ADRs (Constitution Gate) ✅ BLOCKING

Write new ADRs to `docs/decisions.md` before touching any code. Without these, any code change violates Section III.

**ADR-035**: TypeORM replaces Prisma in services/api
- Supersedes ADR-005 and ADR-015
- Rationale: Prisma added complexity for a service that manages only two tables. TypeORM with synchronize:true is sufficient.
- `synchronize: true` accepted at this stage; switch to explicit migrations if/when the team grows.

**ADR-036**: Single `/v1/chat` endpoint replaces three-endpoint AI contract
- Updates ADR-016 (AiServiceClient)
- Updates Constitution §I (NestJS responsibilities — remove "recommendations"), §V (DB write ownership — remove recommendations), §VI (AI service contract — one endpoint)
- Rationale: Intent classification belongs in the AI service, not NestJS. A single forwarding call with a discriminated response removes routing logic from the gateway entirely.

**Commit**: `docs(api): add ADR-035 TypeORM and ADR-036 unified chat endpoint`

---

### Phase B — Shared Types (libs/shared)

**Step B1**: Add to `libs/shared/src/lib/types.ts`:
```typescript
export interface ChatRequestDto {
  user_id: string;
  message: string;
  location?: { lat: number; lng: number };
}

export interface ChatResponseDto {
  type: 'extract-place' | 'consult' | 'recall' | 'assistant' | 'clarification' | 'error';
  message: string;
  data: Record<string, unknown> | null;
}
```

**Step B2**: Export from `libs/shared/src/index.ts`.

**Step B3**: Grep `apps/web/src` for imports of old AI types (`ConsultResponse`, `PlaceResult`, `PlaceSource`, `ConsultRequest`). If no imports found → delete old types from types.ts in this step. If imports found → keep old types and note as a follow-up task.

**Commit**: `feat(shared): add ChatRequestDto and ChatResponseDto types`

---

### Phase C — AiServiceClient Refactor

**Step C1**: Replace `ai-service-client.interface.ts`:
- Remove: `IAiServiceClient` with 4 methods, all payload/response interfaces (`AiConsultPayload`, `AiConsultResponse`, `AiExtractPlacePayload`, `AiExtractPlaceResponse`, `AiRecallPayload`, `AiRecallResponse`, `AiPlaceResult`, `AiReasoningStep`, `AiRecallPlace`)
- Keep: `AI_SERVICE_CLIENT` symbol (injection token)
- Add new interface:
  ```typescript
  export interface IAiServiceClient {
    chat(payload: ChatRequestDto): Promise<ChatResponseDto>;
  }
  ```
  (import `ChatRequestDto`, `ChatResponseDto` from `@totoro/shared`)

**Step C2**: Replace `ai-service.client.ts`:
- Remove all 4 method implementations
- Add single `chat()` method calling `POST /v1/chat` with 30s timeout

**Step C3**: `ai-service.module.ts` — no structural changes needed (still provides `AI_SERVICE_CLIENT`).

**Commit**: `refactor(api): reduce AiServiceClient to single chat() method`

---

### Phase D — New Chat Module

**Step D1**: Create `services/api/src/chat/dto/chat-request.dto.ts`:
```typescript
class LocationDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

export class ChatRequestBodyDto {
  @IsString() @IsNotEmpty() message: string;
  @IsOptional() @ValidateNested() @Type(() => LocationDto) location?: LocationDto;
}
```

**Step D2**: Create `services/api/src/chat/chat.service.ts`:
```typescript
@Injectable()
export class ChatService {
  constructor(@Inject(AI_SERVICE_CLIENT) private aiClient: IAiServiceClient) {}

  async chat(userId: string, dto: ChatRequestBodyDto): Promise<ChatResponseDto> {
    return this.aiClient.chat({ user_id: userId, message: dto.message, location: dto.location });
  }
}
```

**Step D3**: Create `services/api/src/chat/chat.controller.ts`:
```typescript
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @RequiresAi()
  async chat(@CurrentUser() userId: string, @Body() dto: ChatRequestBodyDto): Promise<ChatResponseDto> {
    return this.chatService.chat(userId, dto);
  }
}
```

**Step D4**: Create `services/api/src/chat/chat.module.ts` importing `AiServiceModule`.

**Commit**: `feat(api): add ChatModule with unified /chat endpoint`

---

### Phase E — Remove Old Domain Modules

**Step E1**: Inspect `services/api/src/webhooks/clerk.webhook.ts` for PrismaService usage. Identify all Prisma calls.

**Step E2**: If webhook uses Prisma to create/read users — migrate those calls temporarily to raw SQL via the TypeORM DataSource (`EntityManager`) or hold them until Phase F completes. **Do not delete PrismaModule until Phase F is done.**

**Step E3**: Remove `ConsultModule`, `PlacesModule`, `RecallModule`, `RecommendationsModule` from `app.module.ts` imports. Add `ChatModule`.

**Step E4**: Delete directories:
- `services/api/src/consult/`
- `services/api/src/places/`
- `services/api/src/recall/`
- `services/api/src/recommendations/`

**Step E5**: Run `pnpm nx build api` and resolve any import errors.

**Commit**: `refactor(api): remove consult, places, recall, recommendations modules`

---

### Phase F — Prisma Migration (Remove Recommendations Table)

**Prerequisite**: Prisma must still be installed.

**Step F1**: Delete the `Recommendation` model from `prisma/schema.prisma`.

**Step F2**: Run:
```bash
pnpm prisma migrate dev --name remove_recommendations_table
```

**Step F3**: Verify migration runs cleanly — `recommendations` table is dropped.

**Commit**: `chore(api): drop recommendations table via Prisma migration`

---

### Phase G — TypeORM Setup (Replace Prisma)

**Step G1**: Install packages:
```bash
pnpm add @nestjs/typeorm typeorm @paralleldrive/cuid2 --filter @totoro/api
```
(Note: `pg` may already be installed at root — verify before adding)

**Step G2**: Remove from root `package.json`:
- `prisma`
- `@prisma/client`

Run `pnpm install`.

**Step G3**: Create `services/api/src/database/entities/user.entity.ts` — see data-model.md for full TypeORM entity definition.

**Step G4**: Create `services/api/src/database/entities/user-settings.entity.ts` — see data-model.md.

**Step G5**: Create `services/api/src/database/database.module.ts`:
```typescript
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        entities: [UserEntity, UserSettingsEntity],
        synchronize: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
```

**Step G6**: Update `app.module.ts`:
- Remove: `PrismaModule` import
- Add: `DatabaseModule` import

**Step G7**: Update webhook controller to use TypeORM `UserEntity` repository instead of PrismaService (from finding in Step E1).

**Step G8**: Delete `services/api/src/prisma/` directory.

**Commit**: `feat(api): replace PrismaService with TypeORM DatabaseModule`

---

### Phase H — Cleanup

**Step H1**: Delete `docker-compose.yml` from repo root.

**Step H2**: Add `totoro-config/bruno/chat.bru` — see contracts/chat-endpoint.md for content.

**Step H3**: Remove any remaining `prisma` scripts from root `package.json` (e.g., `prisma:migrate`, `prisma:generate`).

**Step H4**: Check `services/api/config/.local.yaml` — remove any Prisma-related config keys if present.

**Commit**: `chore: delete docker-compose, add chat Bruno file, clean up Prisma references`

---

### Phase I — Verify

```bash
pnpm nx test api              # All tests pass, no Prisma references
pnpm nx run-many -t lint      # No lint errors
pnpm nx build api             # Clean build
```

Manual test via Bruno:
- Send `POST /api/v1/chat` with `message: "good ramen nearby"` → expect `ChatResponseDto` with `type: "consult"`
- Send `POST /api/v1/chat` with a TikTok URL → expect `type: "extract-place"`
- Send `POST /api/v1/chat` with `message: "that ramen place from TikTok"` → expect `type: "recall"`
- Confirm database: no rows written to any table after a chat request

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Superseding 4 ADRs simultaneously | All four are coupled — removing Prisma requires removing PrismaService, removing recommendations requires updating the AI contract | Could be split into separate features but increases coordination overhead and leaves the codebase in a half-migrated state longer |

---

## Artifacts Produced

| File | Purpose |
|------|---------|
| `research.md` | Technology decisions and risk analysis |
| `data-model.md` | TypeORM entity definitions and type contracts |
| `contracts/chat-endpoint.md` | NestJS /chat HTTP contract with Bruno file template |

**Next step**: `/speckit.tasks` to generate the task list for implementation.
