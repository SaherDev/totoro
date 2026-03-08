# Research: Nx Monorepo Workspace Setup

**Date**: 2026-03-08
**Branch**: `001-nx-monorepo-setup`

## Findings

### Decision 1: Path Alias Strategy

**Decision**: Use pnpm workspace protocol (`workspace:*`) + package.json `exports` for cross-library imports. No tsconfig `paths` needed.

**Rationale**: The monorepo already uses this approach successfully. `services/api` imports `@totoro/shared` via `workspace:*` and it resolves both at type-check time (via `customConditions: ["@totoro/source"]` in `tsconfig.base.json`) and at runtime (via compiled `dist/`). This is cleaner than maintaining parallel `paths` mappings that can drift out of sync.

**How it works**:
1. `libs/shared/package.json` defines a conditional export: `"@totoro/source": "./src/index.ts"` — TypeScript sees source files during development
2. `tsconfig.base.json` sets `customConditions: ["@totoro/source"]` — compiler resolves the source entry
3. Consumers declare `"@totoro/shared": "workspace:*"` in their `package.json`
4. pnpm symlinks the lib into `node_modules/@totoro/shared` at install time

**Alternatives considered**: tsconfig `paths` (more fragile, requires per-consumer config), project references only (complex, build-order dependent for dev).

---

### Decision 2: Module Boundary Enforcement

**Decision**: Use `@nx/enforce-module-boundaries` ESLint rule with `scope:*` tags. Already configured in `eslint.config.mjs`.

**Rationale**: Already in place and correct. No changes needed to the boundary rules themselves. The four scopes match the constitution exactly.

**Existing configuration** (verified in `eslint.config.mjs`):

| Source tag | Allowed dependencies |
|------------|---------------------|
| `scope:shared` | `scope:shared` only |
| `scope:ui` | `scope:shared`, `scope:ui` |
| `scope:web` | `scope:shared`, `scope:ui` |
| `scope:api` | `scope:shared` only |

**Gap**: `libs/ui` does not exist yet. When created, it must include `"tags": ["scope:ui"]` in its `package.json` `nx` field — the linter rule will then apply automatically.

---

### Decision 3: libs/ui Package Structure

**Decision**: Mirror `libs/shared` package structure exactly — ESM package with conditional exports and `@totoro/source` custom condition.

**Rationale**: Consistency with the existing pattern; allows the same TypeScript resolution strategy. Both libs are consumed by `apps/web` during development; both need source-file resolution at type-check time.

**Package.json exports pattern**:
```json
{
  "exports": {
    ".": {
      "@totoro/source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

**Peer dependencies**: `clsx` and `tailwind-merge` are consumed by `libs/ui/src/lib/utils.ts`. They should be listed as dependencies in `libs/ui/package.json` (not just in `apps/web`), since `libs/ui` is the package that directly imports them.

---

### Decision 4: Tailwind Configuration Location

**Decision**: `tailwind.config.js` lives in `apps/web/`, not at the workspace root. `libs/ui` content paths are included in the `content` array.

**Rationale**: Tailwind is a frontend concern only. The backend (`services/api`) does not use Tailwind. Placing the config in `apps/web` keeps it scoped correctly. The `content` array must include `../../libs/ui/src/**/*.{ts,tsx}` to ensure Tailwind scans component classes in `libs/ui`.

**Alternatives considered**: Root-level Tailwind config (would apply to backend incorrectly); per-lib Tailwind config (redundant, no benefit).

---

### Decision 5: Existing Placeholder Cleanup

**Decision**: Remove the placeholder `shared()` function from `libs/shared/src/lib/shared.ts`. Replace with a real example type in a new `types.ts` file.

**Rationale**: The `shared()` function is an Nx generator artifact that serves no purpose. Keeping it adds noise and would require explaining to every new developer. A real type (`PlaceSource`) that is actually used in the product serves the same "verify wiring" purpose while also being immediately useful.

**What to create**: `export type PlaceSource = 'saved' | 'discovered'` — used in the consult API response (per `api-contract.md`).

---

## What Already Exists (No Work Needed)

| Item | File | Status |
|------|------|--------|
| pnpm workspaces | `pnpm-workspace.yaml` | ✅ Correct |
| Nx plugin config | `nx.json` | ✅ All plugins loaded |
| TypeScript base config | `tsconfig.base.json` | ✅ Correct (no paths needed) |
| Boundary enforcement ESLint rules | `eslint.config.mjs` | ✅ All 4 scopes configured |
| libs/shared package | `libs/shared/package.json` | ✅ Tagged, exports configured |
| libs/shared public entry | `libs/shared/src/index.ts` | ✅ Exists (needs cleanup) |
| API_GLOBAL_PREFIX constant | `libs/shared/src/lib/constants.ts` | ✅ In use by services/api |
| apps/web Nx tag | `apps/web/package.json` `nx.tags` | ✅ scope:web |
| services/api Nx tag | `services/api/package.json` `nx.tags` | ✅ scope:api |
| services/api imports @totoro/shared | `services/api/package.json` | ✅ workspace:* |

## What Is Missing (Must Be Created)

| Item | Location | Reason |
|------|----------|--------|
| `libs/ui` library | `libs/ui/` | Never created — needed for frontend components |
| `@totoro/shared` in web deps | `apps/web/package.json` | Web app doesn't declare the dependency yet |
| `@totoro/ui` in web deps | `apps/web/package.json` | Lib doesn't exist yet |
| Frontend deps (Tailwind, Clerk, etc.) | `apps/web/package.json` | Missing from scaffolded app |
| Tailwind config | `apps/web/tailwind.config.js` | Required for Tailwind to process classes |
| CSS variable definitions | `apps/web/src/app/globals.css` | Required for shadcn/ui token system |
| PlaceSource type (example) | `libs/shared/src/lib/types.ts` | Proves shared type pipeline; useful for product |
| YAML config directory | `config/dev.yml`, `config/prod.yml` | ADR-003 requirement |
| i18n messages | `messages/en.json`, `messages/he.json` | Frontend standards requirement |
| Boundary documentation | `docs/architecture.md` or `CLAUDE.md` | SC-006 requirement |
