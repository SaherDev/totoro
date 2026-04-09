# Contract: POST /api/v1/chat

**Direction**: Frontend (apps/web) → NestJS (services/api)  
**Auth**: Clerk bearer token required  
**Guard**: `@RequiresAi()` — blocked if global kill switch is on or user's `ai_enabled` is false

---

## Request

```http
POST /api/v1/chat
Authorization: Bearer <clerk-token>
Content-Type: application/json
```

```json
{
  "message": "good ramen nearby for a date night",
  "location": {
    "lat": 13.7563,
    "lng": 100.5018
  }
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Raw user input — unclassified. May be a URL, natural language query, or memory fragment. |
| `location` | object | No | User's current coordinates for distance-aware recommendations. |
| `location.lat` | number | Yes (if location provided) | Latitude |
| `location.lng` | number | Yes (if location provided) | Longitude |

**NOT in request body**: `user_id` — NestJS injects this from the Clerk auth token.

---

## Response

Always HTTP 200. The `type` field tells the frontend what happened.

```json
{
  "type": "consult",
  "message": "Your top-rated ramen spot is 10 minutes away and perfect for a date night.",
  "data": {
    "primary": {
      "place_name": "Fuji Ramen",
      "address": "123 Sukhumvit Soi 33, Bangkok",
      "reasoning": "Your top-rated saved place for this occasion.",
      "source": "saved"
    },
    "alternatives": []
  }
}
```

**Response fields**:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string enum | Intent classification result from AI service. One of: `extract-place`, `consult`, `recall`, `assistant`, `clarification`, `error` |
| `message` | string | Human-readable response text for display |
| `data` | object or null | Intent-specific payload. Shape varies by `type`. Null for `error` and `clarification`. |

**Type meanings**:

| Type | Meaning | Expected `data` shape |
|------|---------|----------------------|
| `extract-place` | User shared a place URL/name; it was saved | Place metadata + confidence |
| `consult` | User asked for a recommendation | Primary + alternatives |
| `recall` | User recalled a saved place | List of matching places |
| `assistant` | General message / acknowledgement | Free-form |
| `clarification` | AI needs more context | null or follow-up prompt |
| `error` | AI could not process the request | null |

---

## Error Responses (Network/Transport Level Only)

HTTP errors are only returned for transport failures — NOT for AI-level errors (those use `type: "error"` in a 200 response).

| Status | Condition |
|--------|-----------|
| 401 | Missing or invalid Clerk token |
| 403 | User's `ai_enabled` flag is false |
| 503 | AI service unreachable or timed out |
| 503 | Global AI kill switch is on |

---

## NestJS → AI Service

NestJS forwards to `POST /v1/chat` on the AI service after injecting `user_id`:

```json
{
  "user_id": "user_abc123",
  "message": "good ramen nearby for a date night",
  "location": {
    "lat": 13.7563,
    "lng": 100.5018
  }
}
```

Timeout: 30 seconds.

---

## Bruno File

A `.bru` request file must be added to `totoro-config/bruno/` per ADR-021.

File path: `totoro-config/bruno/chat.bru`

```
meta {
  name: Chat
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/v1/chat
  body: json
  auth: bearer
}

auth:bearer {
  token: {{clerk_token}}
}

body:json {
  {
    "message": "good ramen nearby",
    "location": {
      "lat": 13.7563,
      "lng": 100.5018
    }
  }
}
```
