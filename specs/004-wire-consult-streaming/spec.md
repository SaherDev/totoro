# Feature Specification: Wire Consult Streaming

**Feature Branch**: `001-wire-consult-streaming`
**Created**: 2026-03-18
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Recommendation Streaming (Priority: P1)

A logged-in user types a place recommendation query into the home page chat input and submits it. The AI recommendation appears in the chat progressively — words and phrases render as they arrive — rather than appearing all at once after a long wait. Recall and add-place queries are unaffected by this change and continue working exactly as before.

**Why this priority**: Real-time streaming is the entire purpose of this task. Without it, the recommendation feels like a slow form submission. Streaming transforms the experience into a live conversation and gives the user immediate feedback that the system is working.

**Independent Test**: Can be tested by typing a recommendation query (e.g., "best ramen near me for a date") and observing that the response bubble begins populating with text before the full answer is ready.

**Acceptance Scenarios**:

1. **Given** the user is logged in and on the home page, **When** they type a recommendation query and submit, **Then** the AI response bubble appears immediately and its text grows incrementally as content arrives.
2. **Given** a recommendation stream is in progress, **When** the user views the chat, **Then** a loading indicator is visible and the input field is disabled.
3. **Given** the stream completes successfully, **When** the final content arrives, **Then** the loading indicator disappears and the input field becomes active again.
4. **Given** the user submits a recall query (not a recommendation), **When** the system processes it, **Then** the recall flow behaves exactly as it did before this change — no streaming, same response format.
5. **Given** the user submits an add-place query, **When** the system processes it, **Then** the add-place flow behaves exactly as it did before this change — no streaming, same response format.

---

### User Story 2 - Recommendation Error Handling (Priority: P2)

When the recommendation service is unavailable or returns an error, the user sees a clear, non-technical message in the chat. The page does not crash, and the user can try again.

**Why this priority**: Silent failures leave users confused about whether to wait or retry. Clear error feedback is required for production quality, but it is secondary to the streaming happy path.

**Independent Test**: Can be tested by simulating a failed recommendation request and confirming a visible error message appears in the chat without crashing the page or breaking other flows.

**Acceptance Scenarios**:

1. **Given** the recommendation service returns an error, **When** the user submits a recommendation query, **Then** an error message appears in the chat and the input becomes active so the user can retry.
2. **Given** a streaming response is interrupted mid-delivery, **When** the stream stops unexpectedly, **Then** whatever content was already displayed remains visible and an error indicator appears.

---

### User Story 3 - Existing UI and Flows Unchanged (Priority: P3)

Every part of the home page that is not directly involved in the recommendation streaming change looks and behaves identically before and after this change. The message list, chat input, agent response bubble, and empty state components are not visually or behaviourally modified.

**Why this priority**: This is a correctness constraint, not a new capability. It is listed third because it is a limit on what must not change, not a new thing to deliver.

**Independent Test**: Can be tested by loading the home page with no active query and comparing the layout and empty state to the pre-change baseline, and by triggering recall and add-place flows and confirming identical behaviour.

**Acceptance Scenarios**:

1. **Given** no messages have been sent, **When** the home page loads, **Then** the empty state renders identically to before.
2. **Given** a completed conversation with a recommendation, **When** viewing the message history, **Then** user messages and AI responses display in the same visual format as before.
3. **Given** the recall and add-place flows, **When** triggered normally, **Then** they produce the same output and UI behaviour as before.

---

### Edge Cases

- What happens when the user submits a recommendation query while a previous recommendation stream is still in progress?
- How does the chat handle a recommendation stream that returns no content?
- What happens if the user's authentication session expires while a recommendation stream is active?
- What happens if the recommendation service takes longer than expected to begin streaming?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate the user before forwarding a recommendation query — unauthenticated recommendation requests must be rejected.
- **FR-002**: System MUST stream the recommendation response incrementally to the chat, beginning display before the full response is available.
- **FR-003**: System MUST show a loading state while a recommendation stream is active.
- **FR-004**: System MUST show an error message in the chat if the recommendation request fails for any reason — no silent failures.
- **FR-005**: System MUST disable the chat input while a recommendation stream is active and re-enable it when the stream completes or fails.
- **FR-006**: System MUST leave the recall flow behaviour entirely unchanged — recall queries must continue to work as before.
- **FR-007**: System MUST leave the add-place flow behaviour entirely unchanged — add-place queries must continue to work as before.
- **FR-008**: The recommendation proxy route MUST read the authenticated user identity from the server-side session — user identity must not be accepted from the client request body.
- **FR-009**: All network calls from the web layer to backend services MUST go through the existing HTTP client abstraction — no direct network calls in page components or route handlers.
- **FR-010**: The visual appearance and behaviour of all existing UI components (message list, agent response bubble, empty state, chat input) MUST remain unchanged.

### Key Entities

- **Recommendation Query**: A natural language place request submitted by the user, classified as the "recommend" intent, containing the query text.
- **Streaming Response**: The recommendation answer delivered incrementally as a sequence of content chunks, culminating in a complete AI-generated recommendation with reasoning.
- **Chat Message**: A single turn in the conversation — either a user query or a system response — displayed in the home page message list.
- **Chat Intent**: The classified type of a user's query — one of "recommend", "recall", or "add-place" — used to route the query to the appropriate handler.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see the first content of the recommendation response within 3 seconds of submitting a query under normal network conditions.
- **SC-002**: 100% of recommendation queries are forwarded with a server-verified user identity — zero queries reach the recommendation service without a verified user ID.
- **SC-003**: The loading indicator appears within 200ms of submitting a recommendation query and disappears within 200ms of stream completion.
- **SC-004**: All existing automated tests pass without modification — zero regressions in the existing web app test suite.
- **SC-005**: Error states appear in the chat for 100% of failed recommendation requests — zero silent failures.
- **SC-006**: Recall and add-place flows produce identical output to their pre-change behaviour in 100% of test scenarios.
- **SC-007**: All existing UI component source files are unmodified after implementation — confirmed by diff showing no changes to component files.

## Assumptions

- The recommendation service backend already supports streaming responses. This feature only wires the existing UI to that capability — it does not add streaming to the backend.
- The home page already has intent detection logic that classifies queries as "recommend", "recall", or "add-place". This logic will remain unchanged; only the handler for "recommend" queries changes.
- The existing HTTP client abstraction in the web layer can handle or be extended to handle streaming responses without changing its public interface.
- User location context is either already available in the home page or can be omitted from the initial wiring — location-aware ranking in the recommendation service is not a prerequisite.
- The existing UI components (AgentResponseBubble, ChatMessage, HomeEmptyState) accept content props in a way that works correctly with incrementally-updated text.
