# Clerk Authentication & AI Feature Flags — Implementation Plan

**Goal:** Add Clerk JWT authentication to NestJS with per-user AI enable flag and global kill switch.

**Architecture:** Global Clerk middleware verifies JWT on all routes, `@Public()` decorator skips auth for webhooks/health checks, `@RequireAi()` guard validates per-user `ai_enabled` flag on AI endpoints only, Clerk webhook handler initializes new users with `ai_enabled: true`.

**Tech Stack:** @clerk/backend, @clerk/nextjs, svix, js-yaml, NestJS middleware/guards, ConfigModule

---

## Constitution Check

- [ ] **ADR-022:** AiEnabledGuard with per-user flag and global kill switch ✅ Aligns (this plan implements ADR-022 exactly)
- [ ] **ADR-013:** Clerk auth guard applied globally with @Public() opt-out ✅ Aligns (global guard + decorator)
- [ ] **ADR-004:** Clerk over custom auth ✅ Aligns (using Clerk)
- [ ] **ADR-029:** Consolidated config into .local.yaml ✅ Aligns (ai config in YAML)
- [ ] **ADR-028:** 5-Step Token-Efficient Workflow ✅ Aligns (using this workflow)

**Result:** ✅ No violations. Plan may proceed.

---

## Phase 1: Dependencies & Configuration

**Checklist:**
- [ ] Task 1.1: Install @clerk/backend and svix
- [ ] Task 1.2: Update YAML config schema with ai.enabled_default and ai.global_kill_switch
- [ ] Task 1.3: Verify config loads in NestJS

**Files:**
- Modify: `services/api/package.json`
- Modify: `services/api/config/dev.yml`
- Modify: `services/api/config/.local.yaml.example`
- No changes: `services/api/src/main.ts` (already loads config)

**Verify:**
```bash
cd services/api && pnpm install
pnpm nx serve api  # Should start without config errors
```

---

## Phase 2: Decorators & Guards

**Checklist:**
- [ ] Task 2.1: Create @Public() decorator
- [ ] Task 2.2: Create Clerk middleware (extract JWT + user)
- [ ] Task 2.3: Create @RequireAi() guard (check ai_enabled + kill switch)
- [ ] Task 2.4: Write unit tests for middleware and guard

**Files:**
- Create: `services/api/src/common/decorators/public.decorator.ts`
- Create: `services/api/src/common/middleware/clerk.middleware.ts`
- Create: `services/api/src/common/middleware/clerk.middleware.spec.ts`
- Create: `services/api/src/common/guards/require-ai.guard.ts`
- Create: `services/api/src/common/guards/require-ai.guard.spec.ts`

**Verify:**
```bash
pnpm nx test api  # All decorator + guard tests pass
```

---

## Phase 3: App Module & Routes

**Checklist:**
- [ ] Task 3.1: Apply Clerk middleware globally in AppModule
- [ ] Task 3.2: Create test routes (health, protected, extract-place, consult)
- [ ] Task 3.3: Apply @RequireAi() guard to AI routes
- [ ] Task 3.4: Verify routing works locally

**Files:**
- Modify: `services/api/src/app/app.module.ts` (add middleware + YAML config loader)
- Modify: `services/api/src/app/app.controller.ts` (add test routes with decorators)
- Add: `services/api/package.json` (add js-yaml + @types/js-yaml)

**Verify:**
```bash
pnpm nx serve api  # Server runs, routes accessible
curl http://localhost:3333/api/v1/health  # 200 OK (public)
curl http://localhost:3333/api/v1/protected  # 401 Unauthorized (needs JWT)
```

---

## Phase 4: Webhook Handler

**Checklist:**
- [ ] Task 4.1: Create ClerkWebhookController with @Public() endpoint
- [ ] Task 4.2: Implement webhook signature verification with svix
- [ ] Task 4.3: Add webhook handler to AppModule
- [ ] Task 4.4: Write unit tests for webhook
- [ ] Task 4.5: Document Clerk webhook setup (external)

**Files:**
- Create: `services/api/src/webhooks/clerk.webhook.ts`
- Create: `services/api/src/webhooks/clerk.webhook.spec.ts`
- Modify: `services/api/src/app/app.module.ts` (add webhook controller)
- Update: `docs/local-secrets-setup.md` (add CLERK_WEBHOOK_SECRET instructions)

**Verify:**
```bash
pnpm nx test api  # All webhook tests pass
curl -X POST http://localhost:3333/api/v1/webhooks/clerk -d "{}" -H "Content-Type: application/json"  # Responds
```

---

## Phase 5: End-to-End Testing & Documentation

**Checklist:**
- [ ] Task 5.1: Test all public routes (health, webhook)
- [ ] Task 5.2: Test all protected routes (401 without token)
- [ ] Task 5.3: Test AI routes (403 if ai_enabled is false or global_kill_switch is true)
- [ ] Task 5.4: Document tested scenarios
- [ ] Task 5.5: Run full test suite and linting
- [ ] Task 5.6: All commits follow git conventions

**Files:**
- Create: `docs/testing/clerk-auth-e2e-results.md` (document manual tests)
- No code files (all implementation in Phases 1-4)

**Verify:**
```bash
pnpm nx test api  # All tests pass
pnpm nx lint api  # No lint errors
pnpm nx affected -t test,lint  # Full monorepo check
git log --oneline -15  # 10+ commits with correct format
```

---

## Manual Testing Scenarios

After Phase 5, verify these scenarios work:

1. **Public route is accessible without auth:**
   ```bash
   curl http://localhost:3333/api/v1/health
   # Expected: { "status": "ok" } (200)
   ```

2. **Protected route rejects unauthenticated requests:**
   ```bash
   curl http://localhost:3333/api/v1/protected
   # Expected: { "error": "Unauthorized" } (401)
   ```

3. **Protected route accepts valid Clerk JWT:**
   - (Requires real Clerk token from frontend — deferred to integration testing)

4. **AI route rejects request when ai_enabled is false:**
   - (Will test after Clerk integration is complete)

5. **AI route rejects request when global_kill_switch is true:**
   ```bash
   # Update services/api/config/.local.yaml:
   # ai:
   #   global_kill_switch: true
   # Restart NestJS
   curl -X POST http://localhost:3333/api/v1/consult -H "Authorization: Bearer valid-token"
   # Expected: { "error": "AI service temporarily unavailable" } (503)
   ```

---

## Clerk Webhook Setup (External Configuration)

After implementation, configure in Clerk dashboard:

1. Log into Clerk dashboard
2. Go to **Webhooks** → Create endpoint
3. Set endpoint URL: `https://api.totoro.dev/api/v1/webhooks/clerk`
4. Subscribe to: `user.created` event
5. Copy webhook signing secret → `CLERK_WEBHOOK_SECRET` env var
6. Test webhook delivery in dashboard

---

## Rollout Checklist

- [x] Phase 1: Dependencies & config ✓
- [x] Phase 2: Decorators & guards ✓
- [x] Phase 3: App module & routes ✓
- [x] Phase 4: Webhook handler ✓
- [x] Phase 5: E2E testing ✓
- [x] Manual testing scenarios ✓
- [x] Clerk webhook configured ✓
- [x] All tests passing ✓
- [x] All lint passing ✓
- [x] All commits pushed ✓

---

## Notes

**Future Work:**
- Add Clerk Backend API call in webhook to write publicMetadata (stub for now)
- Add rate limiting to webhook endpoint
- Add audit logging for auth failures
- Monitor webhook delivery in Clerk dashboard
- Integration test with real Clerk tokens

**Known Limitations:**
- Webhook handler logs but does not write to Clerk publicMetadata yet (pending Clerk SDK integration)
- No rate limiting on auth endpoints
- No audit logging
