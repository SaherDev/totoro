# CLAUDE.md — Totoro Product Repo

**Rule: Keep this file under 150 lines. Move detailed standards to `.claude/rules/` files and reference them here.**

## Project Context

Totoro is an AI-native place decision engine. The AI IS the product — NestJS is supporting infrastructure. Users share places over time (free-text, URLs, descriptions), the system builds a taste model, and returns one confident recommendation from natural language intent.

This is the **product repo**: an Nx monorepo with a Next.js frontend (`apps/web`), NestJS backend (`services/api`), and shared TypeScript types (`libs/shared`). NestJS is a **thin gateway** — it authenticates, forwards AI requests, stores recommendation history, and serves user CRUD. All AI logic lives in a separate Python repo (`totoro-ai`, FastAPI) that acts as the **autonomous AI brain** — it writes places/embeddings/taste_model directly to PostgreSQL and has full control over the AI pipeline. See @docs/architecture.md for the full design and @docs/api-contract.md for the HTTP contract.

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
yarn nx dev web                # Next.js on http://localhost:4200
yarn nx serve api              # NestJS on http://localhost:3333/api/v1

# Testing
yarn nx test web               # Frontend tests (Jest + RTL)
yarn nx test api               # Backend tests (Jest)
yarn nx run-many -t test       # All tests

# Lint & Build
yarn nx lint web
yarn nx lint api
yarn nx run-many -t lint
yarn nx build web
yarn nx build api

# Database
yarn prisma migrate dev        # Run migrations
yarn prisma generate           # Regenerate client
yarn prisma studio             # Visual DB browser

# Nx utilities
yarn nx graph                  # Dependency graph
yarn nx affected -t test       # Test only affected projects
```

## Standards (details in @.claude/rules/standards.md)

- **Zero hardcoding** — config (YAML/env vars) or constants in `libs/shared` for everything
- **Linting** — Nx-generated ESLint configs only, no plugins, no inline disables without comments
- **Path aliases** — `@totoro/shared`, `@totoro/ui`; app-internal imports use relative paths
- **Naming** — files: `kebab-case.ts`, classes: `PascalCase`, DTOs: `PascalCase` + `Dto` suffix
- **Types** — shared types in `libs/shared`, Prisma-generated DB models, no type duplication

## Frontend (details in @.claude/rules/frontend.md and @.claude/rules/tailwind-patterns.md)

- Tailwind v3 + shadcn/ui (copied into `libs/ui`, not installed as dependency)
- CSS variables with raw HSL values, dark mode via `darkMode: 'class'` + `next-themes`
- RTL support for Hebrew — logical properties only (`ms`/`me`/`ps`/`pe`, never `ml`/`mr`/`pl`/`pr`)
- i18n via `next-intl` — URL routing `/en/` and `/he/`, all strings through translation functions

## Architecture (details in @.claude/rules/architecture.md)

- `apps/web` ↔ `services/api` via HTTP only; both import from `libs/shared`
- NestJS: authenticate, forward AI requests, store recommendation history, serve user CRUD — nothing else
- NestJS never touches Redis, LLMs, embeddings, vector search, or Google Places
- DB writes split by domain: NestJS writes users/settings/recommendations; FastAPI writes places/embeddings/taste_model
- Prisma owns all migrations; both services have write access to their own tables
- Non-secret config from YAML (`config/*.yml`); secrets shell-exported (no `.env` files)
- All NestJS routes use `/api/v1/` prefix

## Commit Conventions (details in @.claude/rules/git.md)

- Format: `type(scope): description #TASK_ID`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Scopes: `api`, `web`, `shared`

## Workflow

Before implementing, ask clarifying questions if the task has ambiguity (3 or fewer). If fully scoped, skip questions and execute.

Before touching code, answer:

1. **Which phase?** — Only build what the current phase requires.
2. **Crosses repo boundary?** — AI/ML logic → `totoro-ai`. UI/auth/CRUD → here.
3. **Existing pattern?** — Find a similar file and follow its conventions.
4. **What file(s) will change?** — Read them first.
5. **What could break?** — Identify side effects across the monorepo.
6. **Is this the simplest change?** — Do not over-engineer.

Then: Plan (if 3+ files) → Implement → Verify (`yarn nx affected -t test,lint`) → Report (5 lines max).

## Token Efficiency

- Plans go in chat, not in separate files.
- Do not repeat file contents back after creating or editing them.
- Do not explain code you just wrote unless asked.
- Do not list what you are about to do and then do it. Pick one: explain or execute.
- Keep commit messages to one line. Add a body only if the change is non-obvious.

## Deployment

Vercel (frontend), Railway (backend + AI service + PostgreSQL + Redis). Redis is FastAPI-only. Docker Compose for local dev only.
