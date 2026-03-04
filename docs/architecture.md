# System Architecture — Totoro

## Overview

Totoro is split across two repositories with a clear separation of concerns:

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
│  - Calls services/api via internal HTTP                 │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (REST)
                       ▼
┌─────────────────────────────────────────────────────┐
│             services/api (NestJS + Prisma)              │
│  - Auth verification (Clerk backend SDK)            │
│  - Business logic, CRUD operations                  │
│  - Orchestrates calls to totoro-ai                  │
│  - Database access (PostgreSQL + pgvector)           │
└────────────┬────────────────────┬───────────────────┘
             │ SQL                │ HTTP
             ▼                   ▼
┌────────────────────┐ ┌─────────────────────────────┐
│   PostgreSQL       │ │   totoro-ai (Python)        │
│   + pgvector       │ │  - Intent parsing           │
│                    │ │  - Place retrieval           │
│                    │ │  - Ranking & scoring         │
│                    │ │  - Embeddings (Voyage)       │
└────────────────────┘ └─────────────────────────────┘
```

## Data Flow: "Recommend me a place"

1. **User types a query** in the chat UI (e.g., "good ramen near me for a date night").
2. **`apps/web`** sends the raw query string to `services/api` via REST.
3. **`services/api`** forwards the query to `totoro-ai` via `POST /parse-intent`.
4. **`totoro-ai`** returns a structured intent (cuisine type, occasion, location, etc.).
5. **`services/api`** sends the structured intent to `totoro-ai` via `POST /retrieve`.
6. **`totoro-ai`** returns candidate places from the user's saved places and/or external discovery.
7. **`services/api`** sends candidates + user context to `totoro-ai` via `POST /rank`.
8. **`totoro-ai`** returns 1 primary recommendation + 2 alternatives, each with reasoning.
9. **`services/api`** persists the recommendation and streams the response to `apps/web`.
10. **`apps/web`** renders the recommendation with reasoning text.

## Data Flow: "Share a place"

1. **User submits free-text input** (a URL, place name, or description).
2. **`apps/web`** sends the raw string to `services/api`.
3. **`services/api`** forwards the string to `totoro-ai` for extraction and validation.
4. **`totoro-ai`** parses the input (URL fetch, Google Places lookup, etc.) and returns structured place data.
5. **`services/api`** stores the place in PostgreSQL, associated with the user's profile.
6. Over time, accumulated places form the user's taste model (built by `totoro-ai`).

## Technology Stack

| Layer           | Technology                 | Notes                                         |
| --------------- | -------------------------- | --------------------------------------------- |
| Frontend        | Next.js + Tailwind CSS     | Server and client components                  |
| Auth            | Clerk                      | Free tier, 50K MAU                            |
| Backend         | NestJS                     | Modular architecture                          |
| ORM             | Prisma                     | With raw SQL for pgvector ops                 |
| Database        | PostgreSQL + pgvector      | Vector similarity search                      |
| AI Service      | Python (totoro-ai repo)    | GPT-4o-mini, Claude Sonnet, Voyage embeddings |
| Package Manager | Yarn (node-modules linker) |                                               |
| Monorepo        | Nx                         | Workspace with module boundaries              |
| Runtime         | Node 20 LTS                |                                               |
| Frontend Deploy | Vercel                     | Free Hobby tier                               |
| Backend Deploy  | Railway                    | Hobby $5/mo, Serverless Redis                 |
| Local Dev       | Docker Compose             | Not used in production                        |

## Repo Boundaries

This repo (`totoro`) owns:

- All user-facing UI
- Authentication and authorization
- Database schema and migrations
- Business logic and CRUD operations
- HTTP orchestration of AI calls

The AI repo (`totoro-ai`) owns:

- Natural language understanding
- Place extraction from URLs and free text
- Embedding generation and vector search
- Ranking and scoring algorithms
- Taste model construction
- Provider abstraction for LLM/embedding model switching
