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
│  - Schema owner: Prisma manages all migrations      │
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
5. totoro-ai returns 1 primary recommendation + 2 alternatives with reasoning.
6. services/api stores the recommendation in the recommendations table (for history and analytics).
7. services/api streams the response to apps/web.
8. apps/web renders the recommendation with reasoning text.

One HTTP call to totoro-ai. The agent runs autonomously. NestJS stores recommendation history only.

## API Contract (NestJS to totoro-ai)

| Endpoint               | Purpose                                     | NestJS Sends             | totoro-ai Returns                          |
| ---------------------- | ------------------------------------------- | ------------------------ | ------------------------------------------ |
| POST /v1/extract-place | Extract and validate a place from raw input | raw_input, user_id       | place_id, place metadata, confidence score |
| POST /v1/consult       | Get a recommendation from natural language  | query, user_id, location | 1 primary + 2 alternatives with reasoning  |

## Database Table Ownership

Prisma in this repo defines all tables and runs all migrations. Write ownership is split by domain.

NestJS writes and reads:

- users
- user_settings
- recommendations (history of consult results)

FastAPI writes and reads:

- places
- embeddings
- taste_model

Both services read from any table as needed. They write to different tables. No write conflicts.

One shared PostgreSQL instance. One schema owner (Prisma in this repo). Two connection strings with appropriate write permissions.

## Technology Stack

| Layer           | Technology                 | Notes                            |
| --------------- | -------------------------- | -------------------------------- |
| Frontend        | Next.js + Tailwind CSS     | Server and client components     |
| Auth            | Clerk                      | Free tier, 50K MAU               |
| Backend         | NestJS                     | Modular architecture             |
| ORM             | Prisma                     | Schema owner for all tables      |
| Database        | PostgreSQL + pgvector      | Vector similarity search         |
| Package Manager | Yarn (node-modules linker) |                                  |
| Monorepo        | Nx                         | Workspace with module boundaries |
| Runtime         | Node 20 LTS                |                                  |
| Frontend Deploy | Vercel                     | Free Hobby tier                  |
| Backend Deploy  | Railway                    | Hobby $5/mo                      |
| Local Dev       | Docker Compose             | Not used in production           |
