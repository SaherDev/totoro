# Feature Specification: Consult SSE Proxy (NestJS)

**Feature Branch**: `001-consult-sse-proxy`
**Created**: 2026-03-17
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Streaming Recommendation Reasoning in Real Time (Priority: P1)

A user submits a "consult" query from the frontend and opts into streaming. Instead of waiting for the full AI response, the user sees agent reasoning steps appear progressively as the AI works through intent parsing, retrieval, discovery, and ranking — before the final recommendation arrives.

**Why this priority**: This is the primary value of the feature. Without streaming, the consult flow works but gives no feedback while the AI thinks. Streaming turns a blank wait into a visible, trust-building experience.

**Independent Test**: Can be fully tested by submitting a consult request with `stream: true` from the browser and observing that reasoning steps appear incrementally before the final recommendation, delivering real-time transparency into the AI process.

**Acceptance Scenarios**:

1. **Given** an authenticated user submits a consult query with streaming enabled, **When** the AI service begins processing, **Then** the user receives a live stream of reasoning events (intent parsing, retrieval, discovery, ranking steps) as they complete, followed by the final recommendation.
2. **Given** a streaming consult is in progress, **When** the AI service produces each reasoning step, **Then** that step is immediately forwarded to the browser without waiting for subsequent steps or the final response.
3. **Given** a streaming consult completes, **When** the final recommendation is generated, **Then** the stream ends cleanly and the browser receives the complete result.

---

### User Story 2 - Non-Streaming Consult Remains Unchanged (Priority: P2)

A user submits a consult query without requesting streaming. The system returns a complete synchronous JSON response exactly as it did before this feature was added — no change in behavior, payload, or timing.

**Why this priority**: Backward compatibility is essential. The non-streaming path is the current production behavior. Any regression here breaks the existing consult flow.

**Independent Test**: Can be fully tested by submitting a consult request without `stream: true` and confirming the response is a complete JSON object matching the existing contract.

**Acceptance Scenarios**:

1. **Given** an authenticated user submits a consult query without `stream: true`, **When** the request is processed, **Then** the user receives a single complete JSON response containing the primary recommendation, alternatives, and reasoning steps array.
2. **Given** an authenticated user submits a consult query with `stream: false` explicitly, **When** the request is processed, **Then** the system behaves identically to omitting the `stream` field.

---

### User Story 3 - Clean Disconnect Handling (Priority: P3)

A user navigates away or closes the browser tab while a streaming consult is in progress. The system detects the disconnect and stops the upstream AI request immediately, releasing all resources without hanging connections or memory leaks.

**Why this priority**: Resource cleanup on disconnect prevents server degradation under load. Without it, abandoned streams accumulate upstream connections to the AI service.

**Independent Test**: Can be fully tested by initiating a streaming consult and closing the browser connection before completion, then verifying that the upstream AI request is also terminated within a short window.

**Acceptance Scenarios**:

1. **Given** a streaming consult is in progress, **When** the browser client disconnects (tab closed, navigation, network loss), **Then** the upstream AI stream is terminated and no further data is forwarded.
2. **Given** a streaming consult is in progress, **When** the browser disconnects, **Then** no orphaned connection to the AI service remains after cleanup.

---

### Edge Cases

- What happens when the AI service is unreachable during a streaming request? The user should receive an error response, not a hanging connection.
- What happens if the AI service closes the stream unexpectedly mid-response? The browser connection should also close cleanly without partial data being left in a broken state.
- What happens if the browser is slow to consume the stream (backpressure)? The system must not drop events or overflow buffers — it pauses delivery until the consumer catches up.
- What happens when an unauthenticated request includes `stream: true`? The request must be rejected before any upstream call is made.
- What happens if the `query` field is missing or empty on a streaming request? The request is rejected with a validation error before any upstream call is made.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The consult endpoint MUST accept an optional `stream` boolean field in the request body. When `true`, the response MUST be delivered as a live event stream. When `false` or absent, the response MUST be a single synchronous JSON object.
- **FR-002**: When streaming, the system MUST forward each event from the AI service to the browser as soon as it is received, without buffering all events before delivery.
- **FR-003**: The system MUST inject the authenticated user's identity into every forwarded request before it reaches the AI service. The frontend MUST NOT supply the user identity directly.
- **FR-004**: When a streaming client disconnects, the system MUST terminate the upstream AI service connection promptly.
- **FR-005**: When the browser is slow to consume the stream, the system MUST apply backpressure — pausing event delivery until the consumer is ready — rather than dropping events or crashing.
- **FR-006**: The non-streaming consult behavior MUST remain identical to the behavior before this feature. No existing fields, response shapes, or status codes may change.
- **FR-007**: All requests (streaming and non-streaming) MUST pass authentication before any forwarding occurs. Unauthenticated requests MUST be rejected.
- **FR-008**: The streaming response MUST include the appropriate headers to prevent intermediary (proxy/CDN) buffering, ensuring events reach the browser immediately.

### Key Entities

- **Consult Request**: A user query with intent text, optional location, and optional `stream` flag. Carries no user identity — the system injects it from the auth session.
- **Streaming Event**: A single unit of AI reasoning output (a step such as intent parsing, retrieval, or ranking) delivered incrementally to the browser during a streaming consult.
- **Final Recommendation**: The complete recommendation payload (primary place + alternatives + full reasoning steps) delivered as the last event in a stream, or as the sole response in non-streaming mode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each AI reasoning step appears in the browser within 200ms of being produced by the AI service, measured end-to-end for a browser client on a local network.
- **SC-002**: A browser disconnect during streaming terminates the upstream AI connection within 2 seconds of the disconnect event.
- **SC-003**: Non-streaming consult requests return a complete response with no change in payload shape or status codes compared to pre-feature behavior.
- **SC-004**: A slow browser consumer (simulated with artificial read delay) receives all events without data loss — zero events dropped under backpressure.
- **SC-005**: All existing consult-related tests pass without modification after the streaming feature is added.
- **SC-006**: Unauthenticated streaming requests are rejected before any upstream call is made, confirmed by zero AI service requests logged for rejected clients.

## Assumptions

- The AI service (FastAPI) is already producing a working SSE stream on `POST /v1/consult` when `stream: true` is included in the request body. This feature does not modify the AI service.
- The existing consult request validation (required `query` field, optional `location`) applies equally to streaming and non-streaming requests.
- The `user_id` injection mechanism already exists in the auth layer and does not need to change for this feature.
- The AI service's SSE format (event types, data field structure) is stable and does not require transformation by the proxy layer.
- A Bruno request file documenting the streaming endpoint is required as part of delivery for developer testing.
