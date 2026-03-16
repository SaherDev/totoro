# System Architecture — Totoro (Product Repo)

## Overview

Totoro is split across two repositories. This repo (totoro) is the product layer. It owns the UI, authentication, user management, and recommendation history. It delegates all AI work to the totoro-ai repo over HTTP.

```
┌─────────────────────────────────────────────────────┐
│                    User (Browser)                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────┐
│              apps/web (Next.js + Clerk)              │
│  - UI rendering, client-side state                  │
│  - Clerk auth (frontend SDK)                        │
│  - Calls services/api via internal HTTP             │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (REST)
                       ▼
┌─────────────────────────────────────────────────────┐
│           services/api (NestJS + Prisma)             │
│  - Auth verification (Clerk backend SDK)            │
│  - User management and settings                     │
│  - Recommendation history storage                   │
│  - Forwards AI requests to totoro-ai                │
│  - Prisma manages product table migrations only      │
└────────────┬────────────────────┬───────────────────┘
             │ SQL (read-write)   │ HTTP (JSON)
             │                    │
             ▼                    ▼
┌──────────────────────┐  ┌──────────────────────────┐
│  PostgreSQL           │  │  totoro-ai (FastAPI)     │
│  + pgvector           │  │  - Extracts places       │
│                       │  │  - Generates embeddings  │
│  NestJS writes:       │  │  - Runs consult agent    │
│  - users              │  │  - Writes places,        │
│  - user_settings      │  │    embeddings, taste     │
│  - recommendations    │  │    model to PostgreSQL   │
│                       │  │                          │
│  FastAPI writes:      │  │                          │
│  - places             │  │                          │
│  - embeddings         │  │                          │
│  - taste_model        │  │                          │
└──────────────────────┘  └──────────────────────────┘
```

## What This Repo Owns

- All user-facing UI (Next.js)
- Authentication and authorization (Clerk)
- Database schema and all migrations (Prisma)
- User records and settings
- Recommendation history (storing what the AI returned for display and analytics)
- HTTP orchestration: receives user requests, forwards to totoro-ai, stores recommendation history

## What This Repo Does NOT Do

- Call LLM providers (OpenAI, Anthropic)
- Generate embeddings
- Run vector similarity search
- Call Google Places API
- Write place records or embeddings (FastAPI owns these)
- Touch Redis

## Data Flow: Share a Place

1. User sends raw input (URL, name, or screenshot) to apps/web.
2. apps/web sends the raw input to services/api via REST.
3. services/api verifies auth (Clerk), then forwards to totoro-ai via POST /v1/extract-place with user_id.
4. totoro-ai parses the input, validates against Google Places API, generates embedding, and writes both the place record and embedding to PostgreSQL directly.
5. totoro-ai returns a confirmation with the place_id and extracted metadata to NestJS.
6. services/api returns confirmation to apps/web.

One HTTP call to totoro-ai. FastAPI writes what it generates. NestJS does not touch place data.

## Data Flow: Consult (Recommend a Place)

1. User types intent (e.g., "cheap dinner nearby") in apps/web.
2. apps/web sends the query to services/api via REST.
3. services/api verifies auth, then forwards to totoro-ai via POST /v1/consult with user_id and location.
4. totoro-ai handles everything internally: parses intent, queries pgvector, calls Google Places for external candidates, validates open hours, runs ranking, generates response.
5. totoro-ai returns 1 primary recommendation + 2 alternatives with reasoning, plus an array of reasoning_steps showing what the agent did at each stage.
6. services/api stores the recommendation in the recommendations table (for history and analytics).
7. services/api returns the response to apps/web.
8. apps/web renders the recommendation with reasoning text and agent thinking steps.

One HTTP call to totoro-ai. The agent runs autonomously. NestJS stores recommendation history only.

Streaming note: The current flow uses a synchronous JSON response. When the frontend needs to show agent thinking in real time (instead of after the fact), the consult endpoint will add an SSE (Server-Sent Events) mode. In SSE mode, FastAPI streams reasoning steps as they complete, and NestJS proxies the SSE stream to the frontend. Until then, the reasoning_steps array in the synchronous response is sufficient.

## Data Flow: Recall (Retrieve Saved Places)

1. User types a memory fragment (e.g., "that ramen place I saved from TikTok") in apps/web.
2. apps/web sends the query to services/api via REST.
3. services/api verifies auth, then forwards to totoro-ai via POST /v1/recall with user_id and query.
4. totoro-ai performs vector search on the user's saved places, filters by similarity to the query, and returns matching results.
5. services/api returns the results to apps/web.
6. apps/web renders the list of saved places with match reasons.

One HTTP call to totoro-ai. Recall only searches saved places — no external discovery, no ranking, no taste model.

## API Contract (NestJS to totoro-ai)

| Endpoint               | Purpose                                     | NestJS Sends             | totoro-ai Returns                          |
| ---------------------- | ------------------------------------------- | ------------------------ | ------------------------------------------ |
| POST /v1/extract-place | Extract and validate a place from raw input | raw_input, user_id       | place_id, place metadata, confidence score |
| POST /v1/consult       | Get a recommendation from natural language  | query, user_id, location | 1 primary + 2 alternatives with reasoning  |
| POST /v1/recall        | Retrieve saved places matching memory       | query, user_id           | list of saved places matching query        |

## Database Table Ownership

Prisma in this repo defines and migrates product tables only. Alembic in totoro-ai defines and migrates AI tables. Write ownership is split by domain.

NestJS writes and reads:

- users
- user_settings
- recommendations (history of consult results)

FastAPI writes and reads:

- places
- embeddings
- taste_model

Both services read from any table as needed. They write to different tables. No write conflicts.

One shared PostgreSQL instance. Migration ownership split: Prisma owns users, user_settings, recommendations. Alembic in totoro-ai owns places, embeddings, taste_model. Never run Prisma migrations against AI tables. Two connection strings with appropriate write permissions.

## Technology Stack

| Layer           | Technology                 | Notes                            |
| --------------- | -------------------------- | -------------------------------- |
| Frontend        | Next.js + Tailwind CSS     | Server and client components     |
| Auth            | Clerk                      | Free tier, 50K MAU               |
| Backend         | NestJS                     | Modular architecture             |
| ORM             | Prisma                     | Schema owner for all tables      |
| Database        | PostgreSQL + pgvector      | Vector similarity search         |
| Package Manager | pnpm                       |                                  |
| Monorepo        | Nx                         | Workspace with module boundaries |
| Runtime         | Node 20 LTS               |                                  |
| Frontend Deploy | Vercel                     | Free Hobby tier                  |
| Backend Deploy  | Railway                    | Hobby $5/mo                      |
| Local Dev       | Docker Compose             | Not used in production           |

---

## Design Patterns

These are structural constraints that define how the system is layered.
They describe what lives where and what crosses which boundary.
Behavioral and implementation patterns live in docs/decisions.md.

### Facade — Controllers
Controllers are the HTTP entry point only. Each controller method
makes exactly one service call and returns the result. No Prisma
queries, no AiServiceClient calls, no business logic appear inside
any controller file. All orchestration lives in the service layer.
Guards and pipes via decorators do not count as logic inside the
method body.

### Interface — Swappable Dependencies
Any external dependency lives behind a TypeScript interface.
Controllers and services import the interface only, injected via
NestJS dependency injection. No concrete class is imported directly
in business logic. Concrete implementations live in their domain
module or in a shared provider if used across multiple modules.
AiServiceClient is the reference example.

### Strategy — HTTP Transport (apps/web)
All HTTP calls from apps/web go through the HttpClient interface.
Concrete transports live in apps/web/src/api/transports/. Nothing
outside apps/web/src/api/ imports fetch or any HTTP library directly.
