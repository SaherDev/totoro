# CLAUDE.md — Totoro Product Repo

## Project Context

Totoro is an AI-native place decision engine. The AI IS the product — NestJS is supporting infrastructure. Users share places over time (free-text, URLs, descriptions), the system builds a taste model, and returns one confident recommendation from natural language intent.

This is the **product repo**: an Nx monorepo with a Next.js frontend (`apps/web`), NestJS backend (`services/api`), and shared TypeScript types (`libs/shared`). NestJS is a **thin gateway + data owner** — it authenticates, forwards AI requests, writes data, and serves CRUD. All AI logic lives in a separate Python repo (`totoro-ai`, FastAPI) that acts as the **autonomous AI brain** with read-only database access and full control over the AI pipeline (LLMs, embeddings, vector search, Google Places, LangGraph agent, Redis caching). See @docs/architecture.md for the full design and @docs/api-contract.md for the HTTP contract.

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
.claude/rules/     → Claude Code rules (git, architecture, frontend)
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

## Standards

**Zero hardcoding:**

- Nothing is hardcoded. Every value that could change — URLs, ports, labels, limits, thresholds, feature flags, UI text — must come from config (YAML for non-secrets, env vars for secrets) or a constants file in `libs/shared`.
- Frontend UI strings, colors, and layout parameters are configurable — not buried in components.
- If you're about to type a literal value that isn't a boolean, 0, or 1, extract it to config or a named constant.

**Linting:**

- ESLint: use Nx-generated configs only. Do not add plugins or override generated rules.
- Never disable an ESLint rule inline without a comment explaining why.

**Path aliases:**

- `@totoro/shared` → `libs/shared/src`
- `@totoro/ui` → `libs/ui/src`
- App-internal imports use relative paths

**Naming patterns:**

- Files: `kebab-case.ts` (e.g., `place-recommendation.service.ts`)
- Classes: `PascalCase` (e.g., `PlaceRecommendationService`)
- Interfaces/Types: `PascalCase`, no `I` prefix (e.g., `PlaceResult`, not `IPlaceResult`)
- DTOs: `PascalCase` + `Dto` suffix (e.g., `CreatePlaceDto`)
- NestJS modules: one module per domain (e.g., `places/`, `recommendations/`)

**Type conventions:**

- All shared types live in `libs/shared` — never duplicate types between apps
- API responses use shared DTOs; frontend consumes the same types
- Database models are Prisma-generated; do not manually define entity types

**Frontend** (see @.claude/rules/frontend.md and @.claude/rules/tailwind-patterns.md):

- Tailwind v3 + shadcn/ui — components are copied into `libs/ui`, not installed as a dependency (ADR-007)
- shadcn components use `cva` for variants and `cn()` (`clsx` + `tailwind-merge`) for class merging
- CSS variables use raw HSL values (`262 80% 50%`) — Tailwind wraps with `hsl()` to support opacity modifiers
- Dark mode via `darkMode: 'class'` in `tailwind.config.js` + `next-themes` — semantic classes only, no raw Tailwind colors
- RTL support for Hebrew — logical properties only, no `ml`/`mr`/`left`/`right`
- i18n via `next-intl` — URL routing `/en/` and `/he/`, all strings through translation functions

**Architectural boundaries** (see @.claude/rules/architecture.md):

- `apps/web` never imports from `services/api` (communicate via HTTP only)
- `services/api` never imports from `apps/web`
- Both apps may import from `libs/shared`
- AI calls go through NestJS services only — frontend never calls totoro-ai directly
- NestJS does four things: authenticate (Clerk), forward AI requests, write data (Prisma), serve CRUD
- NestJS never calls LLMs, generates embeddings, runs vector search, or calls Google Places — that is totoro-ai's job
- NestJS does not touch Redis — Redis is FastAPI-only (LLM cache, session state, agent state)
- Database writes are NestJS-only; totoro-ai gets read-only access for vector search and retrieval
- Non-secret config loaded from YAML (`config/*.yml`), not environment variables
- Secrets (DB credentials, Clerk keys, API keys) use shell-exported environment variables — no `.env` files
- All NestJS routes use `/api/v1/` prefix

**Commit conventions** (see @.claude/rules/git.md):

- Format: `type(scope): description #TASK_ID`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- Scopes: `api`, `web`, `shared`

## Workflow

Before implementing, ask clarifying questions if the task has ambiguity. Do not assume. Keep questions to 3 or fewer. If the task is fully scoped with no ambiguity, skip questions and start executing.

Before touching code, answer six questions:

**Context checks:**

1. **Which phase?** — Only build what the current phase requires. Do not build ahead.
2. **Crosses repo boundary?** — If it touches AI/ML logic, it belongs in `totoro-ai`. If it touches UI/auth/CRUD, it belongs here.
3. **Existing pattern?** — Find a similar file or module and follow its conventions.

**File-level checks:** 4. **What file(s) will change?** — Read them first. 5. **What could break?** — Identify side effects across the monorepo. 6. **Is this the simplest change?** — Do not over-engineer.

Then follow this cycle:

1. **Plan** — If the task touches 3+ files or involves generators/scaffolding, write a plan in chat under 20 lines. For tasks touching 1–2 files, skip the plan and go straight to implementation.
2. **Implement** — Make the smallest change that works. One concern per commit.
3. **Verify** — Run `yarn nx affected -t test` and `yarn nx affected -t lint`. Fix failures before moving on.
4. **Completion report** — 5 lines or less. What changed, what was tested, any deviations from the plan.

**Token efficiency rules:**

- Plans go in chat, not in separate files.
- Do not repeat file contents back after creating or editing them.
- Do not explain code you just wrote unless asked.
- Do not list what you are about to do and then do it. Pick one: explain or execute.
- Keep commit messages to one line. Add a body only if the change is non-obvious.

## Notes

- **pgvector**: PostgreSQL must have the `vector` extension enabled. Prisma schema uses `Unsupported("vector")` until Prisma adds native support — handle vector operations via raw SQL.
- **Clerk middleware**: Runs in both Next.js middleware and NestJS guards. Auth state is verified independently in each app — do not pass raw tokens between apps; use Clerk's backend SDK to verify.
- **YAML config**: The `config/` directory is NOT for secrets. Pattern: `config/dev.yml` contains `ai_service.base_url` and similar non-secret settings. Load via NestJS `ConfigModule` with a custom YAML loader.
- **Free-text place input**: The frontend sends a raw string to the API. The API forwards it to totoro-ai for parsing. This repo never parses place names, URLs, or extracts metadata — that is the AI repo's job.
- **totoro-ai returns 1+2**: One primary recommendation plus two alternatives. Each has: place name, address, reasoning text, source (saved vs discovered). Do not expect or depend on additional fields until they are added.
- **No .env files**: Secrets are shell-exported (`source scripts/env-setup.sh`). The `env-setup.sh` file is gitignored. Never create `.env` files.
- **API versioning**: All NestJS routes are prefixed with `/api/v1/`. Set this as a global prefix in `main.ts`.
- **Deployment**: Vercel (frontend), Railway (backend + AI service + PostgreSQL + Redis). Redis is FastAPI-only. Docker Compose for local dev only.
- **git comment character**: This repo uses `;` as git's comment character (not `#`) to support ClickUp task IDs in commit messages. Run `git config --global core.commentChar ";"` once per machine.
