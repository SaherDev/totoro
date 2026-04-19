# Feature Specification: Gateway Per-User Rate Limiting

**Feature Branch**: `016-gateway-rate-limit`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "Implement per-user rate limiting in the NestJS gateway with plan tiers (homebody/explorer/local_legend), in-memory counters, and config-driven thresholds"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Free-tier user hits their daily session cap (Priority: P1)

A user on the homebody plan has already started 3 chat sessions today. When they try to send another message, the system rejects the request with a clear rate-limit error rather than silently failing or forwarding to the AI service.

**Why this priority**: Prevents cost overruns by blocking requests at the gateway before they reach the AI service. Most critical business constraint.

**Independent Test**: Can be fully tested by simulating 3 sessions for a homebody user then sending a 4th message — system must return 429 with the correct shape.

**Acceptance Scenarios**:

1. **Given** a homebody user has 3 sessions today, **When** they send a new chat message, **Then** the gateway returns 429 `{ "error": "rate_limit_exceeded", "limit": "sessions_per_day", "limit_value": 3 }`
2. **Given** an explorer user has 10 sessions today, **When** they send a new chat message, **Then** the gateway returns 429 for sessions_per_day with limit_value 10
3. **Given** a user has 0 sessions today, **When** they send their first message, **Then** the request is forwarded normally

---

### User Story 2 — User exhausts turns within a single session (Priority: P1)

A user sends messages back and forth in one session. After reaching the turns_per_session limit for their plan tier, further messages in that session are blocked until they start a new session.

**Why this priority**: Turns are the most granular cost control. A single runaway session could exhaust a user's daily budget in one conversation.

**Independent Test**: Can be fully tested by sending 10 turns for a homebody user in one session — the 11th turn must return 429 with limit "turns_per_session".

**Acceptance Scenarios**:

1. **Given** a homebody user has sent 10 turns in the current session, **When** they send turn 11, **Then** the gateway returns 429 `{ "error": "rate_limit_exceeded", "limit": "turns_per_session", "limit_value": 10 }`
2. **Given** a user sends a message that triggers a new session (session_started SSE event), **When** their turn count resets to 1, **Then** subsequent turns are accepted until the new session's limit is reached
3. **Given** a user logs out, **When** they log back in and send a message, **Then** turns_per_session is 0 (reset on logout) and sessions_per_day is unchanged

---

### User Story 3 — User exhausts daily tool calls (Priority: P2)

Heavy users who run many AI tool-intensive queries may exhaust their tool_calls_per_day budget before hitting session or turn caps. The system blocks further requests for the rest of the day.

**Why this priority**: Tool calls are the most variable cost factor. A single complex consult can invoke many tools. This cap protects against expensive edge cases.

**Independent Test**: Can be tested by accumulating tool_calls_per_day to the limit via done SSE events, then sending another message — must return 429 with limit "tool_calls_per_day".

**Acceptance Scenarios**:

1. **Given** a homebody user's tool_calls_per_day counter is at 30, **When** they send a new message, **Then** the gateway returns 429 `{ "error": "rate_limit_exceeded", "limit": "tool_calls_per_day", "limit_value": 30 }`
2. **Given** a done SSE event reports tool_calls_used: 5, **When** the session ends, **Then** the user's tool_calls_per_day counter increases by 5
3. **Given** a user has no plan field in their token, **When** the guard checks limits, **Then** the system applies the default_plan from config (homebody)

---

### User Story 4 — Day rollover resets daily counters (Priority: P2)

A user who was rate-limited yesterday can start fresh today. Daily counters (sessions_per_day, tool_calls_per_day) reset automatically at UTC midnight. Session-scoped turns are not affected by date changes.

**Why this priority**: Without day rollover, rate limits become permanent bans. Correct reset behavior is essential for the feature to function.

**Independent Test**: Can be tested by storing a counter with yesterday's date, then triggering a limit check — the system must reset the count and allow the request.

**Acceptance Scenarios**:

1. **Given** a user's stored date for sessions is yesterday, **When** they send a message today, **Then** the sessions counter resets to 0 before the check, and the request is allowed
2. **Given** a user's stored date for tool_calls is yesterday, **When** they send a message today, **Then** the tool_calls counter resets to 0 before the check
3. **Given** a day rollover occurs while a user is mid-session, **When** the next message is sent, **Then** only the daily counters reset — the turns counter is unaffected

---

### Edge Cases

- What happens when a user's plan value in the token is not one of the three known tiers? → Fall back to default_plan from config.
- What if the SSE stream from FastAPI ends without a done event (connection drop)? → Tool calls for that session are not added; the next turn is allowed (no ghost charges).
- What if the session_started event never arrives in an SSE stream? → sessions_per_day is not incremented; only the turn counter advances.
- What if two concurrent requests from the same user arrive simultaneously? → Node.js single-threaded event loop prevents a data race on the in-memory Map. Document this constraint.
- What if a user is rate-limited mid-SSE stream? → Guard runs before forwarding; the stream is never opened.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce three independent rate limits per user: sessions_per_day, tool_calls_per_day, turns_per_session
- **FR-002**: System MUST check limits in this order: tool_calls_per_day → turns_per_session → sessions_per_day; the first breached limit is returned in the 429 response
- **FR-003**: System MUST return HTTP 429 with body `{ "error": "rate_limit_exceeded", "limit": "<limit_name>", "limit_value": <number> }` when any limit is breached
- **FR-004**: Rate limit thresholds MUST be read from config (YAML) — never hardcoded; default_plan MUST also be config-driven
- **FR-005**: Plan tier MUST be resolved from the authenticated user token with no database query; missing plan falls back to config.rate_limits.default_plan
- **FR-006**: Daily counters (sessions_per_day, tool_calls_per_day) MUST reset when the stored UTC date differs from today; the date is compared on every counter check
- **FR-007**: turns_per_session counter MUST reset to 0 on user logout; daily counters MUST NOT reset on logout
- **FR-008**: turns_per_session MUST increment by 1 before forwarding each message to FastAPI
- **FR-009**: sessions_per_day MUST increment and turns_per_session MUST be set to 1 when a session_started SSE event is received from FastAPI
- **FR-010**: tool_calls_per_day MUST increment by the tool_calls_used value from the done SSE event at the end of each session
- **FR-011**: Rate limiting state MUST be held in-memory (Map per user); persistent storage is not used at this stage
- **FR-012**: The ClerkUser type in libs/shared MUST be renamed to AuthUser and MUST include a `plan` field typed as the three plan tiers or undefined; all references across the codebase must be updated
- **FR-013**: The AI service MUST emit a session_started event as the first SSE event when creating a new session
- **FR-014**: The AI service MUST emit a done event with tool_calls_used count as the final SSE event
- **FR-015**: turns_per_session reset on logout MUST be triggered only by the logout handler and Clerk webhook handler — the frontend MUST NOT call a session-reset endpoint directly
- **FR-016**: Bruno test collection MUST include request files covering: tool_calls_per_day breach, turns_per_session breach, sessions_per_day breach, logout-resets-turns-not-daily, day-rollover-resets-daily-not-turns

### Config Shape Reference

The following YAML block defines the exact config structure to be added to `config/app.yaml`. All threshold values and the default plan name are read from here — nothing is hardcoded.

```yaml
rate_limits:
  default_plan: homebody
  plans:
    homebody:
      sessions_per_day: 3
      tool_calls_per_day: 30
      turns_per_session: 10
    explorer:
      sessions_per_day: 10
      tool_calls_per_day: 100
      turns_per_session: 20
    local_legend:
      sessions_per_day: 20
      tool_calls_per_day: 200
      turns_per_session: 30
```

### Key Entities

- **AuthUser** (renamed from ClerkUser): Authenticated user extracted from the Clerk token; fields include userId, plan (optional plan tier), ai_enabled; lives in libs/shared
- **UserRateLimitState**: In-memory state per user; fields: sessions `{ count, date }`, toolCalls `{ count, date }`, turns; date fields store UTC date strings (YYYY-MM-DD)
- **PlanThresholds**: Config-driven limits per plan tier; fields: sessions_per_day, tool_calls_per_day, turns_per_session; read from YAML at service startup
- **RateLimitResponse**: 429 response body; fields: error (constant "rate_limit_exceeded"), limit (which counter was breached), limit_value (the threshold as a number)

## Clarifications

### Session 2026-04-19

- Q: What is the response mode and how does NestJS read rate-limit counters? → A: Synchronous mode only — the current single JSON response is retained. FastAPI adds two fields to the existing `ChatResponseDto` response body: `session_started: boolean` (true when FastAPI creates a new Redis key, i.e. a new session) and `tool_calls_used: number` (always present; count of LangChain tool invocations in this turn). NestJS reads both fields from the JSON response after `aiClient.chat()` returns and updates in-memory counters accordingly. No SSE streaming is introduced by this feature.

- Q: What is the exact guard check order and how does the day-rollover interact with the check? → A: On every counter check: (1) read stored date for that counter; (2) if stored date ≠ today UTC, reset count to 0 and update date; (3) compare count to plan threshold — over → 429, under → pass. Guard order: `tool_calls_per_day` → `turns_per_session` → `sessions_per_day`. Turns increment happens inside the service after the guard passes, before forwarding to FastAPI.

- Q: How is logout triggered? → A: Clerk webhook `session.ended` event → NestJS resets `turns_per_session` to 0 for that user in the in-memory Map. Sessions and tool-calls daily counters are never reset on logout. An idle session (FastAPI's internal Redis key expiry, not NestJS-visible) will cause FastAPI to set `session_started: true` on the user's next response, which NestJS handles by incrementing `sessions_per_day` and setting `turns_per_session` to 1 — same as any new session.

FR-015 updated: logout and session reset are triggered only by the Clerk `session.ended` webhook. No dedicated logout endpoint is needed.

- Q: What are the new fields FastAPI adds to the response body, and which response types carry them? → A: `tool_calls_used: number` is always present on every `ChatResponseDto` response (every `type`); it is 0 when no tools were called. `session_started` is only present (as `true`) when FastAPI creates a new Redis key — it is entirely absent when an existing session was continued. New session: `{ "type": "consult", ..., "session_started": true, "tool_calls_used": 2 }`. Existing session: `{ "type": "consult", ..., "tool_calls_used": 2 }`. NestJS: `if (response.session_started)` → call `onSessionStarted()`; always call `addToolCalls(userId, response.tool_calls_used)`. `docs/api-contract.md` must be updated to reflect this shape.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three rate limit types correctly reject requests beyond their plan threshold with a 429 response — verified by all five Bruno breach test files passing
- **SC-002**: Plan tier resolves from the user token on every request with zero database queries — verifiable by the absence of any repository call in the guard execution path
- **SC-003**: Day rollover correctly resets daily counters within the same request cycle when the stored date differs from today UTC — verified by the day-rollover Bruno test
- **SC-004**: Logout resets only turns_per_session; daily counters retain their values — verified by the logout Bruno test sequence
- **SC-005**: Changing plan thresholds in the YAML config takes effect on the next server restart without any code changes — verified by modifying the config and re-running the breach tests
- **SC-006**: All 429 responses conform exactly to the specified shape `{ "error": "rate_limit_exceeded", "limit": "...", "limit_value": N }` — verified by schema assertion in all five Bruno tests
- **SC-007**: No request is forwarded to the AI service for any message that fails the rate limit check — verified by confirming FastAPI receives no inbound request after a 429
