# Nx Monorepo Scaffold — Design

**Task:** Repo Setup (#86c8hbg3w)
**Date:** 2026-03-04
**Scope:** Repo 1 (product) only

## Goal

Initialize an Nx workspace so that `apps/web` (Next.js), `apps/api` (NestJS), and `libs/shared` all build and serve. No business logic, no extra dependencies beyond what Nx generators provide.

## Approach

Use Nx official generators to scaffold everything. This gives standard configs, working build/serve/test/lint targets, and module boundary enforcement out of the box.

## Steps

1. Create Nx workspace with `create-nx-workspace` (integrated monorepo, Yarn)
2. Generate `apps/web` with `@nx/next` generator
3. Generate `apps/api` with `@nx/nest` generator
4. Generate `libs/shared` with `@nx/js` generator
5. Configure path alias `@totoro/shared` in `tsconfig.base.json`
6. Set NestJS global prefix to `/api/v1/`
7. Add Nx module boundary tags to enforce architecture rules
8. Verify: all three projects build, serve, lint, and test

## Output Structure

```
totoro/
├── apps/
│   ├── web/          → Next.js (port 4200)
│   └── api/          → NestJS (port 3000, /api/v1/ prefix)
├── libs/
│   └── shared/       → TypeScript library
├── nx.json
├── tsconfig.base.json
├── package.json
└── yarn.lock
```

## Deferred

- Tailwind/shadcn/ui, Clerk, Prisma, next-intl, YAML config
- `libs/ui`, `config/`, `messages/`, `prisma/` directories
- Any business logic or endpoints
