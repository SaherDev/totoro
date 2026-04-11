# Contract: Chat Client

**Feature**: `001-home-infra-flow2-flow9`  
**File**: `apps/web/src/lib/chat-client.ts`

## Interface

```ts
interface ChatClientOptions {
  message: string;
  userId: string;
  location: { lat: number; lng: number } | null;
  signal?: AbortSignal;
}

interface ChatClient {
  chat(opts: ChatClientOptions): Promise<ChatResponseDto>;
}
```

## Implementations

### `realChatClient(getToken)`

- POSTs to `POST /api/v1/chat`
- Request body: `{ user_id, message, location }`
- Auth header: `Authorization: Bearer <clerk-token>`
- Throws on non-2xx response; caller maps to `HomeState.error` categories

### `chatClientFixtures`

- Returns per-intent canned response; no network
- Keyed by `classifyIntent(message)`:
  - `'consult'` → `consultFixture()` (6 reasoning steps, 1 primary + 2 alternatives)
  - `'recall'` → `{ type: 'recall', data: { results: [], total: 0 } }`
  - `'save'` → `{ type: 'extract-place', data: { status: 'resolved', ... } }`
  - `'assistant'` → `{ type: 'assistant', message: 'fixture assistant reply' }`

## Selection

```ts
export function getChatClient(getToken: () => Promise<string>): ChatClient {
  if (process.env.NEXT_PUBLIC_CHAT_FIXTURES === 'true') {
    return chatClientFixtures;
  }
  return realChatClient(getToken);
}
```

## Error categorization

| Condition | Category |
|-----------|----------|
| `navigator.onLine === false` | `offline` |
| `AbortError` or fetch timeout | `timeout` |
| `res.status >= 500` | `server` |
| Any other error | `generic` |
