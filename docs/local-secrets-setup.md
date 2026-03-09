# Local Secrets Setup Guide

This guide explains how to set up local secrets for running Totoro in development. See ADR-025, ADR-026, ADR-027 for the architectural decisions.

## Overview

Each service (NestJS API, Next.js frontend) manages its own secrets locally via gitignored config files:

- **NestJS** (`services/api/config/.local.yaml`) — database, Clerk keys
- **Next.js** (`apps/web/.env.local`) — Clerk frontend keys, API URLs

Secrets are **never** committed to git. Each service includes a `.example` template file that documents required keys and their format.

---

## Setup: NestJS API

### 1. Copy the example template

```bash
cd services/api/config
cp .local.yaml.example .local.yaml
```

### 2. Fill in your values

Open `services/api/config/.local.yaml` and replace placeholders with actual values:

```yaml
# Database Connection
database:
  url: postgresql://user:password@localhost:5432/totoro_dev

# Clerk Authentication
clerk:
  secret_key: sk_test_xxxxxxxxxxxxx
  publishable_key: pk_test_xxxxxxxxxxxxx
```

### 3. Start NestJS

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
pnpm nx serve api
# Should start on http://localhost:3333/api/v1
```

---

## Setup: Next.js Frontend

### 1. Copy the example template

```bash
cd apps/web
cp .env.local.example .env.local
```

### 2. Fill in your values

Open `apps/web/.env.local` and replace placeholders:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

### 3. Start Next.js

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
pnpm nx dev web
# Should start on http://localhost:4200
```

---

## Getting Secrets

### Clerk Keys

1. Go to https://dashboard.clerk.com
2. Select your application
3. Copy **Secret Key** and **Publishable Key**
4. Paste into `.local.yaml` (API) and `.env.local` (Next.js)

### Database URL

For local PostgreSQL:

```
postgresql://postgres:password@localhost:5432/totoro_dev
```

For Railway (staging/production):

```
postgresql://user:password@railway-host.railway.app:5432/totoro_db
```

Contact the team for the URL if developing against shared infrastructure.

---

## Troubleshooting

**"PORT environment variable is not set"**

Make sure `.local.yaml` is in `services/api/config/` with a valid port number, OR pass `PORT=3333` as an environment variable.

**"DATABASE_URL is missing"**

Ensure `database.url` is defined in `.local.yaml`.

**"Cannot find module 'yaml'"**

Run `pnpm install` to install dependencies.

---

## CI/CD

In production (GitHub Actions, Railway, etc.), secrets are injected as environment variables. Local `.local.yaml` and `.env.local` files are never deployed.
