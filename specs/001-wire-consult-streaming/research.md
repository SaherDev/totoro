# Research: Wire Consult Streaming

**Feature**: 001-wire-consult-streaming
**Date**: 2026-03-18

---

## Decision 1: `@ai-sdk/react` + `ai` package installation

**Decision**: Install both `@ai-sdk/react` and `ai` (its peer dependency) into `apps/web`.

**Rationale**: `useChat` from `@ai-sdk/react` is the streaming hook specified in the feature. The `ai` package is a required peer dependency. Neither is currently installed in `apps/web/package.json`.

**Alternatives considered**:
- Custom EventSource hook: avoids external dependency but duplicates `isLoading`, `error`, and stream-state management. Higher implementation risk with no benefit.
- Fetch with ReadableStream + useState: same duplication cost. Rejects.

---

## Decision 2: `streamProtocol: 'text'` over `streamProtocol: 'data'` (AI SDK Data Stream)

**Decision**: Configure `useChat` with `streamProtocol: 'text'`. The route handler returns a plain `ReadableStream` of text chunks. No AI SDK server-side formatting is needed.

**Rationale**: The NestJS consult endpoint proxies FastAPI SSE directly. The route handler transforms SSE token events into plain text chunks. With `streamProtocol: 'text'`, `useChat` appends each chunk to the assistant message content — token-by-token rendering works without the full AI SDK data stream protocol on the server side.

**Alternatives considered**:
- `streamProtocol: 'data'`: requires `createDataStreamResponse` from `ai` and specific server-side formatting (`0:"token"\n`). Adds server complexity with no UX benefit for this use case. Rejects.

---

## Decision 3: Route handler calls NestJS via `HttpClient.postStream()` (ADR-029 compliant)

**Decision**: Add `postStream(path, body): Promise<Response>` to `HttpClient` interface and `FetchClient` class. The route handler at `apps/web/src/app/api/consult/route.ts` calls `client.postStream('/api/v1/consult', ...)` to get the SSE response stream from NestJS.

**Rationale**: ADR-029 prohibits inline fetch calls outside `apps/web/src/api/`. ADR-030 requires interface implementations as classes. ADR-033 requires external dependencies behind interfaces. Extending `HttpClient` with a streaming method is the correct architectural path.

The existing `post<T>()` method calls `res.json()` — it cannot be reused for streaming. A new `postStream()` method returns the raw `Response` object, giving the route handler access to the readable body stream.

**Alternatives considered**:
- Inline `fetch()` in the route handler: violates ADR-029 directly. Rejects.
- Separate streaming transport class: over-engineered for one method. Extending the existing interface is sufficient.

---

## Decision 4: Server-side API client via `server.ts`

**Decision**: Create `apps/web/src/api/server.ts` exporting `getApiClient()`. Uses `auth()` from `@clerk/nextjs/server` to retrieve the Clerk session token server-side. The token is forwarded as `Authorization: Bearer` to NestJS.

**Rationale**: ADR-013 requires Clerk for all auth. The route handler runs on the server — it must use the server-side Clerk SDK, not client-side hooks. `FetchClient` already includes `Authorization: Bearer` on all requests. No `userId` injection needed: NestJS extracts `userId` from the Clerk token it receives.

**Alternatives considered**:
- Pass `userId` in request body from the client: violates FR-008 (user identity must not come from the client). Rejects.
- Read Clerk session in the route handler directly without a shared factory: duplicates auth boilerplate. Rejects.

---

## Decision 5: NestJS SSE event format and route handler transformation

**Decision**: NestJS pipes FastAPI SSE directly. The route handler parses SSE lines and extracts text from events where `type === "token"` or `type === "text_delta"`, then writes raw text to the response stream. Unknown event types are silently ignored.

**Rationale**: The FastAPI SSE format is not yet finalized (FastAPI isn't running in dev). The route handler must be robust to evolving event shapes. Extracting only token events (ignoring reasoning_steps, done events, etc.) ensures `useChat` receives clean text for the message content. The transformation is in the route handler — not in `FetchClient` — because it is domain-specific.

Expected SSE event format from FastAPI/NestJS:
```
data: {"type": "token", "content": "some text"}\n\n
data: {"type": "reasoning_step", "step": "intent_parsing", "summary": "..."}\n\n
data: [DONE]\n\n
```

Route handler strips everything except `type === "token"` events and writes their `content` to the text stream.

**Alternatives considered**:
- Forward raw SSE to browser and parse client-side: would expose NestJS SSE format to the browser and require custom client-side parsing. Breaks the BFF pattern. Rejects.
- Passthrough without transformation (return NestJS SSE directly): `useChat` doesn't understand raw SSE format. Rejects.

---

## Decision 6: `useChat` + local state merge pattern for home page

**Decision**: Keep the existing local `messages` state for recall and add-place flows. For recommend flow: add the user message to local state immediately (same as today), trigger streaming via `useChat.append()`, handle the streaming assistant message via the `useChat` message list. Merge for display: `[...localMessages, ...consultMsgItems]`. During streaming, the assistant message renders from `useChat.messages`; on finish, do nothing — the `useChat.messages` list already has the final message.

The display list combines:
- `messages` (local state): all recall and add-place messages
- `consultMsgItems` (mapped from `useChat.messages`): all recommend user + assistant messages

**Rationale**: This avoids double-adding messages to local state, avoids complex ordering logic for v1, and lets `useChat` manage the streaming assistant message lifecycle naturally. The tradeoff is that recommend messages always appear after recall/add-place messages in the display list. For typical usage (one flow per session), this is unnoticeable.

**Alternatives considered**:
- Single unified message list with timestamp ordering: requires a shared message store. Over-engineered for v1.
- `onFinish` callback to add completed message to local state: causes `useChat.messages` and local state to diverge and requires de-duplication. Rejects.

---

## Decision 7: `AgentResponseBubble` targeted minimal extension

**Decision**: Add a single `useEffect` to `AgentResponseBubble` that transitions the component from "thinking" to "result" phase when `content` prop becomes non-empty. This enables progressive rendering as streaming tokens arrive.

**Rationale**: The spec requires token-by-token display. The current component initializes `phase` from `content` only once at mount. Without this `useEffect`, the component stays in "thinking" for ~7 seconds even as streaming content arrives. The change is backward-compatible: when `content` is never provided (recall/add-place/error flows), behavior is identical to today.

**Change**:
```ts
useEffect(() => {
  if (content && phase === 'thinking') {
    setPhase('result');
  }
}, [content, phase]);
```

This is the minimum necessary change. All existing tests, all existing visual behavior for non-recommend flows, and all existing props remain unchanged.

**Alternatives considered**:
- Don't change `AgentResponseBubble`, show complete text after 7-second delay: violates streaming UX requirement (FR-002, SC-001). Rejects.
- New `StreamingBubble` component for recommend streaming: adds a new component rather than extending the existing one. The spec says to keep existing components — adding a new one for streaming is inconsistent. Rejects.
