# Git Conventions — Totoro Product Repo

## Branch Strategy

```
main          ← stable only, merge when a feature/phase is complete and tested
  └─ dev      ← active development, day-to-day work
       └─ feature/<phase>-<short-description>   (e.g., feature/p1-clerk-auth)
       └─ fix/<short-description>                (e.g., fix/prisma-migration-order)
```

- Feature branches are created from `dev` and merged back into `dev`.
- `dev` is merged into `main` only at phase milestones or when a feature is fully tested.
- Never push directly to `main`.
- Delete feature/fix branches after merge.

## Commit Message Format

```
type(scope): description #TASK_ID
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
**Scopes:** `api`, `web`, `shared`
**Task ID:** ClickUp task ID (e.g., `#abc123`)

Examples:
```
feat(api): add Clerk auth middleware #abc123
fix(web): correct redirect after sign-in #def456
chore(shared): update place result DTO #ghi789
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
