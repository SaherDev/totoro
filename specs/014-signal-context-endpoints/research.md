# Phase 0 Research: Signal & User Context Gateway Endpoints

All Clarify-phase ambiguities are resolved in the spec. What remains for research is verifying existing-code assumptions before implementation begins. No unresolved `NEEDS CLARIFICATION` items.

## R1 — AllExceptionsFilter already passes AI-service 404 through

**Decision**: No filter code change is required. The spec's wording ("extend `AllExceptionsFilter` globally to map upstream 404 → 404") is corrected to "confirm existing pass-through behaviour covers 404."

**Rationale**: Read of `services/api/src/common/filters/all-exceptions.filter.ts` shows the filter already handles 400, 422, 5xx, and network errors explicitly, and falls through to a `res.status(status).json(exception.response.data)` branch for "any other response status" — which includes 404. No edit needed. Adding a dedicated 404 branch would be dead code.

**Alternatives considered**:
- Explicit `status === 404` branch with canonical body shape: rejected — redundant, and the FastAPI body `{"detail": "Recommendation not found"}` already propagates unchanged, which is fine for the frontend.
- Route-local filter on `/signal` only: rejected in Clarify Q3 — inconsistent with ADR-018's centralization.

**Consequence**: The filter file is **not** modified in this feature. Tests added for `/signal` must assert that an upstream 404 surfaces as a 404 via the existing pass-through — proves the behaviour without requiring code changes.

## R2 — `recommendation_id` nullability on the wire

**Decision**: Type `recommendation_id: string | null` in `ConsultResponseData` (libs/shared). The gateway does nothing special for `null` — just forwards.

**Rationale**: FastAPI contract dated 2026-04-17 explicitly states: "Null if persist failed." The gateway has no business inspecting this value (ADR-036: "NestJS never inspects response content — it forwards and returns"). The frontend is responsible for rendering disabled feedback affordances when the value is `null`, but that is out of scope for this feature.

**Alternatives considered**:
- Treat `null` as an error and return 503: rejected — violates pass-through and would mask a legitimate AI-service state (the place was still recommended; only persistence failed).
- Omit the field when null: rejected — breaks the "key is always present" invariant in SC-001.

## R3 — Extending `IAiServiceClient` — interface-first per ADR-033

**Decision**: Add two methods to the existing interface:

```ts
export interface IAiServiceClient {
  chat(payload: ChatRequestDto): Promise<ChatResponseDto>;
  postSignal(payload: SignalRequestWithUser): Promise<SignalResponse>;
  getUserContext(userId: string): Promise<UserContextResponse>;
}
```

Concrete `AiServiceClient` gains the implementations. No additional providers in `AiServiceModule` — it already exports the existing `AI_SERVICE_CLIENT` token, which injects the full (extended) interface.

**Rationale**: ADR-033 mandates interface-first. Reusing the existing token means consumers (`SignalService`, `UserContextService`) inject the same `IAiServiceClient` symbol already used by `ChatService`. One abstraction, three methods. Constitution §III rule preserved.

**Alternatives considered**:
- Separate clients (`SignalClient`, `UserContextClient`): rejected — the AI service is a single upstream; splitting the abstraction fragments timeout/config/error handling without gain.
- Per-endpoint token for each method: rejected — adds boilerplate in `AiServiceModule` without benefit; ADR-036 already collapses per-endpoint clients.

## R4 — Timeout reuse

**Decision**: Both new methods reuse the 30 s timeout already configured on the HttpModule/chat call.

**Rationale**: Spec assumption confirmed. `/signal` and `/user/context` are short-running in practice (< 2 s). The 30 s cap is a safety net and matches the existing `chat()` convention — one rule, one place. Keeping the number uniform simplifies observability and future ADR changes.

**Alternatives considered**:
- 5 s cap on `/signal` specifically: rejected — premature optimization without measurement. Can tighten via a future ADR if telemetry shows long tails.
- Per-method config keys in YAML: rejected — no demonstrated need, violates YAGNI.

## R5 — DTO validation for `SignalRequest` (discriminated union)

**Decision**: One `SignalRequestDto` class in `services/api/src/signal/dto/signal-request.dto.ts` uses `@IsIn(['recommendation_accepted', 'recommendation_rejected'])` on `signal_type` plus non-empty string validation on `recommendation_id` and `place_id`. The global `ValidationPipe` (ADR-017) with `whitelist: true, forbidNonWhitelisted: true, transform: true` rejects any unknown field or value.

**Rationale**: `class-validator` does not natively express TypeScript's discriminated-union shape, but since all three fields are present in both variants (only the `signal_type` enum differs), a single DTO with `@IsIn()` is the cleanest expression. The `libs/shared` type can still model it as a discriminated union for frontend consumption — frontend-only concern, not a validation-engine concern.

**Alternatives considered**:
- Nested `ValidateNested` with subclass per `signal_type`: rejected — overkill; the two variants share all fields.
- Zod schema: rejected in NestJS context — ADR-017 binds us to `class-validator`; mixing validators adds cognitive load without reducing error class.

## R6 — Response shaping via `@Serialize()` (ADR-023)

**Decision**: Apply `@Serialize(UserContextResponseDto)` on the user-context controller method and `@Serialize(SignalResponseDto)` on the signal controller method. Both DTO classes use `@Expose()` on the fields listed in the wire contract.

**Rationale**: ADR-023 is unambiguous — all controller responses go through `@Serialize()`. Even though the payload is pure pass-through, the decorator ensures only declared fields are returned. If FastAPI ever adds extra fields, they are dropped at the gateway. This is the opposite policy from *request* DTOs (ADR-019 forward-compat on incoming AI responses) because the boundary is reversed — but the spec rule is "pass through the AI service response as-is" for both endpoints. ADR-023 and forward-compat live together: the service-layer type keeps unknown fields (`@IsOptional()` equivalents on the shared type), and the controller-level `@Serialize` surfaces only the documented fields.

**Alternatives considered**:
- Return raw payload, skip `@Serialize`: rejected — violates ADR-023 uniformity. Every other controller in the repo uses it.
- Make `@Serialize` also pass through unknown fields: rejected — that's a repo-wide ADR-023 change, not a feature-scope decision.

## R7 — No Prisma code to flag

**Decision**: Confirmed via repo search. No Prisma client imports or recommendation-writing code exist in `services/api`. The memory's "Prisma 7.4.2" note is stale (pre-ADR-036 era). This feature does not introduce or remove Prisma code.

**Rationale**: `grep -ri "prisma\|recommendations" services/api` returns only two comment matches in the guard decorator (a stale JSDoc example referencing `recommendationService.consult()`). The stale doc example is not logic, but will be cleaned up opportunistically during implementation of FR-019 since it's a misleading comment.

**Consequence**: Task list should include a micro-cleanup to remove or rephrase the misleading example in `requires-ai.decorator.ts`.

## R8 — `@CurrentUser()` decorator semantics

**Decision**: Reuse the existing `@CurrentUser()` param decorator that reads `request.user.id`. This works identically for both new endpoints — it is already populated by `ClerkMiddleware` for all routes.

**Rationale**: The chat route uses the same decorator. Consistent extraction point; no new middleware or guard needed.

## R9 — Test strategy

**Decision**:

- Unit-test the two new `AiServiceClient` methods against a mocked `HttpService` (pattern from `ai-service.client.spec.ts`).
- Unit-test `SignalService` and `UserContextService` with a mocked `IAiServiceClient` interface (pattern from `chat.service.ts`; note: no existing `chat.service.spec.ts` — first instance of service-level testing for forwarding modules in this repo).
- Unit-test `SignalController` with a mocked `SignalService` — assert the facade-only rule (one call, no logic).
- Light integration coverage via Bruno for the happy path + 404 case per SC-007.
- No e2e test harness added in this feature — existing repo has no Supertest setup, and adding one is out of scope.

**Rationale**: Matches the repo's existing testing depth. Going deeper would expand scope.

**Alternatives considered**:
- Add Supertest e2e: rejected — new infrastructure, would require test DB, test Clerk token harness; out of scope.
- Skip controller-level tests: rejected — the facade-only rule (ADR-032) deserves a regression guard.

## Summary of decisions

| Area | Decision | Source |
|------|----------|--------|
| Exception filter | No change — existing pass-through covers 404 | R1 (overrides spec phrasing) |
| `recommendation_id` type | `string \| null` | R2 / FastAPI contract |
| Interface shape | Extend `IAiServiceClient` with two methods | R3 / ADR-033 |
| Timeout | 30 s reused | R4 / ADR-036 convention |
| Body validation | Single DTO with `@IsIn()` | R5 / ADR-017 |
| Response shaping | `@Serialize(...)` on both controllers | R6 / ADR-023 |
| Prisma cleanup | None needed; minor JSDoc tidy | R7 |
| User extraction | Existing `@CurrentUser()` | R8 |
| Testing depth | Unit + Bruno, no new e2e infra | R9 |
