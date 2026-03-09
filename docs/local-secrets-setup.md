# Local Secrets Setup — Totoro Product Repo

This document describes how to configure secrets for local development. All secrets are shell-exported via `scripts/env-setup.sh` and are **never** stored in version control.

## Overview

Secrets are managed per environment:

- **Development**: Shell environment variables from `scripts/env-setup.sh` (gitignored)
- **Production**: Managed by deployment platform (Vercel for frontend, Railway for backend)

Locally, you must create `scripts/env-setup.sh` from the template and populate it with your own secrets. This file is gitignored and never committed.

---

## Backend (NestJS) Setup

### 1. CLERK_SECRET_KEY

Used by NestJS to verify Clerk JWT tokens in the ClerkMiddleware.

**How to get it:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **API Keys** (left sidebar)
3. Copy the **Secret Key** (starts with `sk_live_` or `sk_test_`)

**Add to `scripts/env-setup.sh`:**

```bash
export CLERK_SECRET_KEY="sk_test_xxx..."
```

**Verify it works:**

```bash
source scripts/env-setup.sh
echo $CLERK_SECRET_KEY  # Should print your key
```

---

## Webhook Setup

### 2. CLERK_WEBHOOK_SECRET

Used by NestJS to verify incoming webhook signatures from Clerk using the svix library.

When Clerk sends a webhook event (e.g., `user.created`), it includes a signature header. The webhook controller verifies this signature to ensure the event is authentic.

**How to set up the webhook:**

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks** (left sidebar under "Integrations")
3. Click **Create Endpoint**
4. Set the endpoint URL:
   - **Local development:** `http://localhost:3333/api/v1/webhooks/clerk`
   - **Production:** `https://api.totoro.dev/api/v1/webhooks/clerk` (will vary by deployment URL)
5. Subscribe to events:
   - Select **user.created** (and any other events you want to handle)
6. Click **Create** or **Save**
7. Copy the **Signing Secret** (starts with `whsec_`)

**Add to `scripts/env-setup.sh`:**

```bash
export CLERK_WEBHOOK_SECRET="whsec_xxx..."
```

**Verify it works:**

```bash
source scripts/env-setup.sh
echo $CLERK_WEBHOOK_SECRET  # Should print your key
```

---

## Environment Variable Setup

### Complete env-setup.sh Template

Create `scripts/env-setup.sh` with the following content. This file is gitignored:

```bash
#!/bin/bash
# scripts/env-setup.sh
# Local development secrets
# IMPORTANT: Never commit this file. It is gitignored.

# Clerk Authentication
export CLERK_SECRET_KEY="sk_test_xxx..."
export CLERK_WEBHOOK_SECRET="whsec_xxx..."

# Database (if using locally)
# export DATABASE_URL="postgresql://user:password@localhost:5432/totoro"

# AI Service (FastAPI backend)
# export AI_SERVICE_BASE_URL="http://localhost:8000"
```

### Load secrets in your shell session

Before running the development servers, load the secrets:

```bash
source scripts/env-setup.sh
```

Or add to your shell profile (`~/.zshrc`, `~/.bashrc`) to auto-load:

```bash
# At the end of ~/.zshrc or ~/.bashrc
source /path/to/totoro/scripts/env-setup.sh 2>/dev/null
```

---

## Verification Checklist

After setting up secrets:

- [ ] `scripts/env-setup.sh` exists and is in `.gitignore`
- [ ] `source scripts/env-setup.sh` runs without errors
- [ ] `echo $CLERK_SECRET_KEY` prints your Clerk secret
- [ ] `echo $CLERK_WEBHOOK_SECRET` prints your webhook secret
- [ ] NestJS starts without "missing secret key" errors
- [ ] Webhook endpoint responds to POST requests

---

## Troubleshooting

### "CLERK_SECRET_KEY not configured" error

**Problem:** The environment variable is not loaded.

**Solution:**
1. Run `source scripts/env-setup.sh` in the same shell session
2. Verify with `echo $CLERK_SECRET_KEY`
3. Then start the server: `pnpm nx serve api`

### "CLERK_WEBHOOK_SECRET not configured" warning

**Problem:** The webhook endpoint was called but the secret is missing.

**Solution:**
1. Ensure webhook secret is set in `scripts/env-setup.sh`
2. Run `source scripts/env-setup.sh`
3. Test the webhook by sending a request from Clerk dashboard (under Webhooks → "Send test event")

### Webhook signature verification failed

**Problem:** Signature verification is rejected even though the secret is set.

**Possible causes:**
- The signing secret in `scripts/env-setup.sh` doesn't match Clerk's dashboard
- The webhook endpoint URL changed (e.g., from localhost to production)
- The raw request body was modified before verification

**Solution:**
1. Double-check the signing secret in your `scripts/env-setup.sh` matches Clerk dashboard
2. If testing locally, ensure your ngrok tunnel or local URL matches the endpoint URL in Clerk
3. Verify the endpoint URL in Clerk's webhook settings is correct

---

## Advanced: Testing Webhooks Locally

To test webhooks without deploying to production:

1. Use [ngrok](https://ngrok.com/) or similar tunnel to expose your local server:
   ```bash
   ngrok http 3333
   ```
   This gives you a public URL like `https://abc123.ngrok.io`

2. Update the webhook endpoint URL in Clerk dashboard to:
   ```
   https://abc123.ngrok.io/api/v1/webhooks/clerk
   ```

3. In Clerk dashboard, find the webhook and click **Send test event** to trigger a test event

4. Check your NestJS logs to see if the webhook was received and verified

---

## Related

- See @.claude/rules/standards.md for the general "zero hardcoding" principle
- See @docs/architecture.md for how Clerk integrates with the system
- See CLAUDE.md → Notes section for why we use shell exports instead of `.env` files
