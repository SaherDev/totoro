# API Contract — totoro ↔ totoro-ai

This document defines the HTTP contract between the product repo (`apps/api`) and the AI service (`totoro-ai`). The product repo is the **client**; the AI repo is the **server**.

## Connection

- Base URL loaded from YAML config: `config/dev.yml` → `ai_service.base_url`
- All requests are JSON over HTTP (`Content-Type: application/json`)
- Auth between services is TBD (likely a shared secret header in later phases)

---

## POST /parse-intent

Parse a natural language query into structured intent.

**Request:**
```json
{
  "user_id": "string",
  "query": "good ramen near Sukhumvit for a date night"
}
```

**Response:**
```json
{
  "intent": {
    "cuisine": "ramen",
    "occasion": "date night",
    "location": "Sukhumvit",
    "constraints": []
  }
}
```

**Notes:**
- The `query` field is the raw user input, unmodified.
- The response schema will evolve as the AI repo adds more intent fields. Treat unknown fields as forward-compatible — do not fail on extra keys.

---

## POST /retrieve

Retrieve candidate places matching a structured intent.

**Request:**
```json
{
  "user_id": "string",
  "intent": {
    "cuisine": "ramen",
    "occasion": "date night",
    "location": "Sukhumvit",
    "constraints": []
  }
}
```

**Response:**
```json
{
  "candidates": [
    {
      "place_name": "Fuji Ramen",
      "address": "123 Sukhumvit Soi 33, Bangkok",
      "source": "saved"
    }
  ]
}
```

**Notes:**
- `source` is either `"saved"` (from user's collection) or `"discovered"` (external lookup).
- The candidate list length is controlled by the AI service. Expect 5–20 candidates.

---

## POST /rank

Score and rank candidates with user context, return top recommendations.

**Request:**
```json
{
  "user_id": "string",
  "intent": {
    "cuisine": "ramen",
    "occasion": "date night",
    "location": "Sukhumvit",
    "constraints": []
  },
  "candidates": [
    {
      "place_name": "Fuji Ramen",
      "address": "123 Sukhumvit Soi 33, Bangkok",
      "source": "saved"
    }
  ]
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
- Always returns exactly 1 `primary` and up to 2 `alternatives`.
- Each result contains three core fields: `place_name`, `address`, `reasoning`, `source`.
- Additional fields (distance, price, open status, confidence score, photos) will be added in later phases. Design the frontend and DTOs to tolerate extra fields gracefully.

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

**Timeout policy:** Set HTTP client timeout to 30 seconds for all AI service calls. Intent parsing and retrieval should respond within 5s; ranking may take up to 20s for complex queries.
