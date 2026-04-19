# Data Model: Gateway Per-User Rate Limiting (016)

No database tables are added or modified by this feature. All state is in-memory within NestJS (Map).

---

## In-Memory State

### UserRateLimitState

Held in `Map<string, UserRateLimitState>` keyed by `userId` inside `RateLimitService`.

```typescript
interface UserRateLimitState {
  sessions:  { count: number; date: string };  // YYYY-MM-DD UTC
  toolCalls: { count: number; date: string };  // YYYY-MM-DD UTC
  turns:     number;                           // session-scoped, no date needed
}
```

| Field | Type | Notes |
|---|---|---|
| `sessions.count` | `number` | Rolling daily counter; reset when `sessions.date` ≠ today UTC |
| `sessions.date` | `string` | UTC date (YYYY-MM-DD) — always derived from `new Date().toISOString().slice(0,10)`, never from local timezone |
| `toolCalls.count` | `number` | Rolling daily counter; reset when `toolCalls.date` ≠ today UTC |
| `toolCalls.date` | `string` | UTC date (YYYY-MM-DD) — same derivation rule as sessions.date |
| `turns` | `number` | Session-scoped counter; no date field — turns never reset at midnight, only on logout/session_started |

**Timezone rule**: Daily counters reset at UTC midnight. Server timezone (`TZ` env var) and user's local clock are both irrelevant. Always use `new Date().toISOString().slice(0, 10)` to get the current UTC date. Never use `getDate()`, `getMonth()`, `getFullYear()`, or `toLocaleDateString()` — these read local timezone and produce wrong results when the Railway instance runs outside UTC.

**Map key**: Clerk `userId` (string)

**Lifecycle rules**:
- Entry created on first request from a user (lazy init; default state: `sessions: { count: 0, date: today }`, `toolCalls: { count: 0, date: today }`, `turns: 0`)
- Entry is never deleted from the Map (no eviction at this phase)
- Daily counters reset in-place (field mutation, not entry replacement)

---

## Shared Types (libs/shared)

New types to be added to `libs/shared/src/lib/types.ts`:

### PlanTier

```typescript
export type PlanTier = 'homebody' | 'explorer' | 'local_legend';
```

### AuthUser

Replaces local `ClerkUser` in `services/api`. Exported from `libs/shared`.

```typescript
export interface AuthUser {
  id: string;
  ai_enabled: boolean;
  plan?: PlanTier;  // undefined = fall back to config.rate_limits.default_plan
}
```

### ChatResponseDto extension

Two new fields added to the existing `ChatResponseDto` in `libs/shared/src/lib/types.ts`. Applies to all response types (consult, recall, extract-place, assistant, clarification, error).

```typescript
export interface ChatResponseDto {
  type: ChatResponseType;
  message: string;
  data: ConsultResponseData | RecallResponseData | ExtractPlaceData | Record<string, unknown> | null;
  tool_calls_used: number;    // always present; 0 when no tools were called
  session_started?: true;     // present ONLY when FastAPI created a new Redis key; absent otherwise
}
```

---

## Config Shape (services/api)

Added to `services/api/config/app.yaml` under a new top-level key:

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

### PlanThresholds (internal type, services/api only)

```typescript
interface PlanThresholds {
  sessions_per_day: number;
  tool_calls_per_day: number;
  turns_per_session: number;
}
```

Read by `RateLimitGuard` via `ConfigService.get<PlanThresholds>('rate_limits.plans.<tier>')`.
