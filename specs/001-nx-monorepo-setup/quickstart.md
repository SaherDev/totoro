# Developer Quickstart — Totoro Monorepo

**Updated**: 2026-03-08

## Prerequisites

- Node 20 LTS
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL with `vector` extension (for backend, needed later)

## First-Time Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd totoro

# 2. Set git comment character (required — ClickUp task IDs use #)
git config core.commentChar ";"

# 3. Install all dependencies (one command, covers all apps and libs)
pnpm install

# 4. Load secrets (from external totoro-config repo — ask a team member)
source scripts/env-setup.sh
```

## Running the Apps

```bash
# Frontend (Next.js) — http://localhost:4200
pnpm nx dev web

# Backend (NestJS) — http://localhost:3333/api/v1
pnpm nx serve api

# Both at once (two terminals, or use a process manager)
```

## Running Tests and Lint

```bash
# Lint everything (boundary violations appear here)
pnpm nx run-many -t lint

# Test everything
pnpm nx run-many -t test

# Lint + test only affected projects (faster in CI)
pnpm nx affected -t test,lint
```

## Working with Shared Libraries

### Adding a type to libs/shared

```typescript
// libs/shared/src/lib/types.ts — add your type here
export type YourType = { ... };

// libs/shared/src/index.ts — re-export it
export * from './lib/types.js';
```

Then import in any app:
```typescript
import { YourType } from '@totoro/shared';
```

### Adding a component to libs/ui

```typescript
// libs/ui/src/lib/your-component.tsx
export function YourComponent() { ... }

// libs/ui/src/index.ts — re-export it
export * from './lib/your-component.js';
```

Then import in the frontend only:
```typescript
import { YourComponent } from '@totoro/ui';
```

**Note**: `@totoro/ui` is only importable by `apps/web`. The backend (`services/api`) cannot import from it — the linter will catch this as an error.

## Module Boundary Reference

| Package | Can import from | Cannot import from |
|---------|----------------|-------------------|
| `apps/web` | `@totoro/shared`, `@totoro/ui` | `services/api` |
| `services/api` | `@totoro/shared` | `apps/web`, `@totoro/ui` |
| `libs/ui` | `@totoro/shared` | `apps/web`, `services/api` |
| `libs/shared` | Nothing | Everything |

Violations are reported as **lint errors** — run `pnpm nx run-many -t lint` to check.

## Configuration

Non-secret configuration lives in `config/dev.yml` (development) and `config/prod.yml` (production). Access via NestJS `ConfigService` — never read env vars directly in application code.

Secrets are shell-exported from `scripts/env-setup.sh`. No `.env` files.

## Commit Format

```
type(scope): description #TASK_ID

# Types: feat | fix | chore | docs | refactor | test
# Scopes: api | web | shared
# Example: feat(api): add Clerk auth middleware #abc123
```
