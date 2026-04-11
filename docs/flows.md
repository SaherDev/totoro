# Totoro Web App — Flow Reference

All implemented user flows as of branch `012-home-subplans-3-7`.

---

## State Machine Overview

Every interaction moves through a `HomePhase`. The store holds exactly one phase at a time.

| Phase | Meaning |
|---|---|
| `hydrating` | App loading, reading localStorage |
| `cold-0` | 0 saved places — new user |
| `cold-1-4` | 1–4 saved places — early user |
| `taste-profile` | 5+ saves, taste profile not confirmed |
| `idle` | 5+ saves, taste profile confirmed — ready for input |
| `thinking` | API call in flight |
| `recall` | Recall query in flight (breadcrumb timer active) |
| `save-sheet` | SaveSheet UI visible |
| `error` | Last request failed |

**Resting phases** (`idle`, `cold-0`, `cold-1-4`, `taste-profile`) show empty-state UI and flow-specific input placeholders.

---

## Thread Architecture

Every AI response is pushed as a `ThreadEntry` to the persistent thread. Entries are never removed except for error entries on retry.

```
ThreadEntry =
  | { role: 'user',      content: string }
  | { role: 'assistant', type: 'assistant',    message }
  | { role: 'assistant', type: 'clarification', message }
  | { role: 'assistant', type: 'consult',       message, data: ConsultResponseData }
  | { role: 'assistant', type: 'save',          place, sourceUrl }
  | { role: 'assistant', type: 'recall',        message, data: RecallResponseData }
  | { role: 'assistant', type: 'error',         category, flowId? }
```

---

## Flow 1 — Consult

**What it does:** Natural language recommendation ("cheap dinner nearby").

**Trigger:** User submits a query classified as `consult` intent.

**Phase path:** `thinking` → resting phase

**What the user sees:**
1. Input clears, thinking indicator appears ("Working on it…")
2. `ConsultThinking` — animated reasoning steps appear one by one as the API streams (intent_parsing → retrieval → discovery → validation → ranking → completion)
3. Once both API response and animation are done → `ConsultResult` is pushed to thread:
   - Primary result card: place name, address, reasoning
   - Up to 2 alternative cards
4. Phase resets to resting

**Thread entry pushed:** `type: 'consult'`

---

## Flow 2 — Save

**What it does:** Extract and save a place from a URL or free-text description.

**Trigger:** User submits text classified as `save` intent (URL, emoji-pin, place reference).

**Phase path:** `thinking` → `save-sheet` → resting phase

**What the user sees:**
1. Input clears, thinking indicator appears ("Looking up your place…")
2. API responds with place candidates:
   - If `provisional: true` → friendly message pushed to thread, sheet skipped
   - Otherwise → `SaveSheet` opens
3. `SaveSheet`:
   - High-confidence places (≥70%) auto-marked Saved on open
   - Low-confidence places show an amber **Confirm** button
   - Each card saves inline on tap — button transitions to ✓ Saved badge, list stays open
   - **Done (N)** / **Cancel** button at top-right
4. On Done → one `SaveResultBubble` per saved place pushed to thread, phase resets
5. On Cancel → sheet closes, no thread entries, phase restores to pre-save state

**Thread entry pushed:** `type: 'save'` (one per saved place, on sheet close)

---

## Flow 3 — Recall

**What it does:** Search saved places by natural language memory ("that ramen place from TikTok").

**Trigger:** User submits a query classified as `recall` intent.

**Phase path:** `thinking` → resting phase

**What the user sees:**
1. Input clears, universal thinking indicator appears
2. API responds:
   - Results found → `RecallResultBubble` pushed to thread: list of place cards (name, address, cuisine, match reason, saved date)
   - No results → plain assistant message pushed
3. Phase resets to resting

**Thread entry pushed:** `type: 'recall'`

---

## Flow 4 — Assistant / Clarification

**What it does:** General assistant reply or clarifying question from the AI.

**Trigger:** API returns `type: 'assistant'` or `type: 'clarification'`.

**Phase path:** `thinking` → resting phase

**What the user sees:**
- `AssistantBubble` pushed to thread — muted bubble with the AI's message
- Clarification bubbles use an amber tint to signal they need a follow-up

**Thread entry pushed:** `type: 'assistant'` or `type: 'clarification'`

---

## Flow 5 — Discovery

**What it does:** Show a browseable list of nearby places (no AI recommendation needed).

**Trigger:** Programmatic — e.g., "See what's popular" button in ColdStartOneFour.

**Phase path:** Stays in current resting phase (no API call)

**What the user sees:**
- `DiscoveryResults` appears in the scrollable area:
  - Title (the query), "One tap to save. Real places." subtitle
  - Cards: place name, cuisine, price range, address, **+ Save** button
- Tapping Save → opens SaveSheet for that place (confidence auto-set to 0.95)

**Thread entries pushed:** Via SaveSheet on close (`type: 'save'`)

---

## Empty State 1 — Cold Start (0 saves)

**Phase:** `cold-0`

**Trigger:** `savedPlaceCount === 0` on hydration.

**What the user sees** (`ColdStartZero`):
- Mascot illustration (raining)
- Headline + numbered onboarding steps
- Two suggestion buttons to save a first place

**On button click:** `store.submit(suggestionText)` → enters save flow.

**Exits to:** `cold-1-4` after first save.

---

## Empty State 2 — Early User (1–4 saves)

**Phase:** `cold-1-4`

**Trigger:** `1 ≤ savedPlaceCount ≤ 4` on hydration.

**What the user sees** (`ColdStartOneFour`):
- Mascot illustration (encouraging)
- "Popular nearby" place buttons — each submits a full realistic save message
- **"See what's popular in Bangkok"** button → triggers Discovery flow inline

**Exits to:** `taste-profile` once `savedPlaceCount >= 5`.

---

## Empty State 3 — Taste Profile Celebration

**Phase:** `taste-profile`

**Trigger:** `savedPlaceCount >= 5` AND `tasteProfileConfirmed === false`.

**What the user sees** (`TasteProfileCelebration`):
- Celebratory mascot illustration
- Interactive taste chips — click to confirm or dismiss each tag
- **"Start exploring"** CTA button

**On CTA click:** `store.confirmTasteProfile()` → phase = `idle`, written to localStorage.

---

## Empty State 4 — Idle

**Phase:** `idle`

**Trigger:** `savedPlaceCount >= 5` AND `tasteProfileConfirmed === true`.

**What the user sees** (`HomeIdle`):
- Personalized greeting with user's first name
- Saved place count badge
- 4 consult suggestion chips

**On chip click:** `store.submit(suggestion)` → enters consult flow.

---

## Error Handling

**Trigger:** API returns an error, times out, or network is offline.

**Thread entry pushed:** `type: 'error'` with `category` (offline | timeout | server | generic) and `flowId` (save | consult).

**What the user sees:**
- `SaveError` (if `flowId === 'save'`) or `ConsultError` (all others) — rendered inline in thread
- Illustration + category-appropriate message + **Try again** button

**On retry:** Error entry removed from thread, original query resubmitted.

---

## Flow Registry

```
FLOW_BY_CLIENT_INTENT:
  consult      → consultFlow
  save         → saveFlow
  recall       → recallFlow
  assistant    → assistantStub

FLOW_BY_RESPONSE_TYPE:
  consult      → consultFlow
  extract-place → saveFlow
  recall       → recallFlow
  assistant    → assistantStub
  clarification → clarificationStub
  error         → (handled inline)
```

---

## Key Files

| Path | Purpose |
|---|---|
| `apps/web/src/store/home-store.ts` | State machine, all phases, thread, all actions |
| `apps/web/src/app/[locale]/(main)/home/page.tsx` | Page shell — empty-state routing, thread render, thinking indicator |
| `apps/web/src/flows/registry.ts` | Flow registry maps (by intent and by response type) |
| `apps/web/src/flows/flow-definition.ts` | `FlowDefinition` interface, `FlowId`, `HomePhase` types |
| `apps/web/src/flows/consult/` | ConsultThinking animation, ConsultResult card, schema, fixtures |
| `apps/web/src/flows/save/` | SaveSheet, SaveFlow, onResponse normalization, fixtures |
| `apps/web/src/flows/recall/` | RecallFlow (null render), onResponse normalization, fixtures |
| `apps/web/src/flows/discovery/` | DiscoveryResults card list |
| `apps/web/src/flows/cold-start-zero/` | ColdStartZero empty state |
| `apps/web/src/flows/cold-start-1-4/` | ColdStartOneFour empty state + discovery trigger |
| `apps/web/src/components/home/` | HomeIdle, TasteProfileCelebration, UserBubble, AssistantBubble, SaveResultBubble, RecallResultBubble, ConsultError, SaveError |
