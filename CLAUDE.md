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
messages/          → i18n translation files (en.json, he.json)
config/            → YAML configuration files (dev.yml, prod.yml, test.yml)
scripts/           → Shell scripts (env-setup.sh)
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
- **Architecture** — NestJS: authenticate, forward AI requests, store recommendation history, serve user CRUD — nothing else. NestJS never touches Redis, LLMs, embeddings, vector search, or Google Places. DB writes split: NestJS writes users/settings/recommendations; FastAPI writes places/embeddings/taste_model
- **Frontend** — Tailwind v3 + shadcn/ui, CSS variables with raw HSL, dark mode via `next-themes`, RTL logical properties only (`ms`/`me`/`ps`/`pe`), i18n via `next-intl` with URL routing `/en/` and `/he/`
- **API routes** — all NestJS routes use `/api/v1/` prefix; AI service called via two endpoints only (`POST /v1/extract-place`, `POST /v1/consult`)
- **Commits** — `type(scope): description #TASK_ID`, types: `feat|fix|chore|docs|refactor|test`, scopes: `api|web|shared` (details in @.claude/rules/git.md)

## Workflow

Before implementing, ask clarifying questions if the task has ambiguity (3 or fewer). If fully scoped, skip questions and execute.

Before touching code, answer:

1. **Crosses repo boundary?** — AI/ML logic → `totoro-ai`. UI/auth/CRUD → here.
2. **Existing pattern?** — Find a similar file and follow its conventions.
3. **Simplest change?** — Do not over-engineer.

Then: Plan (if 3+ files) → Implement → Verify (`pnpm nx affected -t test,lint`) → Completion report (5 lines max, flag any deviations from plan).

Token efficiency: plans go in chat, not files. Do not repeat file contents after editing. Do not explain code you just wrote unless asked. Pick one: explain or execute. Keep commit messages to one line unless non-obvious.

## Notes

- **Current config**: Non-secret config from YAML (`config/*.yml`); secrets shell-exported (no `.env` files). See `scripts/env-setup.sh` for the template.
- **Git comment char is `;`** not `#` — configured to support ClickUp task IDs in commits.
- **Bruno API testing**: Collection at `totoro-config/bruno/`. New endpoints need a corresponding `.bru` request file.
- **Prisma + pgvector**: PostgreSQL must have `vector` extension. Prisma uses `Unsupported("vector")` — handle vector ops via raw SQL.
- **Embedding dimensions must stay in sync**: pgvector column in Prisma must match the model output in FastAPI. Both repos must update together.
- **Deployment**: Vercel (frontend), Railway (backend + AI service + PostgreSQL + Redis). Redis is FastAPI-only. Docker Compose for local dev only.

## Active Technologies
- TypeScript 5.x / Node 20 LTS + Nx (ADR-001), pnpm (ADR-020), Next.js 16 (apps/web), NestJS 11 (services/api), Tailwind v3 + shadcn/ui (ADR-007) (001-nx-monorepo-setup)
- N/A — this is a workspace configuration feature (001-nx-monorepo-setup)

## Recent Changes
- 001-nx-monorepo-setup: Added TypeScript 5.x / Node 20 LTS + Nx (ADR-001), pnpm (ADR-020), Next.js 16 (apps/web), NestJS 11 (services/api), Tailwind v3 + shadcn/ui (ADR-007)
