# Git Conventions — Totoro Product Repo

## Branch Strategy

```
main          ← stable only, merge when a feature/phase is complete and tested
  └─ dev      ← active development, day-to-day work
       └─ <number>-<feature-name>               (spec-kit feature branch, e.g., 001-nx-monorepo-setup)
       └─ feature/<short-description>           (manual feature, e.g., feature/clerk-auth)
       └─ fix/<short-description>               (hotfix, e.g., fix/prisma-migration-order)
```

### Spec-kit Features

- Spec-kit auto-generates numbered branches: `001-feature-name`, `002-another-feature`, etc.
- These are created from `dev` and merged back into `dev` when the feature is complete.
- Numbered naming provides systematic tracking of multiple concurrent features in the monorepo.
- When a feature is fully tested, merge branch into `dev` (squash or merge commit, your call).
- Then merge `dev` into `main` at phase milestones (regular merge, not squash).

### Manual Features & Hotfixes

- Manual features use `feature/<short-description>` pattern.
- Hotfixes use `fix/<short-description>` pattern.
- Both are created from `dev` and merged back into `dev` following the same flow.
- Never push directly to `main`.
- Delete feature/fix branches after merge.

## Commit Message Format

```
type(scope): description #TASK_ID
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

**Scopes:** Target the primary affected Nx workspace package:
- `api` — NestJS backend (services/api)
- `web` — Next.js frontend (apps/web)
- `shared` — Shared types & utilities (libs/shared)
- `ui` — UI component library (libs/ui)
- For changes affecting multiple packages, prioritize the primary one

**Task ID:** ClickUp task ID (e.g., `#abc123`) — optional if no task exists

Examples:
```
feat(shared): add PlaceSource type
fix(web): correct redirect after sign-in #TASK-456
chore(api): update auth middleware
docs(ui): add Button component examples #TASK-789
refactor(shared): simplify DTO exports
```

### Rules

- One logical change per commit. Do not bundle unrelated changes.
- Write in imperative mood: "add feature" not "added feature".
- Keep the subject line under 72 characters.
- If the commit does not have a ClickUp task, omit the `#TASK_ID` — but this should be rare.

## Comment Character

Git uses `;` as the comment character (not `#`) to avoid conflicts with ClickUp task IDs.

```bash
git config --global core.commentChar ";"
```

Run this once per machine. Without it, commit messages containing `#` will be truncated.

## Merge Flow

1. Create a feature or fix branch from `dev`.
2. Work on the branch, commit with conventional format.
3. When complete, merge branch into `dev` (squash or merge commit, your call per branch).
4. Delete the source branch after merge.
5. When a milestone is ready, merge `dev` into `main` (regular merge, not squash).
