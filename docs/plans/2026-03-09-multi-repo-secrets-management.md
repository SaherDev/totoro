# Multi-Repo Secrets Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate secrets from centralized totoro-config to per-repo local configs, enabling independent secret management without external dependencies.

**Architecture:** Each repo owns its secrets locally via gitignored config files: NestJS and FastAPI use `config/.local.yaml`, Next.js uses `.env.local`. Each includes a `.example` template in git. Secrets are never committed, but the schema is documented for developers. This decouples repos from totoro-config and eliminates the centralized env-setup.sh.

**Tech Stack:** YAML for NestJS/FastAPI (ADR-003, ADR-012), plaintext `.env` for Next.js (frontend standard), gitignore for all local configs.

---

## Constitution Check

**Relevant ADRs:**
- [ ] ADR-001: Nx monorepo tool ✅ COMPLIES — Nx manages all repos, no tooling changes
- [ ] ADR-003: YAML config for non-secrets ✅ COMPLIES — Using YAML for NestJS/FastAPI secrets (extends ADR-003 from non-secrets to secrets locally)
- [ ] ADR-012: ConfigModule with YAML loader ✅ COMPLIES — Leveraging existing ConfigModule, extending to load `.local.yaml`
- [ ] ADR-020: pnpm package manager ✅ COMPLIES — No package manager changes

**New ADRs to create:**
- **ADR-025:** Per-repo local secrets management (YAML for NestJS/FastAPI, .env for Next.js)
- **ADR-026:** Deprecate centralized totoro-config for secrets
- **ADR-027:** Secrets schema documentation in `.example` templates

**Violations:** None. This extends existing patterns without breaking constraints.

**Proceed:** ✅ YES

---

## Phase 1: Document ADRs and Update API Contracts

**Checklist:**
- [x] Task 1.1: Create ADR-025 (per-repo local secrets) ✅ (already in decisions.md)
- [x] Task 1.2: Create ADR-026 (deprecate centralized totoro-config) ✅ (already in decisions.md)
- [x] Task 1.3: Create ADR-027 (secrets schema documentation) ✅ (already in decisions.md)
- [x] Task 1.4: Update docs/decisions.md with three new ADRs ✅ (ADRs added)

**Files:**
- Modify: `totoro/docs/decisions.md`
- Reference: `totoro-ai/docs/decisions.md` (mirror the ADRs)

**Verify:**
```bash
# Check ADRs are added to both repos
grep -n "ADR-025\|ADR-026\|ADR-027" totoro/docs/decisions.md
grep -n "ADR-025\|ADR-026\|ADR-027" totoro-ai/docs/decisions.md
```

---

## Phase 2: Set up NestJS Local Secrets (totoro/services/api)

**Checklist:**
- [x] Task 2.1: Create `services/api/config/.local.yaml.example` with all required secret placeholders ✅ (Clerk auth Phase 1)
- [x] Task 2.2: Create empty `services/api/config/.local.yaml` (developer creates on first run) ✅ (Clerk auth Phase 1)
- [x] Task 2.3: Add `.local.yaml` to `.gitignore` in totoro repo ✅ (already in place)
- [x] Task 2.4: Update NestJS ConfigModule to load `.local.yaml` and merge with environment-specific config ✅ (Clerk auth Phase 3)
- [x] Task 2.5: Update CLAUDE.md and docs to reference local config instead of env-setup.sh ✅ (Clerk auth - docs/local-secrets-setup.md)
- [x] Task 2.6: Test that NestJS starts and loads secrets from `.local.yaml` ✅ (Clerk auth Phase 5 verification)

**Files:**
- Create: `services/api/config/.local.yaml.example`
- Create: `services/api/config/.local.yaml` (initially empty, developers populate)
- Modify: `totoro/.gitignore` (add `**/config/.local.yaml`)
- Modify: `services/api/src/main.ts` or `app.module.ts` (ConfigModule enhancement)
- Modify: `CLAUDE.md` (remove env-setup.sh references)
- Modify: `docs/architecture.md` (update config strategy section)
- Test: `services/api` runs with `.local.yaml` secrets

**Verify:**
```bash
cd totoro
pnpm nx serve api
# NestJS should start on port from .local.yaml
curl http://localhost:3333/api/v1/health
```

---

## Phase 3: Set up FastAPI Local Secrets (totoro-ai)

**Checklist:**
- [ ] Task 3.1: Create `config/.local.yaml.example` with all required secret placeholders
- [ ] Task 3.2: Create empty `config/.local.yaml` (developer creates on first run)
- [ ] Task 3.3: Add `.local.yaml` to `.gitignore` in totoro-ai repo
- [ ] Task 3.4: Update FastAPI config loader to read `.local.yaml` and merge with environment-specific config
- [ ] Task 3.5: Update README/docs to reference local config setup
- [ ] Task 3.6: Test that FastAPI starts and loads secrets from `.local.yaml`

**Files:**
- Create: `config/.local.yaml.example` (totoro-ai root)
- Create: `config/.local.yaml` (initially empty, developers populate)
- Modify: `.gitignore` (add `config/.local.yaml`)
- Modify: FastAPI config loading logic (YAML merge order)
- Modify: `README.md` or dev setup docs
- Test: FastAPI runs with `.local.yaml` secrets

**Verify:**
```bash
cd totoro-ai
python -m uvicorn app.main:app --reload
# FastAPI should start using .local.yaml secrets
curl http://localhost:8000/health
```

---

## Phase 4: Set up Next.js Local Secrets (totoro/apps/web)

**Checklist:**
- [ ] Task 4.1: Create `apps/web/.env.local.example` with all required secret placeholders
- [ ] Task 4.2: Create empty `apps/web/.env.local` (developer creates on first run)
- [ ] Task 4.3: Add `.env.local` to `.gitignore` in totoro repo (likely already there)
- [ ] Task 4.4: Document Next.js env var loading in CLAUDE.md
- [ ] Task 4.5: Test that Next.js loads secrets from `.env.local`

**Files:**
- Create: `apps/web/.env.local.example`
- Create: `apps/web/.env.local` (initially empty, developers populate)
- Verify: `totoro/.gitignore` includes `.env.local` and `*.local*`
- Modify: `CLAUDE.md` (add Next.js secrets setup)
- Test: `apps/web` runs with `.env.local` secrets

**Verify:**
```bash
cd totoro
pnpm nx dev web
# Next.js should start using .env.local secrets
curl http://localhost:4200
```

---

## Phase 5: Update Documentation and Developer Onboarding

**Checklist:**
- [ ] Task 5.1: Update `CLAUDE.md` in both repos to describe local secrets setup
- [ ] Task 5.2: Create `docs/local-secrets-setup.md` (one-time setup guide for developers)
- [ ] Task 5.3: Update `.github/workflows/` CI/CD to inject secrets as env vars (not read from config files)
- [ ] Task 5.4: Document in ADRs the secrets schema expected in `.local.yaml.example` and `.env.local.example`
- [ ] Task 5.5: Update `docs/architecture.md` (configuration strategy section) with new secrets approach

**Files:**
- Create: `docs/local-secrets-setup.md` (totoro repo)
- Modify: `CLAUDE.md` (both repos)
- Modify: `.github/workflows/*.yml` (if CI/CD exists)
- Modify: `docs/architecture.md` (totoro)
- Reference: `totoro-ai/README.md` or equivalent

**Verify:**
```bash
# Check docs are updated
grep -n "\.local\.yaml\|\.env\.local" docs/*.md CLAUDE.md
```

---

## Phase 6: Clean Up Centralized totoro-config

**Checklist:**
- [ ] Task 6.1: Review totoro-config repo for `.env.*` files and env-setup.sh
- [ ] Task 6.2: Remove `.env.development`, `.env.production`, `.env.test`, etc. from totoro-config
- [ ] Task 6.3: Remove `scripts/env-setup.sh` from totoro-config
- [ ] Task 6.4: Verify no other repos reference totoro-config for secrets
- [ ] Task 6.5: Commit the cleanup with message "chore: deprecate centralized secrets per ADR-026"

**Files:**
- Delete: `totoro-config/.env.*` (all environment-specific files)
- Delete: `totoro-config/scripts/env-setup.sh`
- Modify: `totoro-config/README.md` (note deprecation of secrets management)

**Verify:**
```bash
cd totoro-config
git status
# Should show deleted .env.* and env-setup.sh
```

---

## Verify All

- [ ] Run: `pnpm nx affected -t test,lint` (totoro repo)
- [ ] Run: FastAPI tests (if applicable, totoro-ai repo)
- [ ] All tests pass
- [ ] All lint passes
- [ ] All types check
- [ ] Developers can run full stack using local `.local.yaml` and `.env.local` files
- [ ] CI/CD still works (secrets injected as env vars in pipeline)

---

## Example Secrets Schema

### NestJS/FastAPI `.local.yaml.example`

```yaml
# Port configuration
port: 3333  # NestJS: 3333, FastAPI: 8000

# Database
database:
  url: postgresql://user:password@localhost:5432/totoro_dev

# AI Service (NestJS only)
ai_service:
  base_url: http://localhost:8000
  enabled: true

# Third-party APIs
clerk:
  secret_key: sk_test_xxxxx
  publishable_key: pk_test_xxxxx

google_places:
  api_key: AIzaSyxxxxx

openai:
  api_key: sk-xxxxx

# Optional: Redis (FastAPI only)
redis:
  url: redis://localhost:6379
```

### Next.js `.env.local.example`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

---

## Rollout Strategy

1. **Develop locally** — Follow Phase 1-6 with branches per repo
2. **Test locally** — All three services (NestJS, FastAPI, Next.js) run with local configs
3. **Update CI/CD** — Secrets injected as env vars (not read from configs)
4. **Deprecate totoro-config** — Remove from all dependency tracking
5. **Announce to team** — Document onboarding in CLAUDE.md and local-secrets-setup.md
