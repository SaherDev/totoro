# API Contract — totoro ↔ totoro-ai

This document defines the HTTP contract between the product repo (`services/api`) and the AI service (`totoro-ai`). The product repo is the **client**; the AI repo is the **server**.

## Connection

- Base URL loaded from YAML config: `config/dev.yml` → `ai_service.base_url`
- All endpoints are prefixed with `/v1/`
- All requests are JSON over HTTP (`Content-Type: application/json`)
- Auth between services is TBD (likely a shared secret header in later phases)

---

## POST /v1/extract-place

Extract and validate a place from raw user input (URL, name, or screenshot).

**Request:**
```json
{
  "user_id": "string",
  "raw_input": "https://maps.google.com/..."
}
```

**Response:**
```json
{
  "place": {
    "place_name": "Fuji Ramen",
    "address": "123 Sukhumvit Soi 33, Bangkok",
    "source": "saved"
  },
  "embedding": [0.012, -0.034, ...]
}
```

**Notes:**
- `raw_input` is the unmodified user input — a URL, place name, or free-text description.
- totoro-ai handles all parsing, Google Places validation, and embedding generation internally.
- NestJS writes both the place record and the embedding vector to PostgreSQL.
- The response schema will evolve. Treat unknown fields as forward-compatible — do not fail on extra keys.

---

## POST /v1/consult

Get a recommendation from natural language intent. The AI service handles the entire pipeline: intent parsing, vector retrieval, external discovery, ranking, and response generation.

**Request:**
```json
{
  "user_id": "string",
  "query": "good ramen near Sukhumvit for a date night",
  "location": {
    "lat": 13.7563,
    "lng": 100.5018
  }
}
```

**Response:**
```json
{
  "primary": {
    "place_name": "Fuji Ramen",
    "address": "123 Sukhumvit Soi 33, Bangkok",
    "reasoning": "Your top-rated ramen spot, 10 minutes from you, and perfect for a quiet dinner.",
    "source": "saved"
  },
  "alternatives": [
    {
      "place_name": "Bankara Ramen",
      "address": "456 Sukhumvit Soi 39, Bangkok",
      "reasoning": "Known for rich tonkotsu broth. You haven't tried it yet but it matches your preferences.",
      "source": "discovered"
    }
  ]
}
```

**Notes:**
- `query` is the raw user input, unmodified.
- `location` is the user's current location (optional, used for distance-aware ranking).
- Always returns exactly 1 `primary` and up to 2 `alternatives`.
- Each result contains four core fields: `place_name`, `address`, `reasoning`, `source`.
- `source` is either `"saved"` (from user's collection) or `"discovered"` (external lookup).
- Additional fields (distance, price, open status, confidence score, photos) will be added in later phases. Design the frontend and DTOs to tolerate extra fields gracefully.
- One HTTP call. The AI agent runs autonomously — no mid-pipeline callbacks to NestJS.

---

## Error Handling

The AI service returns standard HTTP status codes:

| Status | Meaning | Product repo action |
|--------|---------|-------------------|
| 200 | Success | Process response |
| 400 | Bad request (malformed input) | Log error, return 400 to frontend |
| 422 | Could not parse intent / no results | Return friendly "couldn't understand" message |
| 500 | AI service internal error | Log error, return 503 to frontend with retry suggestion |
| Timeout | Service unreachable | Return 503 with "service temporarily unavailable" |

**Timeout policy:** Set HTTP client timeout to 30 seconds for all AI service calls. Extract-place should respond within 10s; consult may take up to 20s for complex queries.
