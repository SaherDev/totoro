# System Architecture — Totoro (Product Repo)

## Overview

Totoro is an AI-native place decision engine. The AI IS the product. This repo (totoro) is the product layer: a thin gateway that authenticates requests, forwards AI work to the AI service, and owns all database writes. The AI repo (totoro-ai) is the autonomous brain that runs the entire AI pipeline. The two repos communicate over HTTP only.

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
│  - Forwards AI requests to totoro-ai                │
│  - Writes all data to PostgreSQL                    │
│  - Simple CRUD for non-AI operations                │
└────────────┬────────────────────────────────────────┘
             │ SQL (read-write, Prisma ORM)
             ▼
┌────────────────────────────────────────────────────┐
│              PostgreSQL + pgvector                   │
│  - Place records, user data, taste model updates    │
│  - Embedding vectors (written by NestJS,            │
│    read by totoro-ai via read-only connection)      │
└────────────────────────────────────────────────────┘
```

## Service Roles

### NestJS: Thin Gateway + Data Owner

NestJS does four things and nothing more:

1. **Authenticates every request** (Clerk)
2. **Forwards AI requests** to FastAPI with user context (user_id, location)
3. **Writes all data** to PostgreSQL (place records, embeddings, taste model updates)
4. **Simple CRUD** for non-AI operations (list places, delete a place, update settings)

### FastAPI (totoro-ai): Autonomous AI Brain + Read-Only DB Access

FastAPI owns the entire AI pipeline:

- Extracts place data from raw user input (URLs, text, screenshots)
- Calls Google Places API directly to validate and discover places
- Calls LLM providers directly (GPT-4o-mini, Claude)
- Generates embeddings
- Runs vector similarity search against pgvector (direct read-only access to PostgreSQL)
- Builds and reads the taste model
- Runs the ranking logic
- Orchestrates the full agent graph via LangGraph
- Caches LLM responses in Redis

## Why This Split

**One service owns all writes.** NestJS writes place data AND embeddings to PostgreSQL. Prisma manages all migrations. No two ORMs writing to the same tables. No distributed write conflicts. If something goes wrong with data, you look in one place.

**FastAPI gets read-only database access.** Vector similarity search is core AI logic. It belongs in the AI repo. If the LangGraph agent needs to retrieve saved places during a consult, it runs the pgvector query directly. No HTTP round trip back to NestJS. No pausing the agent graph to wait for data from another service. The agent stays autonomous and fast.

**FastAPI calls external APIs that are part of the AI pipeline.** Google Places is a tool the agent uses mid-reasoning. If the agent had to call NestJS, wait for NestJS to call Google, wait for the response, then continue, that would be unnecessary coupling in the agent orchestration. The agent needs direct access to its tools.

**Redis is FastAPI-only.** LLM response caching, session context, intermediate agent state. NestJS has no reason to touch Redis.

## What This Repo Owns

- All user-facing UI (Next.js)
- Authentication and authorization (Clerk)
- Database schema and all migrations (Prisma)
- All database writes: place records, embeddings, recommendations, taste model updates
- Business logic and CRUD (list places, delete place, update settings)
- HTTP orchestration: receives user requests, forwards to totoro-ai, persists results

## What This Repo Does NOT Do

- Call LLM providers (OpenAI, Anthropic)
- Generate embeddings
- Run vector similarity search
- Call Google Places API
- Touch Redis
- Run any AI logic

## Data Flow: Share a Place

1. User sends raw input (URL, name, or screenshot) to apps/web.
2. apps/web sends the raw input to services/api via REST.
3. services/api verifies auth (Clerk), then forwards to totoro-ai via POST /v1/extract-place with user_id.
4. totoro-ai parses the input, calls Google Places to validate, generates embedding, and returns structured place data + embedding vector.
5. services/api writes both the place record and the embedding to PostgreSQL.
6. services/api returns confirmation to apps/web.

One HTTP call to totoro-ai. One write operation to the database.

## Data Flow: Consult (Recommend a Place)

1. User types intent (e.g., "cheap dinner nearby") in apps/web.
2. apps/web sends the query to services/api via REST.
3. services/api verifies auth, then forwards to totoro-ai via POST /v1/consult with user_id and location.
4. totoro-ai agent starts: parses intent, reads saved places via pgvector (direct read-only query), calls Google Places for external candidates, validates open hours, runs ranking, generates response.
5. totoro-ai returns 1 primary recommendation + 2 alternatives with reasoning.
6. services/api persists the recommendation and streams the response to apps/web.
7. apps/web renders the recommendation with reasoning text.

One HTTP call to totoro-ai. The agent runs autonomously. No mid-pipeline callbacks to NestJS.

## API Contract (NestJS to totoro-ai)

| Endpoint               | Purpose                                     | NestJS Sends             | totoro-ai Returns                         |
| ---------------------- | ------------------------------------------- | ------------------------ | ----------------------------------------- |
| POST /v1/extract-place | Extract and validate a place from raw input | raw_input, user_id       | structured place data + embedding vector  |
| POST /v1/consult       | Get a recommendation from natural language  | query, user_id, location | 1 primary + 2 alternatives with reasoning |

See @docs/api-contract.md for full request/response schemas.

## Database Ownership

**Why read-only for FastAPI?** Because write ownership matters. If both services write to the same tables, you get race conditions, conflicting updates, and debugging nightmares. Read-only access gives FastAPI everything it needs for AI operations without creating write conflicts.

NestJS (read-write via Prisma):

- users
- places
- embeddings
- recommendations
- taste_model_updates

totoro-ai (read-only via direct connection):

- places (for retrieval context)
- embeddings (for vector similarity search)
- taste_model_updates (for ranking input)

totoro-ai (read-write):

- Redis only (LLM cache, session state, intermediate agent state)

One shared PostgreSQL instance. One migration owner (Prisma in this repo). Two connection strings: NestJS read-write, totoro-ai read-only.

## Technology Stack

| Layer           | Technology                 | Notes                            |
| --------------- | -------------------------- | -------------------------------- |
| Frontend        | Next.js + Tailwind CSS     | Server and client components     |
| Auth            | Clerk                      | Free tier, 50K MAU               |
| Backend         | NestJS                     | Thin gateway + data owner        |
| ORM             | Prisma                     | With raw SQL for pgvector ops    |
| Database        | PostgreSQL + pgvector      | Vector similarity search         |
| Package Manager | Yarn (node-modules linker) |                                  |
| Monorepo        | Nx                         | Workspace with module boundaries |
| Runtime         | Node 20 LTS                |                                  |
| Frontend Deploy | Vercel                     | Free Hobby tier                  |
| Backend Deploy  | Railway                    | Hobby $5/mo                      |
| Local Dev       | Docker Compose             | Not used in production           |
