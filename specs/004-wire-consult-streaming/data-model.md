# Data Model: Wire Consult Streaming

**Feature**: 001-wire-consult-streaming
**Date**: 2026-03-18

No database schema changes. No new tables, columns, or migrations.

---

## Interface Changes

### `HttpClient` extended (Option A — extend in place)

**File**: `apps/web/src/api/types.ts`

```ts
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  postStream(path: string, body: unknown): Promise<Response>  // NEW
}
```

`postStream` returns the raw `Response` object (body not consumed). Auth header applied identically to `post`. All existing callers are unaffected.

---

## Request/Response Types

### `useChat` POST body (browser → route handler)

```ts
// useChat sends this automatically; route handler reads it
interface UseChatBody {
  messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }>;
}
// Route handler extracts: messages.at(-1)?.content → query
```

### Route handler → NestJS (frontend→NestJS contract)

```ts
// Matches ConsultRequestDto in services/api — no userId in body
interface NestConsultRequest {
  query: string;
  stream: true;
  location?: { lat: number; lng: number };
}
```

**Note on `userId`**: `ConsultRequestDto` has no `userId` field. NestJS extracts `userId` from the Clerk bearer token via the `@CurrentUser()` decorator (populated by `ClerkMiddleware`). The route handler forwards the Clerk session token in `Authorization: Bearer` — NestJS does the rest. Do NOT add `userId` to the request body.

The `user_id` field in `docs/api-contract.md` is part of the **NestJS→FastAPI** payload (`AiConsultPayload`), not the frontend→NestJS contract. These are two separate contracts.

### FastAPI SSE event shape (proxied unmodified through NestJS)

```ts
type SseEvent =
  | { type: 'token'; content: string }              // → write to text stream
  | { type: 'reasoning_step'; step: string; summary: string }  // → ignored
  | { type: 'done' }                                // → close stream
  | { type: string; [key: string]: unknown };       // → ignored (forward-compatible)
```

Route handler extracts `content` from `type === 'token'` events only.

---

## State in `HomePage` (before → after)

**Before**: single `messages` state, all flows write to it in insertion order.

**After** (Phase 1 — consult wired, recall/add-place stubs):

```ts
// recall + add-place messages (local state, unchanged)
const [messages, setMessages] = useState<MessageItem[]>([]);

// recommend flow managed by useChat
const { messages: consultMessages, append, isLoading: isConsulting, error: consultError } = useChat({
  api: '/api/consult',
  streamProtocol: 'text',
});

// display list: local messages first, then consult messages
const allMessages: MessageItem[] = [
  ...messages,
  ...consultMessages.map(msg => ({
    id: msg.id,
    type: msg.role === 'user' ? 'user' : 'agent-response',
    content: msg.content || undefined,
    flow: 'recommend',
    hasError: msg.role === 'assistant' && !!consultError,
  })),
];
```

**Known ordering limitation**: This merge preserves insertion order only within each source. If a user mixes flows (recall → consult → recall), all recall/add-place messages appear before all consult messages — not chronologically interleaved.

**Why this is acceptable for Phase 1**: Recall and add-place are local state stubs. No real user will do a multi-flow session yet. The ordering bug is invisible in practice.

**Do not design around this**: A future task should introduce a unified message store (e.g., a single `messages` list with a `source` tag) that maintains true insertion order across all flows. The current two-source approach is an intentional short-term tradeoff — do not add complexity now to solve a problem that doesn't exist yet in production.
