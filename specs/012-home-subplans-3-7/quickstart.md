# Quickstart: Home Page Sub-plans 3–7

**Branch**: `012-home-subplans-3-7`

## Prerequisites

Sub-plans 1–2 must be landed. Verify:
```bash
git log --oneline | grep "001-home-infra"
# should show the merged commits
```

## Run in fixture mode (default)

```bash
pnpm nx dev web
```

`NEXT_PUBLIC_CHAT_FIXTURES=true` is the default in development. All flows run against fixture data — no backend required.

## Test each flow manually

Set localStorage state in browser DevTools → Application → Local Storage:

```js
// Flow 7 — Cold 0
localStorage.removeItem('totoro.savedCount');
localStorage.removeItem('totoro.savedPlaces');

// Flow 8 — Cold 1–4
localStorage.setItem('totoro.savedCount', '2');

// Taste profile
localStorage.setItem('totoro.tasteProfile', 'true');

// Flow 2 — Idle + Consult
localStorage.setItem('totoro.savedCount', '5');
localStorage.setItem('totoro.tasteProfile', 'true');

// Set location (for consult context)
localStorage.setItem('totoro.location', '{"lat":13.7563,"lng":100.5018}');
```

Then reload the page.

## Trigger fixture responses

In the input bar, type these exact strings to hit specific fixtures:

| Input | Flow | Fixture response |
|-------|------|-----------------|
| `tiktok.com/@foodie/ramen123` | Save | Resolved save |
| `Fuji Ramen Bangkok` | Save | Duplicate |
| `Paste Bangkok restaurant` | Save | Resolved (low confidence) |
| `that ramen place from TikTok` | Recall | 2 results, has_more: true |
| `the cafe near Sukhumvit` | Recall | 3 results, has_more: false |
| `Japanese spot in Tokyo` | Recall | 1 result, has_more: true |
| `unknown recall query` | Recall | 0 results (empty state footer) |
| `clarify me` | Assistant | Clarification bubble |
| `Cheap dinner nearby` | Consult | Fuji Ramen result |
| `Something romantic for tonight` | Consult | Fuji Ramen result |

## Run tests

```bash
pnpm nx test web
pnpm nx lint web
pnpm nx build web   # type-check + build
```

## Verify illustration renames

```bash
# After renames, check no old references remain
grep -r "totoro-home-input\|totoro-splash\|totoro-success\|totoro-place-detail\|totoro-hover-peek\|totoro-step-complete" apps/web/src/
# Should return zero results
```

## Flip to real API

```bash
# In apps/web/.env.local
NEXT_PUBLIC_CHAT_FIXTURES=false
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Requires NestJS `/api/v1/chat` endpoint to exist (not yet built).
