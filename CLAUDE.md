# CLAUDE.md — Totoro Product Repo

**Rule: Keep this file under 150 lines. Move detailed standards to `.claude/rules/` files and reference them here.**

## Project Context

Totoro is an AI-native place decision engine. The AI IS the product — NestJS is supporting infrastructure. Users share places over time (free-text, URLs, descriptions), the system builds a taste model, and returns one confident recommendation from natural language intent. This is the **product repo**: an Nx monorepo with a Next.js frontend (`apps/web`), NestJS backend (`services/api`), and shared TypeScript types (`libs/shared`). NestJS is a **thin gateway** — it authenticates, forwards AI requests, stores recommendation history, and serves user CRUD. All AI logic lives in a separate Python repo (`totoro-ai`, FastAPI) that acts as the **autonomous AI brain**. See @docs/architecture.md for the full design and @docs/api-contract.md for the HTTP contract.

## Key Directories

```
apps/web/          → Next.js frontend (Tailwind v3, shadcn/ui, Clerk auth)
services/api/      → NestJS backend (Prisma, PostgreSQL + pgvector)
libs/shared/       → Shared TypeScript types, DTOs, constants
libs/ui/           → Design system (shadcn/ui components, cva variants, cn() utility)
apps/web/messages/ → i18n translation files (en.json, he.json)
config/            → YAML configuration files (dev.yml, prod.yml, test.yml)
scripts/           → Shell scripts (utilities)
prisma/            → Prisma schema and migrations
docs/              → Operational docs (architecture, API contract, decisions)
.claude/rules/     → Claude Code rules (git, architecture, frontend, standards)
```

## Common Commands

```bash
# Dev servers
pnpm nx dev web                # Next.js on http://localhost:4200
pnpm nx serve api              # NestJS on http://localhost:3333/api/v1

# Testing
pnpm nx test web               # Frontend tests (Jest + RTL)
pnpm nx test api               # Backend tests (Jest)
pnpm nx run-many -t test       # All tests

# Lint & Build
pnpm nx run-many -t lint
pnpm nx build web
pnpm nx build api

# Database
pnpm prisma migrate dev        # Run migrations
pnpm prisma generate           # Regenerate client

# Deployment: Vercel (frontend), Railway (backend + AI + PostgreSQL + Redis)
```

## Standards

Details in @.claude/rules/standards.md, @.claude/rules/architecture.md, @.claude/rules/frontend.md, and @.claude/rules/tailwind-patterns.md.

- **Zero hardcoding** — config (YAML/env vars) or constants in `libs/shared` for everything
- **Path aliases** — `@totoro/shared`, `@totoro/ui`; app-internal imports use relative paths
- **Naming** — files: `kebab-case.ts`, classes: `PascalCase`, DTOs: `PascalCase` + `Dto` suffix
- **Types** — shared types in `libs/shared`, Prisma-generated DB models, no type duplication
- **Linting** — Nx-generated ESLint configs only, no plugins, no inline disables without comments
- **Nx boundaries** — `apps/web` imports `libs/shared` + `libs/ui`; `services/api` imports `libs/shared` only; `libs/shared` imports nothing
- **Architecture** — NestJS: authenticate, forward AI requests, store recommendation history, serve user CRUD — nothing else. NestJS never touches Redis, LLMs, embeddings, vector search, or Google Places. DB writes split: NestJS writes users/settings/recommendations (Prisma owns their migrations); FastAPI writes places/embeddings/taste_model (Alembic owns their migrations)
- **Frontend** — Tailwind v3 + shadcn/ui, CSS variables with raw HSL, dark mode via `next-themes`, RTL logical properties only (`ms`/`me`/`ps`/`pe`), i18n via `next-intl` with URL routing `/en/` and `/he/`
- **API routes** — all NestJS routes use `/api/v1/` prefix; AI service called via three endpoints (`POST /v1/extract-place`, `POST /v1/consult`, `POST /v1/recall`)
- **Commits** — `type(scope): description`, types: `feat|fix|chore|docs|refactor|test`, scopes: `api|web|shared` (details in @.claude/rules/git.md)
- **Code quality** — single responsibility, constructor injection only, strategy pattern over if/switch on type, repository pattern for all DB access, no duplication (extract to `libs/shared`), new behavior = new class not an edit. Violations must be fixed before presenting code.

## Workflow

See `.claude/workflows.md` for the complete 5-step token-efficient workflow (ADR-028):

1. **Clarify** — If ambiguous (3+ unknowns), ask 5 questions. Record answers in chat.
2. **Plan** — If 3+ files or crosses repo boundary, create `docs/plans/YYYY-MM-DD-<feature>.md` with phases and checklist.
3. **Implement** — Follow plan checklist, write code, commit per `.claude/rules/git.md`.
4. **Verify** — Run verify commands from plan (`pnpm nx affected -t test,lint`), all must pass.
5. **Complete** — Mark task done. Update task status only.

**IMPORTANT: Read `docs/decisions.md` FIRST — before planning, before implementing, before any architectural discussion.** Every ADR is a binding constraint. If your approach contradicts a decision, stop and flag it. This is the first thing you do, not a later verification step.

**Constitution Check:** Verify plan aligns with `docs/decisions.md` (see `.claude/constitution.md`).

**Agent Skills Integration:** Skills (see ADR-031) auto-trigger based on code domain and workflow stage, not user prompt keywords. All skills follow the same principles as the codebase — if skill guidance conflicts with project standards (CLAUDE.md, architecture.md, ADR-\*), project standards take precedence. Skills are guides, not constraints.

**Model assignments and token costs:** See `.claude/workflows.md` (source of truth).

## Notes

- **Secrets management** (ADR-025): Each service manages secrets locally in a gitignored file. NestJS (`services/api`) uses `.env.local`. Next.js (`apps/web`) uses `.env.local`. FastAPI (`totoro-ai`) uses `config/.local.yaml`. Never commit secret files. Developers create these files manually and fill in values. CI/CD injects secrets as environment variables at deploy time.
- **Git comment char is `;`** not `#` — run `git config core.commentChar ";"` once per machine.
- **Bruno API testing**: Collection at `totoro-config/bruno/`. New endpoints need a corresponding `.bru` request file.
- **Prisma + pgvector**: PostgreSQL must have `vector` extension. Prisma uses `Unsupported("vector")` — handle vector ops via raw SQL.
- **Embedding dimensions must stay in sync**: pgvector column in Prisma must match the model output in FastAPI. Both repos must update together.
- **Deployment**: Vercel (frontend), Railway (backend + AI service + PostgreSQL + Redis). Redis is FastAPI-only. Docker Compose for local dev only.

## Active Technologies
- TypeScript 5.x / Node 20 LTS + Next.js 16, Tailwind v3, shadcn/ui, next-intl, next-themes, tailwindcss-animate (already installed), framer-motion (pending approval), next/font/google (001-migrate-lovable-design)
- N/A (frontend-only migration) (001-migrate-lovable-design)
- TypeScript 5.x, Node 20 LTS + Next.js 16, `@ai-sdk/react` + `ai` (to install), `@clerk/nextjs` v5, `FetchClient` (existing) (001-wire-consult-streaming)
- N/A — no DB changes (001-wire-consult-streaming)

- TypeScript 5.x / Node 20 LTS + Nx (ADR-001), pnpm (ADR-020), Next.js 16 (apps/web), NestJS 11 (services/api), Tailwind v3 + shadcn/ui (ADR-007) (001-nx-monorepo-setup)
- N/A — this is a workspace configuration feature (001-nx-monorepo-setup)

## Recent Changes

- 001-nx-monorepo-setup: Added TypeScript 5.x / Node 20 LTS + Nx (ADR-001), pnpm (ADR-020), Next.js 16 (apps/web), NestJS 11 (services/api), Tailwind v3 + shadcn/ui (ADR-007)
