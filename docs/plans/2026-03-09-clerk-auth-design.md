# Design: Clerk Authentication & AI Feature Flags

**Date:** 2026-03-09
**Feature:** End-to-end Clerk auth setup with per-user AI enable flag and global kill switch

---

## Problem Statement

Totoro needs:
1. Authenticated access to the NestJS backend (only authorized users can call APIs)
2. Per-user control over AI features via `ai_enabled` flag in Clerk publicMetadata
3. Global emergency AI disable switch via NestJS config (YAML, requires redeploy)
4. Some routes must remain public (webhooks, health checks)

---

## Solution Overview

**Architecture:**
- Global Clerk JWT verification middleware on all NestJS routes
- `@Public()` decorator for unauthenticated routes (bypasses JWT check)
- `@RequireAi()` guard only on AI endpoints (`/extract-place`, `/consult`) to validate `ai_enabled` flag
- Clerk webhook handler to initialize new users with `ai_enabled: true`
- Two configurable YAML flags: `ai.enabled_default` and `ai.global_kill_switch`

**Request Flow:**
```
Client Request
    ↓
[Clerk JWT Middleware]
├─ Route has @Public()? → Skip JWT, pass through
└─ No @Public()? → Verify JWT, extract user + ai_enabled, attach to request
     ↓
[Controller Handler]
├─ Route has @RequireAi()? → Check ai_enabled flag + global kill switch
│  ├─ ai_enabled is false? → 403 Forbidden
│  ├─ global_kill_switch is true? → 503 Service Unavailable
│  └─ Pass through to handler
└─ No @RequireAi()? → Continue (already authenticated)
     ↓
[Response / Forward to totoro-ai]
```

---

## Components

### 1. Clerk Middleware (Global, All Routes)

**Responsibility:** Verify Clerk JWT on every request and attach user context.

**Behavior:**
- Check `Authorization: Bearer <token>` header
- If route has `@Public()` decorator: skip verification, continue
- If no token and no `@Public()`: return `401 Unauthorized`
- If token present: verify with Clerk, extract claims:
  - `sub` (user ID)
  - `public_metadata.ai_enabled` (boolean, defaults to config value if missing)
- Attach `request.user` object with `id` and `ai_enabled`

**Implementation:** NestJS `@Injectable()` middleware using `@clerk/nestjs`

---

### 2. `@Public()` Decorator

**Responsibility:** Mark routes that should bypass JWT verification.

**Usage:**
```typescript
@Post('/webhooks/clerk')
@Public()
async handleClerkWebhook(req) { ... }
```

**Routes marked `@Public()`:**
- `POST /webhooks/clerk` (Clerk webhook handler)
- `GET /health` (health check)
- Any sign-up/sign-in callback routes

---

### 3. `@RequireAi()` Guard

**Responsibility:** Validate `ai_enabled` flag and global kill switch before forwarding to totoro-ai.

**Behavior:**
- Check if user's `ai_enabled` is `true`
  - If `false`: return `403 Forbidden` with message "AI features disabled for this user"
- Check if global `ai.global_kill_switch` is `true`
  - If `true`: return `503 Service Unavailable` with message "AI service temporarily unavailable"
- If both pass: continue to handler

**Routes using `@RequireAi()`:**
- `POST /api/v1/extract-place`
- `POST /api/v1/consult`

**Implementation:** NestJS `CanActivate` guard

---

### 4. Clerk Webhook Handler

**Endpoint:** `POST /api/v1/webhooks/clerk` (marked `@Public()`)

**Responsibility:** Initialize new users with `ai_enabled: true` when they sign up.

**Behavior:**
1. Receive `user.created` event from Clerk
2. Verify webhook signature using Clerk webhook secret
3. Extract user ID from event
4. Call Clerk Backend API (v1) to update publicMetadata:
   ```json
   {
     "public_metadata": {
       "ai_enabled": true
     }
   }
   ```
5. Return `200 OK`

**Error Handling:**
- Invalid signature: return `401 Unauthorized`
- Clerk API call fails: log error, return `500` (Clerk will retry)
- User already has `ai_enabled`: update succeeds (idempotent)

---

### 5. YAML Configuration

**Location:** `services/api/config/.local.yaml`

**Schema:**
```yaml
ai:
  enabled_default: true         # Fallback if ai_enabled missing from JWT
  global_kill_switch: false     # If true, all AI endpoints return 503
```

**Behavior:**
- If JWT has `public_metadata.ai_enabled`: use that value
- If missing: use `ai.enabled_default` from config
- If `ai.global_kill_switch` is `true`: block all AI requests (overrides user flag)

---

### 6. JWT Claims & User Context

**Clerk JWT includes (extracted by middleware):**
- `sub`: User ID (string)
- `public_metadata.ai_enabled`: Boolean flag (may be missing, fallback to config)

**Attached to `request.user`:**
```typescript
interface AuthenticatedUser {
  id: string;
  ai_enabled: boolean;  // From JWT public_metadata or config default
}
```

---

## Error Responses

| Scenario | Status | Body |
|----------|--------|------|
| No token, route not public | 401 | `{ "error": "Unauthorized" }` |
| Invalid JWT | 401 | `{ "error": "Invalid token" }` |
| `ai_enabled` is false | 403 | `{ "error": "AI features disabled for this user" }` |
| `global_kill_switch` is true | 503 | `{ "error": "AI service temporarily unavailable" }` |
| Valid request | 200 | Response from handler |

---

## Data Flow: New User Signup

```
1. User signs up in Next.js (Clerk frontend SDK)
2. Clerk creates user in backend
3. Clerk sends user.created webhook to NestJS
4. NestJS webhook handler receives event
5. NestJS verifies webhook signature
6. NestJS calls Clerk Backend API: PUT /users/{id}/metadata
7. Clerk updates publicMetadata: ai_enabled = true
8. User's next API request includes JWT with public_metadata.ai_enabled = true
9. Middleware extracts and validates flag
```

---

## Data Flow: User Makes AI Request

```
1. Frontend sends authenticated request to POST /api/v1/consult
2. Clerk middleware verifies JWT, extracts ai_enabled
3. Controller checks @RequireAi() guard
4. Guard checks:
   - ai_enabled from JWT (or config default): true ✓
   - global_kill_switch from config: false ✓
5. Request proceeds to handler
6. Handler forwards to totoro-ai via HTTP
7. Response returned to frontend
```

---

## Dependencies

**Frontend (Next.js):**
- `@clerk/nextjs` (already installed)

**Backend (NestJS):**
- `@clerk/backend` or `@clerk/backend-api` (new, install)
- `svix` (webhook verification library, optional but recommended)

---

## Config Requirements

**Clerk Setup (External):**
- CLERK_SECRET_KEY environment variable (webhook secret)
- Webhook endpoint configured in Clerk dashboard: `https://api.totoro.example/api/v1/webhooks/clerk`
- Event subscribed: `user.created`

**NestJS Config:**
- `services/api/config/.local.yaml` updated with `ai` section
- Environment variable: `CLERK_SECRET_KEY` for webhook verification

---

## Testing Strategy

**Unit Tests:**
- Middleware: mock JWT verification, test public route bypass
- Guard: test ai_enabled flag checks, global kill switch
- Webhook handler: test signature verification, Clerk API call

**Integration Tests:**
- Auth flow: unauthenticated request → 401
- Protected route: authenticated request → 200
- AI endpoint: authenticated + ai_enabled=true → forwarded to totoro-ai
- AI endpoint: authenticated + ai_enabled=false → 403
- AI endpoint: global_kill_switch=true → 503
- Webhook: receive user.created event → publicMetadata updated

---

## Rollout

1. Install dependencies (`@clerk/backend`)
2. Add middleware + decorator + guard to NestJS
3. Add webhook handler
4. Update YAML config schema
5. Deploy to staging
6. Test end-to-end
7. Deploy to production
8. Monitor webhook delivery in Clerk dashboard
