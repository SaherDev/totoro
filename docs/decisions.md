# Architecture Decisions Log — Totoro

Log of architectural decisions. Add new entries at the top.

Format:
```
## ADR-NNN: Title
**Date:** YYYY-MM-DD
**Status:** accepted | superseded | deprecated
**Context:** Why this decision was needed.
**Decision:** What we decided.
**Consequences:** What follows from this decision.
```

---

## ADR-009: SSE streaming as future consult response mode
**Date:** 2026-03-05
**Status:** accepted
**Context:** The consult endpoint returns reasoning_steps in a synchronous JSON response. When the frontend needs to show agent thinking in real time, the API contract would need redesigning mid-build without a plan.
**Decision:** Document SSE as a future response mode now. When needed, FastAPI streams reasoning steps as they complete, NestJS proxies the SSE stream to the frontend. The synchronous mode remains the default. No implementation until the frontend requires it.
**Consequences:** API contract is forward-compatible. No work needed today. When SSE is implemented, NestJS must proxy the stream and the frontend must handle incremental rendering.

---

## ADR-008: reasoning_steps in consult response
**Date:** 2026-03-05
**Status:** accepted
**Context:** When a bad recommendation comes back, there is no way to tell if intent parsing failed, retrieval missed the right place, or ranking scored incorrectly. The eval pipeline also needs per-step accuracy measurement.
**Decision:** The consult response includes a `reasoning_steps` array. Each entry has a `step` identifier and a human-readable `summary` of what happened at that stage. totoro-ai produces it, this repo consumes and renders it.
**Consequences:** Frontend can display agent thinking steps. DTOs must include the new field. Both repos' API contract docs updated.

---

## ADR-007: Tailwind v3 + shadcn/ui over Tailwind v4

**Date:** 2026-03-04
**Decision:** Use Tailwind CSS v3 with shadcn/ui as the component foundation.
**Rationale:** shadcn/ui provides Dialog, Sheet, Toast, Skeleton, and Command out of the box — all required for Totoro's core UX: a sheet for the place details panel, a skeleton for streaming recommendation states, and a command palette style input for intent queries. shadcn is fully stable on Tailwind v3 today; since the project hasn't started implementation yet, picking the combination that works cleanly from day one avoids migration friction. shadcn components are copied into the repo (`libs/ui`), not installed as a dependency — the code is owned and understood, not just imported.
**Alternatives:** Tailwind v4 (newer but shadcn not fully stable on it yet), Radix primitives without shadcn (more manual styling work), Material UI (heavier, less customizable with Tailwind).
**Note:** The Tailwind patterns reference doc (`docs/tailwind-patterns.md`) was generated with v4 syntax and needs updating to v3 conventions before Phase 1 begins.

## ADR-006: Yarn over npm/pnpm

**Date:** 2026-03-04
**Decision:** Use Yarn with `nodeLinker: node-modules`.
**Rationale:** Better monorepo support with workspaces. The `node-modules` linker avoids PnP compatibility issues with Prisma and other native modules. Familiar tooling.
**Alternatives:** pnpm (good monorepo support but stricter), npm (weaker workspace features).

## ADR-005: Prisma over TypeORM

**Date:** 2026-03-04
**Decision:** Use Prisma as the ORM.
**Rationale:** Superior TypeScript type generation from schema. Cleaner migration workflow. Better developer experience with Prisma Studio. NestJS has first-class Prisma integration.
**Alternatives:** TypeORM (NestJS default), Drizzle, raw SQL.

## ADR-004: Clerk over custom auth

**Date:** 2026-03-04
**Decision:** Use Clerk for authentication in both Next.js and NestJS.
**Rationale:** Free tier covers 50K MAU. SDKs for both Next.js middleware and NestJS guards. Eliminates weeks of auth implementation. Focus development time on AI features instead.
**Alternatives:** NextAuth/Auth.js, Supabase Auth, custom JWT.

## ADR-003: YAML config over dotenv for non-secrets

**Date:** 2026-03-04
**Decision:** Use YAML files (`config/*.yml`) for non-secret configuration. Secrets remain in environment variables.
**Rationale:** YAML supports structured, nested config (e.g., `ai_service.base_url`) without the flat key-value limitation of `.env`. Config files are version-controlled and environment-specific (`dev.yml`, `prod.yml`). Secrets stay in env vars because they should never be committed.
**Alternatives:** dotenv for everything, JSON config files.

## ADR-002: Separate AI repo (totoro-ai)

**Date:** 2026-03-04
**Decision:** Keep all AI/ML code in a separate Python repository.
**Rationale:** Clean language separation (TypeScript vs Python). Different deployment targets (Node runtime vs Python runtime with GPU access). Different development velocity — AI experiments iterate faster without product repo CI. Communication via HTTP creates a stable contract boundary.
**Alternatives:** Python in a monorepo subfolder, AI logic as a microservice within this repo.

## ADR-001: Nx over Turborepo

**Date:** 2026-03-04
**Decision:** Use Nx as the monorepo tool.
**Rationale:** Nx provides built-in module boundary enforcement, dependency graph visualization, and first-class support for both Next.js and NestJS generators. Turborepo is faster for simple cases but lacks Nx's boundary lint rules, which are critical for maintaining the `apps/web` ↔ `apps/api` separation.
**Alternatives:** Turborepo, plain Yarn workspaces.
