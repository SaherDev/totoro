# Contract: `/api/consult` Route Handler

**File**: `apps/web/src/app/api/consult/route.ts`
**Direction**: browser → Next.js route handler → NestJS

---

## POST /api/consult

### Request (from `useChat`)

```
POST /api/consult
Content-Type: application/json

{
  "messages": [
    { "id": "...", "role": "user", "content": "best ramen near Sukhumvit" }
  ]
}
```

- Sent automatically by `useChat` on `append()` call
- Route handler reads `messages.at(-1).content` as the query

### Auth

- Route handler reads the Clerk session server-side via `auth()` from `@clerk/nextjs/server`
- Use `const { userId, getToken } = await auth()`. If `userId` is null → return `401 Unauthorized`
- To get the raw JWT: call `await getToken()`. Forward this as `Authorization: Bearer <token>` to NestJS.
- Do NOT use `userId` in the header or body — NestJS extracts the user identity from the token itself via `ClerkMiddleware`.

### Response (success)

```
200 OK
Content-Type: text/plain; charset=utf-8
Transfer-Encoding: chunked

Hello
 world
! Here
 is
 your
 recommendation
...
```

- Plain text stream
- Each chunk is a raw text fragment (not newline-delimited)
- `useChat` with `streamProtocol: 'text'` appends chunks to the assistant message content
- Stream closes when FastAPI emits `[DONE]` or the upstream connection ends

### Response (auth failure)

```
401 Unauthorized
```

### Response (upstream error)

```
500 Internal Server Error
Content-Type: text/plain

Upstream error: <message>
```

---

## Route Handler → NestJS

```
POST /api/v1/consult
Authorization: Bearer <clerk-token>   ← raw JWT from getToken(), not userId
Content-Type: application/json

{
  "query": "best ramen near Sukhumvit",
  "stream": true
}
```

- `userId` is NOT in the body or headers — NestJS extracts it from the Clerk token via `ClerkMiddleware`
- `location` is omitted in Phase 1 (no geolocation yet)
- NestJS returns `text/event-stream` SSE

---

## SSE Transformation (NestJS → text stream)

| NestJS SSE event | Route handler action |
|------------------|----------------------|
| `data: {"type":"token","content":"Hello"}` | Write `"Hello"` to text stream |
| `data: {"type":"reasoning_step",...}` | Ignore |
| `data: [DONE]` | Close stream |
| `data: <invalid JSON>` | Ignore |
| Connection closed | Close stream |
| HTTP error from NestJS | Return 500 to browser |
