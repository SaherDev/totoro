# Coding Standards — Totoro Product Repo

## Zero Hardcoding

- Nothing is hardcoded. Every value that could change — URLs, ports, labels, limits, thresholds, feature flags, UI text — must come from config (YAML for non-secrets, env vars for secrets) or a constants file in `libs/shared`.
- Frontend UI strings, colors, and layout parameters are configurable — not buried in components.
- If you're about to type a literal value that isn't a boolean, 0, or 1, extract it to config or a named constant.

## Linting

- ESLint: use Nx-generated configs only. Do not add plugins or override generated rules.
- Never disable an ESLint rule inline without a comment explaining why.

## Path Aliases

- `@totoro/shared` → `libs/shared/src`
- `@totoro/ui` → `libs/ui/src`
- App-internal imports use relative paths

## Naming Patterns

- Files: `kebab-case.ts` (e.g., `place-recommendation.service.ts`)
- Classes: `PascalCase` (e.g., `PlaceRecommendationService`)
- Interfaces/Types: `PascalCase`, no `I` prefix (e.g., `PlaceResult`, not `IPlaceResult`)
- DTOs: `PascalCase` + `Dto` suffix (e.g., `CreatePlaceDto`)
- NestJS modules: one module per domain (e.g., `places/`, `recommendations/`)

## Type Conventions

- All shared types live in `libs/shared` — never duplicate types between apps
- API responses use shared DTOs; frontend consumes the same types
- Database models are Prisma-generated; do not manually define entity types

## Technical Notes

- **pgvector**: PostgreSQL must have the `vector` extension enabled. Prisma schema uses `Unsupported("vector")` until Prisma adds native support — handle vector operations via raw SQL.
- **Clerk middleware**: Runs in both Next.js middleware and NestJS guards. Auth state is verified independently in each app — do not pass raw tokens between apps; use Clerk's backend SDK to verify.
- **YAML config**: The `config/` directory is NOT for secrets. Pattern: `config/dev.yml` contains `ai_service.base_url` and similar non-secret settings. Load via NestJS `ConfigModule` with a custom YAML loader.
- **Free-text place input**: The frontend sends a raw string to the API. The API forwards it to totoro-ai for parsing. totoro-ai writes the place and embedding directly to PostgreSQL and returns a confirmation (place_id + metadata). This repo never parses place names, URLs, or extracts metadata — that is the AI repo's job.
- **totoro-ai returns 1+2**: One primary recommendation plus two alternatives. Each has: place name, address, reasoning text, source (saved vs discovered). Do not expect or depend on additional fields until they are added.
- **No .env files**: Secrets are shell-exported (`source scripts/env-setup.sh`). The `env-setup.sh` file is gitignored. Never create `.env` files.
- **git comment character**: This repo uses `;` as git's comment character (not `#`) to support ClickUp task IDs in commit messages. Run `git config --global core.commentChar ";"` once per machine.
