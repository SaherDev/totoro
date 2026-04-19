# Contract: RateLimitService

**File**: `services/api/src/rate-limit/rate-limit.service.ts`  
**Module**: `RateLimitModule` (exported)  
**Scope**: Singleton (NestJS default)

---

## Interface

```typescript
interface IRateLimitService {
  /**
   * Check all three limits for the user in order:
   * tool_calls_per_day → turns_per_session → sessions_per_day.
   * Resets daily counters if stored date ≠ today UTC.
   * Returns null if all limits pass, or a RateLimitBreach describing
   * which limit was exceeded.
   */
  check(userId: string, thresholds: PlanThresholds): RateLimitBreach | null;

  /**
   * Increment turns_per_session by 1.
   * Called by ChatService after guard passes, before forwarding to FastAPI.
   */
  incrementTurns(userId: string): void;

  /**
   * Increment sessions_per_day and set turns_per_session to 1.
   * Called by ChatService when a session_started SSE event is received.
   */
  onSessionStarted(userId: string): void;

  /**
   * Add toolCallsUsed to tool_calls_per_day.
   * Called by ChatService when a done SSE event is received.
   */
  addToolCalls(userId: string, toolCallsUsed: number): void;

  /**
   * Reset turns_per_session to 0.
   * Called by ClerkWebhookController on session.ended event.
   */
  resetTurns(userId: string): void;
}
```

---

## Supporting Types

```typescript
export type RateLimitCounterName =
  | 'tool_calls_per_day'
  | 'turns_per_session'
  | 'sessions_per_day';

export interface RateLimitBreach {
  limit: RateLimitCounterName;
  limit_value: number;
}

interface PlanThresholds {
  sessions_per_day: number;
  tool_calls_per_day: number;
  turns_per_session: number;
}
```

---

## Day-reset invariant

For every daily counter (`sessions`, `toolCalls`) on every method call:

```
if storedDate ≠ todayUTC:
  count = 0
  storedDate = todayUTC
```

This is applied inside `check()`, `incrementTurns()` (turns is session-scoped, no date), `onSessionStarted()`, and `addToolCalls()` — anywhere the relevant counter is read or written.

---

## 429 Response Shape

When `check()` returns a breach, the guard throws `HttpException` with status 429:

```json
{
  "error": "rate_limit_exceeded",
  "limit": "turns_per_session",
  "limit_value": 10
}
```
