# Totoro Constitution

## I. Two-Repo Boundary (NON-NEGOTIABLE)

NestJS is a thin gateway. The AI IS the product. Everything in this repo serves auth, forwarding, product data storage, and CRUD — nothing else.

NestJS has exactly four responsibilities:

1. Authenticate every request (Clerk)
2. Forward AI requests to totoro-ai with user context
3. Write product data to PostgreSQL (users, user_settings, recommendations)
4. Serve user CRUD

NestJS NEVER: calls LLMs, generates embeddings, runs vector search, calls Google Places API, writes place/embedding/taste_model records, or touches Redis. If a task requires any of these, it belongs in totoro-ai.

## II. Nx Module Boundaries (NON-NEGOTIABLE)

| Source         | Can import               | Cannot import              |
| -------------- | ------------------------ | -------------------------- |
| `apps/web`     | `libs/shared`, `libs/ui` | `services/api`             |
| `services/api` | `libs/shared`            | `apps/web`, `libs/ui`      |
| `libs/ui`      | `libs/shared`            | `apps/web`, `services/api` |
| `libs/shared`  | nothing                  | everything                 |

Cross-boundary imports are lint errors. Never suppress them — move the code to the right lib.

## III. Architecture Decisions Are Constraints

All ADRs in `docs/decisions.md` are accepted constraints, not suggestions. Before proposing any technical approach, check decisions.md. A new approach that contradicts an existing ADR requires a new superseding ADR first.

Current binding decisions:

- **ADR-001**: Nx (not Turborepo)
- **ADR-003**: YAML config for non-secrets, shell env vars for secrets, no `.env` files
- **ADR-004**: Clerk for auth everywhere
- **ADR-005**: Prisma as ORM and schema owner for all tables
- **ADR-007**: Tailwind v3 + shadcn/ui (not v4)
- **ADR-010**: `/api/v1/` global prefix via constant in `libs/shared`
- **ADR-012**: YAML ConfigModule, `ConfigService` for all config access
- **ADR-013**: `ClerkAuthGuard` global + `@Public()` opt-out
- **ADR-014**: One NestJS module per domain
- **ADR-015**: `PrismaService` as global singleton
- **ADR-016**: `AiServiceClient` for all forwarding to totoro-ai
- **ADR-017**: Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`
- **ADR-018**: Global `AllExceptionsFilter` for AI service error mapping
- **ADR-020**: pnpm as package manager
- **ADR-021**: Bruno for API testing — no Swagger, no `@ApiProperty()`
- **ADR-022**: `AiEnabledGuard` for per-user and global AI kill switch
- **ADR-023**: `@Serialize(DtoClass)` decorator for all controller responses

## IV. Configuration Rules

- Non-secret config → `config/dev.yml` / `config/prod.yml` / `config/test.yml`
- Secrets → shell-exported env vars via `source scripts/env-setup.sh`
- No `.env` files — ever
- Constants shared across apps → `libs/shared/src/lib/constants.ts`
- Nothing hardcoded: URLs, ports, thresholds, labels must come from config or a named constant

## V. Database Write Ownership

- NestJS writes: `users`, `user_settings`, `recommendations`
- FastAPI writes: `places`, `embeddings`, `taste_model`
- Prisma owns all migrations
- Embedding dimension in Prisma must stay in sync with FastAPI's model output

## VI. AI Service Contract

Two endpoints only, both in `AiServiceClient`:

- `POST /v1/extract-place` — 10s timeout
- `POST /v1/consult` — 20s timeout

Full schema in `docs/api-contract.md`. Response DTOs must tolerate extra fields (forward-compatible, `@IsOptional()` on all AI response fields).

## VII. Frontend Standards

- Tailwind v3 — semantic tokens only (`bg-primary`, not `bg-purple-600`)
- RTL logical properties only: `ms/me/ps/pe/start/end` — never `ml/mr/pl/pr/left/right`
- i18n via `next-intl` — no hardcoded user-facing strings in components
- Dark mode via `next-themes` + CSS variables in `globals.css`
- Shared UI components in `libs/ui` using `cva` + `cn()`

## VIII. Code Standards

- Files: `kebab-case.ts` | Classes: `PascalCase` | DTOs: `PascalCase` + `Dto` suffix
- Shared types in `libs/shared` — never duplicate between apps
- No barrel exports from apps — only `libs/shared` has a public `index.ts`
- No inline ESLint disables without a comment explaining why

## IX. Git & Commits

- Comment char is `;` not `#` (`git config core.commentChar ";"`)
- Format: `type(scope): description #TASK_ID`
- Types: `feat|fix|chore|docs|refactor|test` | Scopes: `api|web|shared`
- Feature branches from `dev`, merge to `dev`, milestone merges to `main`
- Never push directly to `main`
- New endpoints require a `.bru` file in `totoro-config/bruno/`

## Governance

This constitution supersedes ad-hoc decisions. New architectural choices require an ADR entry in `docs/decisions.md` before implementation. The constitution is updated when new ADRs are added.

**Version**: 1.0 | **Ratified**: 2026-03-08
