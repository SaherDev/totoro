# Architecture Decisions Log — Totoro

Log of architectural decisions. Add new entries at the top.

Format:

```
## ADR-NNN: Title
**Date:** YYYY-MM-DD\
**Status:** accepted | superseded | deprecated\
**Context:** Why this decision was needed.\
**Decision:** What we decided.\
**Consequences:** What follows from this decision.
```

---

## ADR-031: Interfaces implemented only via classes, never via factory functions

**Date:** 2026-03-11\
**Status:** accepted\
**Context:** When defining injectable abstractions (like HttpClient), there are two patterns: factory functions that return objects, or classes that implement the interface. Factory functions are lighter but obscure the shape of what's being created. Classes are more explicit and composable.\
**Decision:** All interfaces in the codebase are implemented via classes that explicitly implement the interface (e.g., `class FetchClient implements HttpClient`). Never use factory functions to return objects that satisfy an interface. This makes the type visible in code and enables constructor-based dependency injection.\
**Consequences:** Every transport is a class. Every service is a class. Dependency injection (both manual and framework-based like NestJS) works the same way everywhere. Code is more discoverable — developers see the concrete type, not a factory.

---

## ADR-029: Injected HTTP client transport for apps/web

**Date:** 2026-03-11\
**Status:** accepted\
**Context:** Fetch calls are written inline inside Server Components and Server Actions, making it hard to swap the HTTP client, reuse calls, or change the base URL in one place. Testing and future transport swaps (axios, GraphQL) require tight coupling to a specific implementation.\
**Decision:** Create an API client layer at `apps/web/src/api/` with an injectable `HttpClient` interface. Each transport (fetch, axios, GraphQL) implements this interface as a class (`FetchClient implements HttpClient`). Nothing outside `apps/web/src/api/` imports fetch, axios, or any HTTP library directly.

Four layers:
1. **HttpClient interface** (`types.ts`) — defines `get<T>` and `post<T>`
2. **FetchClient class** (`transports/fetch.transport.ts`) — implements HttpClient using fetch
3. **getApiClient()** (`server.ts`) — creates FetchClient with Clerk server token (`auth()`)
4. **API functions** (`apis/*.api.ts`) — typed, domain-specific server actions (`'use server'`). Each function calls `getApiClient()` internally. Components import and call these directly.

Components never import HttpClient, FetchClient, or getApiClient. They just call `consult(query)` or `extractPlace(input)` and get typed data back. Works identically in Server Components (`await` in render) and Client Components (`await` in event handler).

Structure:
```
apps/web/src/api/
  types.ts              — HttpClient interface (get, post)
  transports/
    fetch.transport.ts  — FetchClient class implementing HttpClient
  server.ts             — getApiClient() using Clerk server SDK
  apis/
    consult.api.ts      — 'use server', exports consult()
    places.api.ts       — 'use server', exports extractPlace()
```

No separate Server Action wrappers needed — the API functions ARE server actions. No `useApiClient()` hook needed — server actions work from Client Components via Next.js. The hook is only added later if client-side streaming (SSE) is needed.

See `docs/examples/consult-example.ts` for the full flow.

**Consequences:** Swapping transports requires changing one class. Components stay thin — one function call, typed response. No DI library needed for the frontend. Request/response types come from `@totoro/shared` when implemented.

---

## ADR-026: Database migration ownership split between Prisma and Alembic

**Date:** 2026-03-09\
**Status:** accepted\
**Context:** Two services write to one shared PostgreSQL instance. Giving Prisma sole ownership of all migrations would require opening the product repo every time FastAPI evolves its AI table schemas. Two separate databases would force HTTP calls or data duplication mid-pipeline, adding latency to the consult agent.\
**Decision:** Split migration ownership by domain. Prisma in the product repo owns and migrates users, user_settings, and recommendations. Alembic in the AI repo owns and migrates places, embeddings, and taste_model. Each tool touches only its own tables. No exceptions.\
**Consequences:** Two migration tools in the system. Accepted because each repo stays autonomous within its domain. Schema changes to AI tables never require opening the product repo and vice versa.

---

## ADR-025: Per-repo local secrets (NestJS and Next.js use .env.local, FastAPI uses config/.local.yaml)

**Date:** 2026-03-09\
**Status:** accepted\
**Context:** Secrets must never be stored in version control. Each service needs a simple way to manage its own secrets without external dependencies or complex setup.\
**Decision:** Each service manages secrets locally in a gitignored file: (1) **NestJS** (totoro/services/api) reads secrets from `.env.local`; (2) **Next.js** (totoro/apps/web) reads secrets from `.env.local`; (3) **FastAPI** (totoro-ai) reads secrets from `config/.local.yaml`. All three files are gitignored and never committed. Developers create these files manually and populate them with their own secret values. No template files, no shell scripts, no other files needed.\
**Consequences:** Each service owns its secrets. No shared dependency files. Simple setup — developers create the file and fill in values. CI/CD injects secrets as environment variables at deploy time.

---

## ADR-028: 5-Step Token-Efficient Workflow (Clarify → Plan → Implement → Verify → Complete)

**Date:** 2026-03-09\
**Status:** accepted\
**Context:** Previous workflow was unclear about when to use agents, causing token waste through unnecessary subagent dispatches and review loops. Needed a standardized approach that scales from simple 1-file tasks to complex multi-repo changes.\
**Decision:** Adopt 5-step workflow with specific Claude model per step: (1) **Clarify** (Haiku) — If ambiguous, ask 5 questions; (2) **Plan** (Sonnet) — If 3+ files, create docs/plans/*.md with phases + Constitution Check against docs/decisions.md; (3) **Implement** (Haiku/Sonnet per complexity) — Follow plan checklist, write code, commit; (4) **Verify** (Haiku) — Run commands, all must pass; (5) **Complete** (Haiku) — Mark task done. See `.claude/workflows.md` for flow, `.claude/constitution.md` for check process.\
**Consequences:** Average task cost reduced from 250K to 13-18K tokens (~95% savings). Clear decision points on when to plan vs implement. Constitution Check catches architectural violations early (in Plan phase, not Implement phase). Plan doc becomes single source of truth for implementation. Workflow applies consistently across all repos (totoro, totoro-ai, future repos).

---

## ADR-024: Zustand for client-side UI state

**Date:** 2026-03-08\
**Status:** accepted\
**Context:** The Next.js frontend needs minimal global client state — query input, active recommendation, modal visibility. Most data fetching is handled by TanStack Query (server state) or Next.js server components. A full state management solution like Redux would be overkill.\
**Decision:** Use Zustand for client-side UI state in `apps/web`. TanStack Query handles all async server state (API calls, caching, mutation lifecycle). Zustand handles lightweight UI state that must be shared across components (current query string, active recommendation result, drawer/modal open state). Auth state is owned by Clerk. Locale and i18n routing is owned by `next-intl`. Theme is owned by `next-themes`. Zustand does not replace any of these.\
**Consequences:** Client bundle stays lean (~1KB for Zustand). No Redux boilerplate. Store is defined once in `apps/web/src/store/` and consumed via hooks. If a piece of state is only needed in one component, it stays local with `useState` — Zustand is only for cross-component shared state.

---

## ADR-023: @Serialize() decorator for controller response shaping

**Date:** 2026-03-08\
**Status:** accepted\
**Context:** Controllers returning raw Prisma models or AI response objects would expose internal fields and couple the response shape to the persistence layer. A consistent serialization mechanism is needed across all controllers.\
**Decision:** A custom `@Serialize(DtoClass)` decorator applies an interceptor that calls `plainToInstance(DtoClass, data, { excludeExtraneousValues: true })` on every response. All controller methods that return data use `@Serialize(ResponseDto)`. Response DTOs use `@Expose()` on fields that should be included. Raw Prisma models and AI response objects are never returned directly.\
**Consequences:** Response shape is decoupled from persistence layer. Adding or removing a response field requires only updating the DTO. Controllers stay clean — no manual mapping logic.

---

## ADR-022: AiEnabledGuard with per-user flag and global kill switch

**Date:** 2026-03-08\
**Status:** accepted\
**Context:** AI requests to totoro-ai are expensive and may need to be disabled — either globally (service outage, cost control) or per-user (abuse, account restriction). This must be enforced at the NestJS boundary before any forwarding happens.\
**Decision:** `AiEnabledGuard` in `services/api/src/auth/ai-enabled.guard.ts` runs after `ClerkAuthGuard` on AI routes only. It checks two things in order: (1) `ai_service.enabled` boolean from YAML config — if false, blocks all AI requests with 403, requires redeploy to change; (2) `req.user.publicMetadata.ai_enabled` from the Clerk JWT — if false, blocks that user's AI requests with 403, defaults to true if the field is absent. Applied via `@UseGuards(AiEnabledGuard)` on `POST /recommendations/consult` and `POST /places`. New users get `ai_enabled: true` set in Clerk `publicMetadata` via the `user.created` webhook handler.\
**Consequences:** AI can be killed globally via a config change and redeploy. Individual users can be disabled via Clerk dashboard or API without touching the codebase. Guard order matters — `ClerkAuthGuard` must run first to populate `req.user`.

---

## ADR-021: Bruno over Swagger for API documentation

**Date:** 2026-03-08\
**Status:** accepted\
**Context:** The NestJS API needs a way to document and test endpoints. Swagger (`@nestjs/swagger`) would duplicate the contract already maintained in `docs/api-contract.md` and add runtime overhead.\
**Decision:** No Swagger. Bruno is the API testing and documentation tool. Every new NestJS endpoint gets a corresponding `.bru` request file in `totoro-config/bruno/`. `docs/api-contract.md` remains the human-readable source of truth for the NestJS ↔ totoro-ai contract.\
**Consequences:** No `@ApiProperty()` decorators in DTOs. No Swagger UI endpoint. New endpoints require a `.bru` file — this is the acceptance signal that an endpoint is documented and testable.

---

## ADR-020: pnpm as the package manager (supersedes ADR-006)

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** The repo was initially set up with Yarn (ADR-006). Yarn was migrated away from in commit `eadf081` ("chore: migrate from yarn to pnpm"). pnpm has stricter dependency isolation, faster installs via a content-addressable store, and good Nx monorepo support with workspace protocol. CLAUDE.md and all dev commands already reference pnpm.\
**Decision:** pnpm is the package manager for the entire monorepo. All installs use `pnpm install`. Workspace packages reference each other via `workspace:*`. All scripts in CLAUDE.md and CI use `pnpm nx …` and `pnpm prisma …`. No `yarn.lock` or `package-lock.json` is committed — only `pnpm-lock.yaml`.\
**Consequences:** Developers must have pnpm installed (`npm i -g pnpm`). Phantom dependency bugs are caught earlier due to pnpm's strict hoisting. ADR-006 is superseded and its Yarn-specific guidance no longer applies.

---

## ADR-019: Forward-compatible DTOs for AI service responses

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** The api-contract.md explicitly states that the totoro-ai response schema will evolve and clients must not fail on extra keys. DTOs that strip or reject unknown fields would break silently when totoro-ai adds new fields.\
**Decision:** AI service response DTOs in `services/api/src/ai-service/dto/` declare all currently known fields and mark every field optional with `@IsOptional()`. Unknown fields from the AI response are not stripped at the NestJS boundary — they pass through to the frontend or are ignored. Implementation is pending.\
**Consequences:** NestJS tolerates totoro-ai API evolution without breaking. Frontend receives richer payloads as new fields are added. DTOs must be updated when new fields become required by business logic.

---

## ADR-018: Global exception filter mapping AI service errors to frontend responses

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** totoro-ai returns 400, 422, 500, and timeout conditions that require different user-facing messages. Without a consistent translation layer, error handling would be duplicated across every controller.\
**Decision:** A global `AllExceptionsFilter` registered in `services/api/src/main.ts` catches Axios errors from AI service calls and HTTP exceptions from NestJS itself. It maps AI service 400 → 400, 422 → 422 with "couldn't understand" message, 500 → 503 with retry suggestion, and timeout → 503. The filter lives in `services/api/src/common/filters/all-exceptions.filter.ts`. Implementation is pending.\
**Consequences:** All controllers get consistent error translation for free. AI service error shape changes require only updating this filter, not each controller. No raw Axios errors reach the frontend.

---

## ADR-017: Global ValidationPipe with whitelist mode

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** Without a global validation pipe, invalid request bodies would reach controllers and services, causing hard-to-debug runtime errors. Without whitelist mode, extra fields sent by clients could leak into service logic.\
**Decision:** `ValidationPipe` is registered globally in `services/api/src/main.ts` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`. All request DTOs in `services/api/src/<domain>/dto/` use `class-validator` decorators. Implementation is pending.\
**Consequences:** Invalid requests are rejected at the pipe before reaching controllers. DTOs are the authoritative contract for incoming data. `transform: true` means the parsed class instance (not plain object) reaches controllers, enabling typed access.

---

## ADR-016: AiServiceClient encapsulating all forwarding to totoro-ai

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** Both the places and recommendations domains need to call totoro-ai. Without a shared abstraction, each service would duplicate base URL config, timeout setup, and error normalization.\
**Decision:** `AiServiceModule` in `services/api/src/ai-service/` wraps NestJS `HttpModule` (Axios). `AiServiceClient` (injectable service) exposes two typed methods: `extractPlace(payload)` → calls `POST /v1/extract-place` and `consult(payload)` → calls `POST /v1/consult`. Base URL is read from `ConfigService` (`ai_service.base_url`). Timeouts are set per endpoint: 10s for extract-place, 20s for consult. Implementation is pending.\
**Consequences:** All AI forwarding is in one place. Domain services call `AiServiceClient` methods rather than raw HTTP. Timeout policy from api-contract.md is enforced consistently. Future auth header between services (shared secret) is added once in this module.

---

## ADR-015: PrismaService as a global singleton provider

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** Prisma's `PrismaClient` is a stateful singleton that manages connection pooling. Instantiating it per-module or per-request would create redundant connections and break lifecycle management.\
**Decision:** `PrismaService` in `services/api/src/prisma/prisma.service.ts` extends `PrismaClient` and implements `OnModuleInit` to call `$connect()`. It is exported from `PrismaModule`, which is declared with `@Global()` so all domain modules can inject `PrismaService` without importing `PrismaModule` explicitly. Implementation is pending.\
**Consequences:** One database connection pool for the entire NestJS process. Domain services declare `PrismaService` in their constructor without importing `PrismaModule`. NestJS lifecycle hooks (`OnModuleInit`, `OnModuleDestroy`) manage the connection cleanly.

---

## ADR-014: One NestJS module per domain bounded context

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** NestJS applications that grow without module boundaries become coupled monoliths where any service can call any other. The architecture limits NestJS to three concerns: users, recommendations, and AI forwarding. Each needs clear isolation.\
**Decision:** Domain modules are: `UsersModule` (`services/api/src/users/`), `RecommendationsModule` (`services/api/src/recommendations/`), and `AiServiceModule` (`services/api/src/ai-service/`). Each module contains its own controller, service, and `dto/` subdirectory. `AppModule` imports all domain modules. No cross-domain service injection — domains communicate only through `AiServiceClient`. Implementation is pending.\
**Consequences:** Adding a new domain (e.g., feedback) requires creating one new module folder. Controller and service responsibilities stay narrow. DTO types are local to their domain unless promoted to `libs/shared`.

---

## ADR-013: Clerk auth guard applied globally with @Public() opt-out

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** Every authenticated endpoint needs Clerk token verification. Applying a guard per-controller would be error-prone — a missed guard means an unprotected endpoint. A global guard with opt-out is safer.\
**Decision:** `ClerkAuthGuard` in `services/api/src/auth/clerk-auth.guard.ts` uses `@clerk/backend` SDK to verify the bearer token from the `Authorization` header. It is registered as a global guard via `APP_GUARD` in `AppModule`. A `@Public()` custom decorator (using `SetMetadata`) marks health check and unauthenticated endpoints to skip verification. The verified `userId` is attached to `request.auth` for downstream use. Implementation is pending.\
**Consequences:** All endpoints are authenticated by default — no endpoint is accidentally left open. Adding a public endpoint requires explicit `@Public()` opt-in. `userId` is available in all controllers via the request object without re-verifying downstream.

---

## ADR-012: YAML ConfigModule for non-secret configuration

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** NestJS needs access to non-secret config values like `ai_service.base_url`. Using environment variables for non-secrets defeats the purpose of YAML config (ADR-003). Without a structured loader, config access would be ad-hoc string lookups.\
**Decision:** NestJS `ConfigModule` is registered as global in `AppModule` with a custom YAML loader that reads the appropriate `config/<environment>.yml` file based on `NODE_ENV`. `ConfigService` is injected wherever config values are needed. Non-secret keys follow dot-notation paths (e.g., `ai_service.base_url`). Implementation is pending.\
**Consequences:** All non-secret config is version-controlled and environment-specific. Services access config via typed `ConfigService.get<T>()` calls. Adding a new config key requires only updating `config/*.yml` — no code changes needed for the loader.

---

## ADR-011: Bootstrap PORT env-var guard with explicit error

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** If `PORT` is not set (e.g., `env-setup.sh` was not sourced), the NestJS app would start on an undefined port and fail silently or bind to `NaN`. Developers would see a confusing error rather than a clear fix instruction.\
**Decision:** `services/api/src/main.ts` checks `process.env.PORT` after calling `NestFactory.create()`. If absent, it throws `new Error('PORT environment variable is not set. Run: source scripts/env-setup.sh')` before calling `app.listen()`. This is already implemented in `bootstrap()` in `services/api/src/main.ts`.\
**Consequences:** Misconfigured environments fail fast with a clear fix instruction. No silent startup on port `undefined`. Pattern established for future required env-var guards at bootstrap.

---

## ADR-010: Global API prefix driven by shared constant

**Date:** 2026-03-07\
**Status:** accepted\
**Context:** The `/api/v1/` prefix must be consistent across NestJS routing and any TypeScript code that builds URLs to call the NestJS API (e.g., the frontend fetch client). Hardcoding it in `main.ts` alone would create drift if it ever changes.\
**Decision:** `API_GLOBAL_PREFIX = 'api/v1'` is defined in `libs/shared/src/lib/constants.ts` and exported from `libs/shared/src/index.ts`. `services/api/src/main.ts` calls `app.setGlobalPrefix(API_GLOBAL_PREFIX)` using this constant. The frontend fetch client will import the same constant via `@totoro/shared` when implemented. This is already implemented.\
**Consequences:** The prefix is defined once and consumed wherever needed. A prefix change requires editing one constant. Nx boundary rules ensure `apps/web` can import `@totoro/shared` where this constant lives.

---

## ADR-009: SSE streaming as future consult response mode

**Date:** 2026-03-05\
**Status:** accepted\
**Context:** The consult endpoint returns reasoning_steps in a synchronous JSON response. When the frontend needs to show agent thinking in real time, the API contract would need redesigning mid-build without a plan.\
**Decision:** Document SSE as a future response mode now. When needed, FastAPI streams reasoning steps as they complete, NestJS proxies the SSE stream to the frontend. The synchronous mode remains the default. No implementation until the frontend requires it.\
**Consequences:** API contract is forward-compatible. No work needed today. When SSE is implemented, NestJS must proxy the stream and the frontend must handle incremental rendering.

---

## ADR-008: reasoning_steps in consult response

**Date:** 2026-03-05\
**Status:** accepted\
**Context:** When a bad recommendation comes back, there is no way to tell if intent parsing failed, retrieval missed the right place, or ranking scored incorrectly. The eval pipeline also needs per-step accuracy measurement.\
**Decision:** The consult response includes a `reasoning_steps` array. Each entry has a `step` identifier and a human-readable `summary` of what happened at that stage. totoro-ai produces it, this repo consumes and renders it.\
**Consequences:** Frontend can display agent thinking steps. DTOs must include the new field. Both repos' API contract docs updated.

---

## ADR-007: Tailwind v3 + shadcn/ui over Tailwind v4

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** The UI needs a component library with Dialog, Sheet, Toast, Skeleton, and Command — all required for Totoro's core UX. Tailwind v4 was available but shadcn/ui was not fully stable on it at project start.\
**Decision:** Use Tailwind CSS v3 with shadcn/ui. shadcn components are copied into `libs/ui` (not installed as a package) so the code is owned and can be modified freely. Alternatives considered: Tailwind v4, Radix primitives without shadcn, Material UI.\
**Consequences:** shadcn components are fully customisable with no upstream dependency. Tailwind v3 patterns apply throughout — see `.claude/rules/tailwind-patterns.md`. If upgrading to Tailwind v4 in future, shadcn components will need re-testing.

---

## ADR-006: Yarn over npm/pnpm _(superseded by ADR-020)_

**Date:** 2026-03-04\
**Status:** superseded\
**Context:** A package manager was needed for the Nx monorepo at project creation. Yarn with `nodeLinker: node-modules` was chosen to avoid PnP compatibility issues with Prisma.\
**Decision:** Use Yarn with `nodeLinker: node-modules`. Alternatives considered: pnpm, npm.\
**Consequences:** Superseded by ADR-020. The repo has since migrated to pnpm.

---

## ADR-005: Prisma over TypeORM

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** NestJS needs a database access layer for PostgreSQL. The team prioritised type safety and migration ergonomics over the NestJS-default TypeORM.\
**Decision:** Use Prisma as the ORM and schema owner. Prisma generates TypeScript types from the schema and manages all migrations. Alternatives considered: TypeORM, Drizzle, raw SQL.\
**Consequences:** Prisma is the single source of truth for the database schema. All migrations run through `prisma migrate`. Vector operations that Prisma cannot express use raw SQL via `$queryRaw`.

---

## ADR-004: Clerk over custom auth

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** Implementing auth from scratch (JWT issuance, refresh tokens, session management) would consume weeks of development time better spent on AI features.\
**Decision:** Use Clerk for authentication across both Next.js and NestJS. Clerk's free tier covers 50K MAU and provides SDKs for both runtimes. Alternatives considered: NextAuth/Auth.js, Supabase Auth, custom JWT.\
**Consequences:** Auth is fully delegated to Clerk. No custom session logic exists in this repo. The `userId` from Clerk is the canonical user identifier throughout the system.

---

## ADR-003: YAML config over dotenv for non-secrets

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** Non-secret config values like `ai_service.base_url` need structure and environment-specificity that flat `.env` files cannot provide cleanly.\
**Decision:** Use YAML files (`config/dev.yml`, `config/prod.yml`) for all non-secret configuration. Secrets remain in shell-exported environment variables sourced from `scripts/env-setup.sh`. No `.env` files. Alternatives considered: dotenv for everything, JSON config files.\
**Consequences:** Config is version-controlled and structured. Secrets never appear in config files. Adding a new non-secret value requires only a YAML edit, not a code change.

---

## ADR-002: Separate AI repo (totoro-ai)

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** All AI/ML logic requires Python, a different deployment target (Python runtime with GPU), and a faster iteration cycle than product code. Mixing languages in one repo would complicate CI, deployments, and dependency management.\
**Decision:** Keep all AI/ML code in a separate Python repository (`totoro-ai`). This repo communicates with it via HTTP only. Alternatives considered: Python in a monorepo subfolder, AI logic as a microservice within this repo.\
**Consequences:** A stable HTTP contract (see `docs/api-contract.md`) is the boundary between repos. Changes to the AI pipeline do not require touching this repo unless the contract changes. Each repo deploys independently.

---

## ADR-001: Nx over Turborepo

**Date:** 2026-03-04\
**Status:** accepted\
**Context:** The monorepo contains a Next.js frontend, NestJS backend, and shared libraries. Module boundary enforcement is critical to prevent `apps/web` from importing backend code and vice versa.\
**Decision:** Use Nx as the monorepo tool. Nx provides built-in module boundary lint rules, dependency graph visualisation, and first-class generators for both Next.js and NestJS. Alternatives considered: Turborepo, plain Yarn workspaces.\
**Consequences:** Module boundaries are enforced by Nx ESLint rules. Violating a boundary produces a lint error, not a runtime failure. All task execution (build, test, lint) goes through `pnpm nx`.
