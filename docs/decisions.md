# Architecture Decisions Log — Totoro

Record decisions as they are made. Format: date, decision, rationale, alternatives considered.

---

## ADR-001: Nx over Turborepo

**Date:** 2026-03-04
**Decision:** Use Nx as the monorepo tool.
**Rationale:** Nx provides built-in module boundary enforcement, dependency graph visualization, and first-class support for both Next.js and NestJS generators. Turborepo is faster for simple cases but lacks Nx's boundary lint rules, which are critical for maintaining the `apps/web` ↔ `apps/api` separation.
**Alternatives:** Turborepo, plain Yarn workspaces.

## ADR-002: Separate AI repo (totoro-ai)

**Date:** 2026-03-04
**Decision:** Keep all AI/ML code in a separate Python repository.
**Rationale:** Clean language separation (TypeScript vs Python). Different deployment targets (Node runtime vs Python runtime with GPU access). Different development velocity — AI experiments iterate faster without product repo CI. Communication via HTTP creates a stable contract boundary.
**Alternatives:** Python in a monorepo subfolder, AI logic as a microservice within this repo.

## ADR-003: YAML config over dotenv for non-secrets

**Date:** 2026-03-04
**Decision:** Use YAML files (`config/*.yml`) for non-secret configuration. Secrets remain in environment variables.
**Rationale:** YAML supports structured, nested config (e.g., `ai_service.base_url`) without the flat key-value limitation of `.env`. Config files are version-controlled and environment-specific (`dev.yml`, `prod.yml`). Secrets stay in env vars because they should never be committed.
**Alternatives:** dotenv for everything, JSON config files.

## ADR-004: Clerk over custom auth

**Date:** 2026-03-04
**Decision:** Use Clerk for authentication in both Next.js and NestJS.
**Rationale:** Free tier covers 50K MAU. SDKs for both Next.js middleware and NestJS guards. Eliminates weeks of auth implementation. Focus development time on AI features instead.
**Alternatives:** NextAuth/Auth.js, Supabase Auth, custom JWT.

## ADR-005: Prisma over TypeORM

**Date:** 2026-03-04
**Decision:** Use Prisma as the ORM.
**Rationale:** Superior TypeScript type generation from schema. Cleaner migration workflow. Better developer experience with Prisma Studio. NestJS has first-class Prisma integration.
**Alternatives:** TypeORM (NestJS default), Drizzle, raw SQL.

## ADR-006: Yarn over npm/pnpm

**Date:** 2026-03-04
**Decision:** Use Yarn with `nodeLinker: node-modules`.
**Rationale:** Better monorepo support with workspaces. The `node-modules` linker avoids PnP compatibility issues with Prisma and other native modules. Familiar tooling.
**Alternatives:** pnpm (good monorepo support but stricter), npm (weaker workspace features).
