# Nx Monorepo Scaffold — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize Nx workspace with Next.js frontend, NestJS backend, and shared TypeScript library — all building and serving cleanly.

**Architecture:** Integrated Nx monorepo with Yarn (node-modules linker). Nx generators scaffold apps and libs. Module boundary tags enforce import rules from CLAUDE.md.

**Tech Stack:** Nx, Next.js (App Router), NestJS, TypeScript, Yarn, Jest, ESLint

---

### Task 1: Initialize Nx Workspace

**Files:**
- Create: `package.json`
- Create: `nx.json`
- Create: `tsconfig.base.json`
- Create: `.yarnrc.yml`

**Step 1: Create .yarnrc.yml for node-modules linker**

Create `.yarnrc.yml` at repo root:

```yaml
nodeLinker: node-modules
enableTelemetry: false
```

**Step 2: Initialize package.json**

```bash
yarn init -y
```

Then edit `package.json` to set the name and workspaces:

```json
{
  "name": "@totoro/source",
  "version": "0.0.0",
  "private": true,
  "workspaces": ["apps/*", "libs/*"]
}
```

**Step 3: Add Nx and plugins**

```bash
yarn add -D nx @nx/next @nx/nest @nx/js @nx/eslint @nx/jest @nx/workspace typescript
```

**Step 4: Initialize Nx**

```bash
npx nx@latest init --nxCloud=skip --no-interactive
```

This creates `nx.json`. If it prompts, skip Nx Cloud.

**Step 5: Verify Nx is working**

```bash
yarn nx --version
```

Expected: Nx version number printed without errors.

**Step 6: Add Nx-specific entries to .gitignore**

Append to `.gitignore`:

```
# Nx
.nx
tmp
```

**Step 7: Commit**

```bash
git add package.json yarn.lock nx.json tsconfig.base.json .yarnrc.yml .gitignore
git commit -m "chore(shared): initialize Nx workspace with Yarn #86c8hbg3w"
```

---

### Task 2: Generate Next.js Frontend (apps/web)

**Files:**
- Create: `apps/web/` (entire directory via generator)

**Step 1: Generate the app**

```bash
yarn nx generate @nx/next:application web \
  --directory=apps/web \
  --style=css \
  --appDir=true \
  --e2eTestRunner=none \
  --unitTestRunner=jest \
  --linter=eslint \
  --tags="scope:web" \
  --no-interactive
```

**Step 2: Verify it builds**

```bash
yarn nx build web
```

Expected: Build succeeds.

**Step 3: Verify it serves**

```bash
yarn nx serve web &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:4200
kill %1
```

Expected: HTTP 200.

**Step 4: Verify tests pass**

```bash
yarn nx test web
```

Expected: All tests pass.

**Step 5: Verify lint passes**

```bash
yarn nx lint web
```

Expected: No errors.

**Step 6: Commit**

```bash
git add apps/web/ -A
git commit -m "feat(web): scaffold Next.js app with Nx generator #86c8hbg3w"
```

---

### Task 3: Generate NestJS Backend (apps/api)

**Files:**
- Create: `apps/api/` (entire directory via generator)
- Modify: `apps/api/src/main.ts` (add global prefix)

**Step 1: Generate the app**

```bash
yarn nx generate @nx/nest:application api \
  --directory=apps/api \
  --unitTestRunner=jest \
  --linter=eslint \
  --tags="scope:api" \
  --no-interactive
```

**Step 2: Set global API prefix**

Edit `apps/api/src/main.ts` — add `app.setGlobalPrefix('api/v1')` before `app.listen()`:

```typescript
app.setGlobalPrefix('api/v1');
```

**Step 3: Verify it builds**

```bash
yarn nx build api
```

Expected: Build succeeds.

**Step 4: Verify it serves**

```bash
yarn nx serve api &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1
kill %1
```

Expected: HTTP 200 (or 404 from NestJS, which is fine — the server is running).

**Step 5: Verify tests pass**

```bash
yarn nx test api
```

Expected: All tests pass.

**Step 6: Verify lint passes**

```bash
yarn nx lint api
```

Expected: No errors.

**Step 7: Commit**

```bash
git add apps/api/ -A
git commit -m "feat(api): scaffold NestJS app with /api/v1 prefix #86c8hbg3w"
```

---

### Task 4: Generate Shared Library (libs/shared)

**Files:**
- Create: `libs/shared/` (entire directory via generator)
- Verify: `tsconfig.base.json` has `@totoro/shared` path alias

**Step 1: Generate the library**

```bash
yarn nx generate @nx/js:library shared \
  --directory=libs/shared \
  --importPath=@totoro/shared \
  --bundler=tsc \
  --unitTestRunner=jest \
  --linter=eslint \
  --tags="scope:shared" \
  --no-interactive
```

**Step 2: Verify path alias was added**

Check `tsconfig.base.json` contains:

```json
"paths": {
  "@totoro/shared": ["libs/shared/src/index.ts"]
}
```

**Step 3: Verify it builds**

```bash
yarn nx build shared
```

Expected: Build succeeds.

**Step 4: Verify tests pass**

```bash
yarn nx test shared
```

Expected: All tests pass.

**Step 5: Verify lint passes**

```bash
yarn nx lint shared
```

Expected: No errors.

**Step 6: Commit**

```bash
git add libs/shared/ tsconfig.base.json -A
git commit -m "feat(shared): scaffold shared TypeScript library #86c8hbg3w"
```

---

### Task 5: Configure Module Boundary Rules

**Files:**
- Modify: Root ESLint config (`eslint.config.mjs` or `.eslintrc.json` — check which the generators created)

**Step 1: Add depConstraints to ESLint config**

Add the `@nx/enforce-module-boundaries` rule with these constraints:

```javascript
depConstraints: [
  {
    sourceTag: 'scope:shared',
    onlyDependOnLibsWithTags: ['scope:shared'],
  },
  {
    sourceTag: 'scope:web',
    onlyDependOnLibsWithTags: ['scope:shared', 'scope:ui'],
  },
  {
    sourceTag: 'scope:api',
    onlyDependOnLibsWithTags: ['scope:shared'],
  },
]
```

These enforce:
- `apps/web` can import from `libs/shared` (and later `libs/ui`), not `apps/api`
- `apps/api` can import from `libs/shared`, not `apps/web` or `libs/ui`
- `libs/shared` cannot import from apps

**Step 2: Verify boundary rules work**

```bash
yarn nx lint web
yarn nx lint api
yarn nx lint shared
```

Expected: All pass (no cross-boundary imports exist yet).

**Step 3: Commit**

```bash
git add eslint.config.mjs  # or .eslintrc.json — whichever exists
git commit -m "chore(shared): configure Nx module boundary rules #86c8hbg3w"
```

---

### Task 6: Verify Full Workspace

**Step 1: Run all builds**

```bash
yarn nx run-many -t build
```

Expected: All 3 projects build successfully.

**Step 2: Run all tests**

```bash
yarn nx run-many -t test
```

Expected: All tests pass.

**Step 3: Run all lints**

```bash
yarn nx run-many -t lint
```

Expected: No lint errors.

**Step 4: Verify dependency graph**

```bash
yarn nx graph --file=output.html
```

Expected: Graph shows `web` and `api` as apps, `shared` as a library. No output.html needed to keep — just verify the command runs.

**Step 5: Clean up and final commit**

Remove any generated artifacts (output.html) and commit the design doc + plan:

```bash
rm -f output.html
git add docs/plans/
git commit -m "docs(shared): add scaffold design and implementation plan #86c8hbg3w"
```
