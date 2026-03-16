# Recall — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to execute this plan across three repos. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stub out the Recall feature foundation — API contract, NestJS endpoint, UI shell with mock states, i18n keys, and SVG rename.

**Architecture:** Three independent work streams (totoro, totoro-ai, totoro-config) with no blocking dependencies. Totoro has the bulk — NestJS stub + UI updates. totoro-ai mirrors docs. totoro-config adds one Bruno file.

**Tech Stack:** NestJS, Next.js + TypeScript, next-intl, Tailwind, Framer Motion

---

## Chunk 1: Docs Updates (totoro + totoro-ai)

### Task 1: Update totoro API contract

**Files:**
- Modify: `docs/api-contract.md`

- [ ] **Step 1: Add POST /v1/recall section to api-contract.md**

After the `/v1/consult` section, add:

```markdown
## POST /v1/recall

Retrieve saved places matching a natural language memory fragment. Only searches the user's collection — no external discovery.

**Request (Frontend → NestJS):**
```json
{
  "query": "that ramen place I saved from TikTok"
}
```

**Request (NestJS → totoro-ai):**
```json
{
  "user_id": "string",
  "query": "that ramen place I saved from TikTok"
}
```

**Response:**
```json
{
  "results": [
    {
      "place_id": "string",
      "place_name": "Fuji Ramen",
      "address": "123 Sukhumvit Soi 33, Bangkok",
      "cuisine": "ramen",
      "price_range": "low",
      "source_url": "https://www.tiktok.com/@foodie/video/123",
      "match_reason": "Saved from TikTok, tagged ramen"
    }
  ],
  "total": 1
}
```

**Notes:**
- `user_id` is injected by NestJS from the Clerk auth token. The frontend request body does NOT include `user_id`.
- Phase 1: NestJS stub returns 501 Not Implemented. Phase 3 will forward to totoro-ai.
- Error handling follows the same table as `/v1/consult`.
```

- [ ] **Step 2: Update API contract table to include recall**

Find this section:

```markdown
| Endpoint               | Purpose                                     | NestJS Sends             | totoro-ai Returns                          |
| ---------------------- | ------------------------------------------- | ------------------------ | ------------------------------------------ |
| POST /v1/extract-place | Extract and validate a place from raw input | raw_input, user_id       | place_id, place metadata, confidence score |
| POST /v1/consult       | Get a recommendation from natural language  | query, user_id, location | 1 primary + 2 alternatives with reasoning  |
```

Add a third row:

```markdown
| POST /v1/recall        | Retrieve saved places matching memory       | query, user_id           | list of saved places matching query        |
```

- [ ] **Step 3: Commit**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
git add docs/api-contract.md
git commit -m "docs: add POST /v1/recall to api contract"
```

---

### Task 2: Update totoro architecture.md

**Files:**
- Modify: `docs/architecture.md`

- [ ] **Step 1: Add Recall data flow section**

After the "Data Flow: Consult" section, add:

```markdown
## Data Flow: Recall (Retrieve Saved Places)

1. User types a memory fragment (e.g., "that ramen place I saved from TikTok") in apps/web.
2. apps/web sends the query to services/api via REST.
3. services/api verifies auth, then forwards to totoro-ai via POST /v1/recall with user_id and query.
4. totoro-ai performs vector search on the user's saved places, filters by similarity to the query, and returns matching results.
5. services/api returns the results to apps/web.
6. apps/web renders the list of saved places with match reasons.

One HTTP call to totoro-ai. Recall only searches saved places — no external discovery, no ranking, no taste model.
```

- [ ] **Step 2: Update API contract table in architecture.md**

Find the API contract table and add the third row (same as in api-contract.md).

- [ ] **Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add Recall data flow to architecture"
```

---

### Task 3: Mirror api-contract.md to totoro-ai

**Files:**
- Modify: `docs/api-contract.md` (in totoro-ai repo)

- [ ] **Step 1: Copy the updated api-contract.md from totoro to totoro-ai**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro-ai
cp /Users/saher/dev/repos/totoro-dev/totoro/docs/api-contract.md docs/api-contract.md
git add docs/api-contract.md
git commit -m "docs: mirror api-contract.md from totoro (add POST /v1/recall)"
```

---

### Task 4: Update totoro-ai architecture.md

**Files:**
- Modify: `docs/architecture.md` (in totoro-ai repo)

- [ ] **Step 1: Update the endpoint diagram to include recall**

Find this section in totoro-ai's `docs/architecture.md`:

```markdown
                │  POST /v1/extract-place
                │  POST /v1/consult
                ▼
```

Change to:

```markdown
                │  POST /v1/extract-place
                │  POST /v1/consult
                │  POST /v1/recall
                ▼
```

- [ ] **Step 2: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add POST /v1/recall endpoint to architecture diagram"
```

---

## Chunk 2: NestJS Stub Module + Bruno

### Task 5: Create Recall DTOs

**Files:**
- Create: `services/api/src/recall/dto/recall-request.dto.ts`
- Create: `services/api/src/recall/dto/recall-response.dto.ts`

- [ ] **Step 1: Write recall-request.dto.ts**

```typescript
// services/api/src/recall/dto/recall-request.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RecallRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query: string;
}
```

- [ ] **Step 2: Write recall-response.dto.ts**

```typescript
// services/api/src/recall/dto/recall-response.dto.ts
export class RecallPlaceDto {
  place_id: string;
  place_name: string;
  address: string;
  cuisine?: string;
  price_range?: string;
  source_url?: string;
  match_reason: string;
}

export class RecallResponseDto {
  results: RecallPlaceDto[];
  total: number;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
git add services/api/src/recall/dto/
git commit -m "feat(api): add RecallRequestDto and RecallResponseDto"
```

---

### Task 6: Create Recall Service

**Files:**
- Create: `services/api/src/recall/recall.service.ts`

- [ ] **Step 1: Write service with 501 stub**

```typescript
// services/api/src/recall/recall.service.ts
import { Injectable, NotImplementedException } from '@nestjs/common';
import { RecallRequestDto, RecallResponseDto } from './dto/recall-response.dto';

@Injectable()
export class RecallService {
  /**
   * Search saved places matching the user's memory fragment.
   * Phase 1: stub returns 501. Phase 3: forwards to totoro-ai.
   */
  async recall(userId: string, request: RecallRequestDto): Promise<RecallResponseDto> {
    throw new NotImplementedException('Recall feature is not yet implemented');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/recall/recall.service.ts
git commit -m "feat(api): add RecallService stub"
```

---

### Task 7: Create Recall Controller

**Files:**
- Create: `services/api/src/recall/recall.controller.ts`

- [ ] **Step 1: Write controller**

```typescript
// services/api/src/recall/recall.controller.ts
import { Controller, Post, Body, Request, HttpCode } from '@nestjs/common';
import { RecallService } from './recall.service';
import { RecallRequestDto, RecallResponseDto } from './dto/recall-response.dto';
import { ClerkUser } from '../common/middleware/clerk.middleware';

@Controller('recall')
export class RecallController {
  constructor(private readonly recallService: RecallService) {}

  @Post()
  @HttpCode(501)
  async recall(@Request() req, @Body() dto: RecallRequestDto): Promise<RecallResponseDto> {
    const user = req.user as ClerkUser;
    return this.recallService.recall(user.id, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/recall/recall.controller.ts
git commit -m "feat(api): add RecallController facade"
```

---

### Task 8: Create Recall Module

**Files:**
- Create: `services/api/src/recall/recall.module.ts`

- [ ] **Step 1: Write module**

```typescript
// services/api/src/recall/recall.module.ts
import { Module } from '@nestjs/common';
import { RecallController } from './recall.controller';
import { RecallService } from './recall.service';

@Module({
  controllers: [RecallController],
  providers: [RecallService],
})
export class RecallModule {}
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/recall/recall.module.ts
git commit -m "feat(api): add RecallModule"
```

---

### Task 9: Register Recall Module in AppModule

**Files:**
- Modify: `services/api/src/app/app.module.ts`

- [ ] **Step 1: Import RecallModule**

Add this import at the top:

```typescript
import { RecallModule } from '../recall/recall.module';
```

Then add `RecallModule` to the `imports` array in the `@Module` decorator:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => {
          const fileContent = fs.readFileSync(configPath, 'utf-8');
          return yaml.parse(fileContent);
        },
      ],
    }),
    PrismaModule,
    RecallModule,  // ← Add this line
  ],
  controllers: [AppController, ClerkWebhookController],
  providers: [AppService, AiEnabledGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ClerkMiddleware).forRoutes('*');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/app/app.module.ts
git commit -m "feat(api): register RecallModule in AppModule"
```

---

### Task 10: Add Bruno request file

**Files:**
- Create: `bruno/nestjs-api/recall.bru` (in totoro-config repo)

- [ ] **Step 1: Write recall.bru**

```
meta {
  name: Recall
  type: http
  seq: 3
}

post {
  url: {{nestjs_url}}/api/v1/recall
  body: json
  auth: bearer
}

auth:bearer {
  token: your-test-token
}

body:json {
  {
    "query": "that ramen place I saved from TikTok"
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro-config
git add bruno/nestjs-api/recall.bru
git commit -m "test: add Bruno request for POST /api/v1/recall"
```

---

## Chunk 3: SVG Rename + Illustrations

### Task 11: Rename SVG file

**Files:**
- File operation: `apps/web/public/illustrations/totoro-saved-places.svg` → `totoro-empty.svg`

- [ ] **Step 1: Rename file**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
mv apps/web/public/illustrations/totoro-saved-places.svg apps/web/public/illustrations/totoro-empty.svg
git add apps/web/public/illustrations/totoro-empty.svg
git rm apps/web/public/illustrations/totoro-saved-places.svg
git commit -m "refactor: rename totoro-saved-places.svg → totoro-empty.svg (shared empty state)"
```

---

### Task 12: Update totoro-illustrations.tsx exports

**Files:**
- Modify: `apps/web/src/components/illustrations/totoro-illustrations.tsx`

- [ ] **Step 1: Find and rename the export**

Find this line (around line 43):

```typescript
export function TotoroSavedPlaces() {
  return <SvgImg src="/illustrations/totoro-saved-places.svg" alt="Totoro saved places" animations="anim-bob" />;
}
```

Change to:

```typescript
export function TotoroEmpty() {
  return <SvgImg src="/illustrations/totoro-empty.svg" alt="Totoro empty state" animations="anim-bob" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/illustrations/totoro-illustrations.tsx
git commit -m "refactor: rename TotoroSavedPlaces → TotoroEmpty export"
```

---

### Task 13: Update places/page.tsx import

**Files:**
- Modify: `apps/web/src/app/[locale]/(main)/places/page.tsx`

- [ ] **Step 1: Update import**

Find:

```typescript
import { TotoroSavedPlaces } from '@/components/illustrations/totoro-illustrations';
```

Change to:

```typescript
import { TotoroEmpty } from '@/components/illustrations/totoro-illustrations';
```

- [ ] **Step 2: Update usage**

Find all occurrences of `<TotoroSavedPlaces />` (should be one, around line 125) and change to `<TotoroEmpty />`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/(main)/places/page.tsx
git commit -m "refactor: update TotoroSavedPlaces → TotoroEmpty reference"
```

---

## Chunk 4: i18n Keys

### Task 14: Update English messages

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Update home.suggestions to 3 chips**

Find the `"home"` section and locate `"suggestions"`. Replace all 5 suggestions with:

```json
"suggestions": {
  "consult": "Cheap dinner nearby",
  "save": "Save this place link",
  "recall": "Recall a saved place"
}
```

- [ ] **Step 2: Add recall namespace**

Add this at the end of the `en.json` file (before the closing `}`):

```json
"recall": {
  "searching": "Searching your saved places",
  "takesAbout": "Looking through your collection",
  "foundTitle": "Found in your saves",
  "foundSubtitle": "Places that match your memory",
  "noResults": "Nothing matched",
  "noResultsDesc": "Try describing it differently — a cuisine, city, or how you saved it"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "i18n: add recall keys and simplify home suggestions to 3 chips"
```

---

### Task 15: Update Hebrew messages

**Files:**
- Modify: `messages/he.json`

- [ ] **Step 1: Mirror English changes**

Apply the same changes as Task 14 (3 chips + recall namespace). Use placeholder Hebrew or ask translator — for Phase 1, English placeholders are acceptable.

- [ ] **Step 2: Commit**

```bash
git add messages/he.json
git commit -m "i18n: mirror recall keys and suggestions updates to Hebrew"
```

---

## Chunk 5: AgentResponseBubble + HomeEmptyState

### Task 16: Extend AgentFlow type and add recall states

**Files:**
- Modify: `apps/web/src/components/AgentResponseBubble.tsx`

- [ ] **Step 1: Update AgentFlow type**

Find (around line 75):

```typescript
export type AgentFlow = "recommend" | "add-place";
```

Change to:

```typescript
export type AgentFlow = "recommend" | "add-place" | "recall";
```

- [ ] **Step 2: Add mock recall results**

After the existing `MOCK_RESULTS` object, add:

```typescript
const MOCK_RECALL_RESULTS = [
  {
    place_id: '1',
    place_name: 'Fuji Ramen',
    address: '123 Sukhumvit Soi 33, Bangkok',
    cuisine: 'ramen',
    price_range: 'low',
    source_url: 'https://www.tiktok.com/@foodie/video/123',
    match_reason: 'Saved from TikTok, tagged ramen',
  },
  {
    place_id: '2',
    place_name: 'Bankara Ramen',
    address: '456 Sukhumvit Soi 39, Bangkok',
    cuisine: 'ramen',
    price_range: '$$',
    source_url: null,
    match_reason: 'Ramen restaurant, saved 2 months ago',
  },
];
```

- [ ] **Step 3: Update the results rendering section**

Find the section where results are rendered (the large conditional block starting with `: phase === "result" ? ...`). Before the closing `</motion.div>` of the recommend results block, add an `else if` for recall:

```typescript
        ) : flow === "recall" ? (
          <motion.div
            key="recall-result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-3 w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-[hsl(140,35%,90%)] p-1.5">
                <TotoroResultCard />
              </div>
              <div>
                <p className="font-display text-lg text-foreground">
                  {t("recall.foundTitle")}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {t("recall.foundSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {MOCK_RECALL_RESULTS.map((place) => (
                <div key={place.place_id} className="rounded-lg border border-border bg-background p-3">
                  <p className="font-display text-sm text-foreground">{place.place_name}</p>
                  <p className="font-body text-xs text-muted-foreground mb-1">{place.address}</p>
                  <p className="font-body text-xs text-muted-foreground">{t("recall.matchReason")}: {place.match_reason}</p>
                </div>
              ))}
            </div>
          </motion.div>
```

Also add a recall empty state in the empty state conditional:

Find the empty state section (looking for the `TotoroSavedPlaces` reference). After the existing empty content, add an `else if` for recall:

```typescript
        ) : flow === "recall" && (!displayItems || displayItems.length === 0) ? (
          <motion.div
            key="recall-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <div className="w-[42px] h-[42px] md:w-[48px] md:h-[48px] flex-shrink-0 rounded-full bg-[hsl(0,30%,92%)] p-1.5">
              <TotoroEmpty />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-display text-sm text-foreground font-medium">
                {t("recall.noResults")}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                {t("recall.noResultsDesc")}
              </p>
            </div>
          </motion.div>
```

- [ ] **Step 4: Import TotoroEmpty**

Add to the imports at the top:

```typescript
import {
  TotoroEmpty,
  // ... existing imports
} from "@/components/illustrations/totoro-illustrations";
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/AgentResponseBubble.tsx
git commit -m "feat(web): add recall flow to AgentResponseBubble with mock states"
```

---

### Task 17: Update HomeEmptyState to 3 chips

**Files:**
- Modify: `apps/web/src/components/home-empty-state.tsx`

- [ ] **Step 1: Update suggestions array**

Find:

```typescript
const suggestions = [
  t('home.suggestions.cheapDinner'),
  t('home.suggestions.bestCoffee'),
  t('home.suggestions.dateNight'),
  t('home.suggestions.brunch'),
  t('home.suggestions.savePlace'),
];
```

Change to:

```typescript
const suggestions = [
  t('home.suggestions.consult'),
  t('home.suggestions.save'),
  t('home.suggestions.recall'),
];
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/home-empty-state.tsx
git commit -m "refactor(web): trim HomeEmptyState suggestions to 3 chips (consult, save, recall)"
```

---

## Final Steps

### Task 18: Verify all changes across repos

- [ ] **Step 1: Check totoro branch**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro
git log --oneline -10
git status
```

Expected: feature/recall-phase-1 branch with 13 commits, clean working tree.

- [ ] **Step 2: Check totoro-ai branch**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro-ai
git log --oneline -5
git status
```

Expected: clean working tree with 1 new commit.

- [ ] **Step 3: Check totoro-config branch**

```bash
cd /Users/saher/dev/repos/totoro-dev/totoro-config
git log --oneline -5
git status
```

Expected: clean working tree with 1 new commit.

---

## Verification Commands

Run these to confirm everything is working:

```bash
# NestJS lint
cd /Users/saher/dev/repos/totoro-dev/totoro
pnpm nx lint api

# NestJS build (stub doesn't need test)
pnpm nx build api

# Next.js lint
pnpm nx lint web

# All tasks should pass with no errors
```

---

## Scope Confirmation

✅ API contract documented in both repos
✅ NestJS stub returns 501
✅ RecallModule properly registered
✅ Recall flow added to AgentResponseBubble with mock states
✅ Recall chip added to HomeEmptyState (trimmed to 3)
✅ SVG renamed + references updated
✅ i18n keys added (no hardcoded strings)
✅ Bruno request file created

❌ NOT in Phase 1:
- FastAPI implementation
- Real vector search
- Wiring chip to call API
- Recommendation history storage
