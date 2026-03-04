# Architecture Rules — Totoro Product Repo

## Nx Boundaries

| Source | Can import from | Cannot import from |
|--------|----------------|--------------------|
| `apps/web` | `libs/shared`, `libs/ui` | `apps/api` |
| `apps/api` | `libs/shared` | `apps/web`, `libs/ui` |
| `libs/ui` | `libs/shared` | `apps/web`, `apps/api` |
| `libs/shared` | (nothing) | `apps/web`, `apps/api`, `libs/ui` |

These boundaries are enforced by Nx module boundary rules. If you get a lint error about a cross-boundary import, do not suppress it — move the shared code into the appropriate lib. Note: `libs/ui` is frontend-only — `apps/api` must never import from it.

## Two-Repo Separation

| Concern | This repo (`totoro`) | AI repo (`totoro-ai`) |
|---------|---------------------|-----------------------|
| Language | TypeScript | Python |
| Runtime | Node 20 | Python 3.11+ |
| Responsibilities | UI, auth, CRUD, orchestration | Intent parsing, embeddings, ranking |
| Communication | Sends HTTP requests | Receives HTTP requests |

**Hard rule:** This repo never runs ML models, parses free-text place input, or calls embedding APIs directly. If you find yourself importing an NLP library or writing text extraction logic, stop — that belongs in `totoro-ai`.

## AI Service Communication

- All calls to `totoro-ai` originate from `apps/api` (NestJS services).
- `apps/web` never calls `totoro-ai` directly. The frontend talks to the NestJS API, which proxies to the AI service.
- The AI service base URL is loaded from YAML config (`config/*.yml` → `ai_service.base_url`), not from environment variables.
- See @docs/api-contract.md for endpoint definitions.

## Configuration Strategy

| What | Where | Example |
|------|-------|---------|
| Non-secret config | `config/*.yml` | `ai_service.base_url`, feature flags |
| Secrets | Shell-exported env vars | `DATABASE_URL`, `CLERK_SECRET_KEY` |
| Secret template | `scripts/env-setup.sh` | Placeholder exports, gitignored |
| Database schema | `prisma/schema.prisma` | Models, relations, vector columns |

Never put secrets in YAML files. Never put non-secret config in environment variables if it can go in YAML. Never use `.env` files — secrets are shell-exported via `source scripts/env-setup.sh`.

## API Versioning

All NestJS routes use the `/api/v1/` global prefix. Set via `app.setGlobalPrefix('api/v1')` in `main.ts`.

## Deployment

| Service | Platform | Tier |
|---------|----------|------|
| `apps/web` (Next.js) | Vercel | Free Hobby |
| `apps/api` (NestJS) | Railway | Hobby $5/mo |
| `totoro-ai` (FastAPI) | Railway | Hobby $5/mo |
| PostgreSQL + pgvector | Railway | Hobby $5/mo |
| Redis | Railway | Serverless |

Docker Compose is for local development only. Never deploy Docker containers to production.

## Coding Constraints

- **Prisma is the only database access layer.** No raw SQL except for pgvector operations that Prisma cannot express.
- **Clerk is the only auth provider.** Do not implement custom JWT verification or session management.
- **One NestJS module per domain.** Each business domain (places, recommendations, users) gets its own module with its own service and controller.
- **Shared types are the contract.** If both apps need a type, it goes in `libs/shared`. If only one app uses it, keep it local to that app.
- **No barrel exports from apps.** Only `libs/shared` exposes a public API via `index.ts`.
