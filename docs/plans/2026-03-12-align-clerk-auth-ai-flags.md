# Plan: Align Clerk Auth + AI Flags with Installed Skill Patterns

## Context

The Clerk auth implementation is partially complete but has deviations from the patterns recommended by the `clerk-nextjs-skills` and `nestjs-expert` installed skills. The most critical gap is a missing `middleware.ts` in the Next.js app — without it, no edge-level route protection exists and server-side auth is inert. On the backend, the AI guard needs renaming and a companion decorator to match the `nestjs-expert` convention for reusable guard application.

---

## Current State

### Frontend (`apps/web`)

| Concern | Status |
|---------|--------|
| `ClerkProvider` in `providers.tsx` | ✅ Present |
| `clerkMiddleware()` in `middleware.ts` | ❌ Missing — no middleware.ts file |
| `useAuth().getToken()` client-side usage | ✅ Present in `page.tsx` |
| `useApiClient()` hook to wire token into `FetchClient` | ❌ Missing — `hooks.ts` doesn't exist |

The missing `middleware.ts` is the "proxy.ts setup" referenced in the task. Without it, Clerk never initialises a server-side session and all routes are fully open to unauthenticated users.

### Backend (`services/api`)

| Concern | Status |
|---------|--------|
| `ClerkMiddleware` JWT verification | ✅ Correct |
| AI guard exists and logic is correct | ✅ Correct logic |
| Guard named `RequireAiGuard` (task requires `AiEnabledGuard`) | ❌ Wrong name |
| `@RequiresAi()` shorthand decorator | ❌ Missing |
| `@Public()` JSDoc says "middleware checks this metadata" — middleware actually uses URL path matching | ❌ Misleading |
| `declare global` block duplicated between `clerk.middleware.ts` and `app.controller.ts` | ❌ Duplicate |

---

## Changes

### 1. Create `apps/web/src/middleware.ts` (critical)

Add Clerk's `clerkMiddleware()` using the Next.js App Router pattern from `@clerk/nextjs/server`. All non-public routes are protected. Public routes are the sign-in and sign-up pages.

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### 2. Rename `RequireAiGuard` → `AiEnabledGuard`

Rename class and files to match `nestjs-expert` naming conventions.

- Rename: `require-ai.guard.ts` → `ai-enabled.guard.ts`
- Rename: `require-ai.guard.spec.ts` → `ai-enabled.guard.spec.ts`
- Update class name `RequireAiGuard` → `AiEnabledGuard` in both files
- Update import in `app.module.ts`
- Update import + usage in `app.controller.ts`

### 3. Create `@RequiresAi()` decorator

Add `services/api/src/common/decorators/requires-ai.decorator.ts`:

```ts
import { UseGuards, applyDecorators } from '@nestjs/common';
import { AiEnabledGuard } from '../guards/ai-enabled.guard';

export const RequiresAi = () => applyDecorators(UseGuards(AiEnabledGuard));
```

Update `app.controller.ts` to use `@RequiresAi()` instead of `@UseGuards(RequireAiGuard)` on both `extract-place` and `consult` endpoints.

### 4. Fix `@Public()` decorator JSDoc

The current comment says "ClerkMiddleware checks for this metadata" — this is false. The middleware uses URL path matching via `auth.public_paths` config. Fix the JSDoc to describe actual behaviour.

### 5. Remove duplicate `declare global` from `app.controller.ts`

The Express Request augmentation (`namespace Express { interface Request { user?: ClerkUser } }`) is already defined in `clerk.middleware.ts`. Remove the duplicate from `app.controller.ts` and the now-unused `ClerkUser` import.

### 6. Create `apps/web/src/api/hooks.ts`

Wire `useAuth().getToken` into `createApiClient()` for use in client components. This satisfies the `useApiClient()` reference in `client.ts` JSDoc and the TODO in `page.tsx`.

```ts
'use client';

import { useAuth } from '@clerk/nextjs';
import { createApiClient } from './client';

export function useApiClient() {
  const { getToken } = useAuth();
  return createApiClient(() => getToken().then(t => t ?? ''));
}
```

---

## Files

| File | Action |
|------|--------|
| `apps/web/src/middleware.ts` | CREATE |
| `apps/web/src/api/hooks.ts` | CREATE |
| `services/api/src/common/guards/ai-enabled.guard.ts` | CREATE (renamed from `require-ai.guard.ts`) |
| `services/api/src/common/guards/ai-enabled.guard.spec.ts` | CREATE (renamed from `require-ai.guard.spec.ts`) |
| `services/api/src/common/guards/require-ai.guard.ts` | DELETE |
| `services/api/src/common/guards/require-ai.guard.spec.ts` | DELETE |
| `services/api/src/common/decorators/requires-ai.decorator.ts` | CREATE |
| `services/api/src/common/decorators/public.decorator.ts` | EDIT — fix JSDoc |
| `services/api/src/app/app.controller.ts` | EDIT — use @RequiresAi(), remove duplicate declare global |
| `services/api/src/app/app.module.ts` | EDIT — update import to AiEnabledGuard |

---

## Verification

```bash
# Run API tests — all guard and middleware specs must pass
pnpm nx test api

# Run frontend tests
pnpm nx test web

# Lint check
pnpm nx lint api
pnpm nx lint web
```

**Manual check:** Start the API (`pnpm nx serve api`) and confirm guard still blocks requests when AI is disabled and allows when enabled.
