# Contract: POST /api/v1/consult

**Owner**: `services/api` (NestJS)
**Consumer**: `apps/web` (Next.js frontend)

---

## Non-Streaming Mode

**Request**

```http
POST /api/v1/consult
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "query": "good ramen near Sukhumvit for a date night",
  "location": { "lat": 13.7563, "lng": 100.5018 },
  "stream": false
}
```

`location` and `stream` are optional. `query` is required.

**Response** `200 OK`

```json
{
  "primary": {
    "place_name": "Fuji Ramen",
    "address": "123 Sukhumvit Soi 33, Bangkok",
    "reasoning": "Your top-rated ramen, 10 minutes away, perfect for a quiet dinner.",
    "source": "saved"
  },
  "alternatives": [
    {
      "place_name": "Bankara Ramen",
      "address": "456 Sukhumvit Soi 39, Bangkok",
      "reasoning": "Rich tonkotsu, matches your preferences.",
      "source": "discovered"
    }
  ],
  "reasoning_steps": [
    { "step": "intent_parsing", "summary": "cuisine=ramen, occasion=date night" },
    { "step": "retrieval", "summary": "Found 3 saved ramen places" }
  ]
}
```

---

## Streaming Mode

**Request**

```http
POST /api/v1/consult
Authorization: Bearer <clerk-token>
Content-Type: application/json

{
  "query": "good ramen near Sukhumvit for a date night",
  "location": { "lat": 13.7563, "lng": 100.5018 },
  "stream": true
}
```

**Response** `200 OK` (SSE stream)

```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

```
data: {"type":"step","step":"intent_parsing","summary":"cuisine=ramen, occasion=date night"}

data: {"type":"step","step":"retrieval","summary":"Found 3 saved ramen places"}

data: {"type":"step","step":"discovery","summary":"Found 5 external candidates"}

data: {"type":"result","primary":{"place_name":"Fuji Ramen","address":"...","reasoning":"...","source":"saved"},"alternatives":[...],"reasoning_steps":[...]}

```

The stream ends after the `type: result` event. The browser receives events as they complete — no waiting for the full response.

---

## Error Responses

| Status | Condition |
|--------|-----------|
| `401` | Missing or invalid Clerk token |
| `403` | User's `ai_enabled` is false (AiEnabledGuard) |
| `400` | Missing `query` field or invalid request shape |
| `422` | FastAPI could not parse intent or found no results |
| `503` | FastAPI unreachable or returned 5xx |

Error body:
```json
{ "statusCode": 403, "message": "AI features are disabled for this account" }
```

---

## Behavioral Contract

- `user_id` is NEVER accepted from the frontend. It is injected from the Clerk JWT by NestJS middleware.
- `stream: false` (or absent) returns a complete synchronous JSON body — same shape as before this feature.
- `stream: true` returns an SSE stream; the browser must handle `EventSource` or `fetch` with streaming reader.
- Client disconnect during streaming terminates the upstream FastAPI request.
- Backpressure: NestJS pauses the upstream stream if the client is slow to consume.
