# IELTS-Word PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, package, and deploy an iPhone-first offline IELTS vocabulary PWA from the two specified local PDF books.

**Architecture:** A static React/Vite application seeds immutable vocabulary assets into one versioned Dexie database, while pure domain modules handle FSRS scheduling, local-day queues, spelling, statistics, and versioned backup/restore. UI features call transaction services rather than Dexie or `ts-fsrs` directly; Workbox precaches the app and vocabulary, and Cloudflare Pages hosts only `dist`.

**Tech Stack:** React 19, TypeScript strict, Vite, React Router, Tailwind CSS, Dexie, ts-fsrs 5.4.1, Zod, date-fns, Vitest, React Testing Library, Playwright, vite-plugin-pwa, pnpm.

---

## File map

```text
scripts/
  extract_vocabulary.py             PDF parsing, cleaning, stable JSON generation
  validate_vocabulary.py            schema/anomaly/sentinel validation
  requirements.txt                  pinned extraction dependencies
src/
  app/App.tsx                       router and route shell
  app/AppBootstrap.tsx              DB seed/loading/error boundary
  app/PwaUpdatePrompt.tsx           non-blocking SW update
  app/NetworkStatus.tsx             offline state
  data/books/*.json                 canonical extracted vocabulary
  data/books/index.ts               URL-based book loader and metadata
  db/database.ts                    Dexie schema and migrations
  db/migrations.ts                  v1 fixture schema and v1 → v2 upgrade
  db/seed.ts                        idempotent vocabulary seed
  db/types.ts                       persisted record contracts
  domain/daily/dateKey.ts           local calendar helpers
  domain/daily/newPlan.ts           persistent deterministic new-word plan
  domain/daily/reviewQueue.ts       review filters and priority sort
  domain/fsrs/adapter.ts            DB ↔ ts-fsrs conversion and preview/next
  domain/fsrs/reviewService.ts      atomic rating transaction and next-day clamp
  domain/spelling/compare.ts        normalization and independent edit diff
  domain/backup/schema.ts           versioned Zod backup contract
  domain/backup/service.ts          export/import/rollback
  domain/statistics/calculate.ts    daily/streak/progress metrics
  services/audio/SpeechService.ts   cancellable browser TTS
  features/onboarding/*             first-run setup
  features/home/*                   separate review/new areas
  features/study/*                  common session and three modes
  features/collections/*            mistakes/favorites/mastered
  features/statistics/*             7/30-day and book progress
  features/settings/*               preferences, backup, install/privacy
  shared/components/*               shell, nav, buttons, states, dialogs
  styles/index.css                  palette, safe areas, responsive states
tests/
  unit/*                            pure domain and Dexie tests
  unit/migration-v1-v2.test.ts      persisted-progress migration proof
  components/*                      React behavior tests
e2e/
  onboarding.spec.ts
  persistence-next-day.spec.ts
  study-modes.spec.ts
  backup-collections.spec.ts
  pwa-mobile-offline.spec.ts
```

### Task 1: Reproducible vocabulary extraction

**Files:**

- Create: `scripts/extract_vocabulary.py`
- Create: `scripts/validate_vocabulary.py`
- Create: `scripts/requirements.txt`
- Create: `tests/python/test_extract_vocabulary.py`
- Create: `src/data/books/ielts-toefl-basic.json`
- Create: `src/data/books/ielts-listening-spelling.json`
- Create: `reports/vocabulary-extraction-report.md`
- Create: `reports/vocabulary-validation.json`

- [ ] **Step 1: Write failing extraction tests**

Tests assert:

```python
assert len(basic) == 1997
assert {item["sourceGroup"] for item in basic} == {f"Day {n}" for n in range(1, 21)}
assert basic[0]["word"] == "precise"
assert basic[-1]["word"] == "freeze"
assert len(listening) == 2497
assert listening[0]["word"] == "absence"
assert listening[-1]["word"] == "zoom lens"
assert all(item["word"] and item["meanings"] for item in basic + listening)
assert all("词汇" != item["word"] for item in listening)
```

The validator report must expose checks covering at least these 16 semantic category keys. Additional schema, identity, count, sentinel, or source-integrity checks are allowed:

```python
EXPECTED_CHECKS = {
    "whitespace",
    "case_anomaly",
    "unicode_normalization",
    "broken_word_or_line",
    "phonetic_misalignment",
    "part_of_speech_misalignment",
    "header_or_page_number",
    "empty_word",
    "empty_meaning",
    "duplicate_within_book",
    "duplicate_across_books",
    "note_split",
    "overlong_text",
    "suspected_garbled_text",
    "missing_source_group",
    "row_boundary_leakage",
}

assert EXPECTED_CHECKS <= set(report["checks"])
for result in report["checks"].values():
    assert set(result) >= {"detected", "fixed", "remaining", "samples"}
    assert all(isinstance(result[key], int) for key in ("detected", "fixed", "remaining"))
```

Fixtures or real-source assertions must exercise every key. `row_boundary_leakage` covers both Chinese mixed into an English word and a following-row English word mixed into a meaning. A blocking `remaining` count must make `validate_vocabulary.py` exit non-zero.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
python -m unittest tests/python/test_extract_vocabulary.py -v
```

Expected: import or file-not-found failure because the extraction module and JSON outputs do not exist.

- [ ] **Step 3: Implement the two-layout parser**

Implement:

```python
@dataclass(frozen=True)
class RawEntry:
    word: str
    phonetic: str
    part_of_speech: str
    meaning: str
    note: str
    source_group: str
    page: int

BOOK_IDS = {
    "basic": "ielts-toefl-basic",
    "listening": "ielts-listening-spelling",
}

def normalize_word(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().casefold()

def stable_id(book_id: str, source_order: int) -> str:
    return f"{book_id}-{source_order:04d}"
```

Implement `extract_basic(pdf_path) -> list[RawEntry]`, `extract_listening(pdf_path) -> list[RawEntry]`, `clean_entries(entries, book_id) -> list[dict[str, object]]`, and `validate_entries(entries) -> dict[str, object]` with these exact names. The basic parser must use line-table extraction. The listening parser must anchor all columns to the English row and handle page 37's layout change. Invalid plain-English phonetic cells become empty and are reported; one-sided slash defects are repaired.

- [ ] **Step 4: Generate JSON and validation reports**

Run:

```powershell
python scripts/extract_vocabulary.py --source-dir .. --output-dir src/data/books --report-dir reports
python scripts/validate_vocabulary.py --data-dir src/data/books --report reports/vocabulary-validation.json
```

Expected: two JSON files, 4,494 source rows in total, zero empty meanings, at least all 16 semantic validation categories with per-check counts/samples, and a non-zero anomaly/fix report rather than silent deletion.

- [ ] **Step 5: Run extraction tests and inspect rendered sentinels**

Run:

```powershell
python -m unittest tests/python/test_extract_vocabulary.py -v
```

Expected: all tests pass. Compare page 2, page 36-37, and both final pages against `tmp/pdfs` sample renders, and record those sentinel outcomes in `reports/vocabulary-extraction-report.md`.

- [ ] **Step 6: Commit**

```powershell
git add scripts tests/python src/data/books reports
git commit -m "feat: add vocabulary extraction pipeline"
```

### Task 2: Scaffold strict React/Vite and quality tools

**Files:**

- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `eslint.config.js`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.test.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/index.css`
- Create: `src/vite-env.d.ts`
- Create: `src/test/setup.ts`
- Create: `tests/components/app-smoke.test.tsx`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Hand-scaffold the Vite TypeScript baseline in the non-empty directory**

Do **not** run `pnpm create vite .`: the formal directory already contains reviewed docs, reports, scripts, extracted data, and Python tests, and the create-vite non-empty-directory prompt can overwrite them. Create only the files listed for Task 2 with `apply_patch`, using the current Vite React TypeScript baseline, and leave `docs`, `reports`, `scripts`, `src/data`, and `tests/python` untouched.

Before installing packages, create this minimal `package.json`:

```json
{
  "name": "ielts-vocabulary-pwa",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@11.2.2",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=11.0.0"
  },
  "scripts": {}
}
```

- [ ] **Step 2: Install fixed runtime and test dependencies**

Run:

```powershell
pnpm add --save-exact react@19.2.8 react-dom@19.2.8 react-router-dom@7.18.1 dexie@4.4.4 dexie-react-hooks@4.4.0 ts-fsrs@5.4.1 zod@4.4.3 date-fns@4.4.0 @phosphor-icons/react@2.1.10 @fontsource-variable/outfit@5.3.0
pnpm add -D --save-exact vite@8.1.5 @vitejs/plugin-react@6.0.4 typescript@6.0.3 @types/node@24.13.3 @types/react@19.2.17 @types/react-dom@19.2.3 tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vite-plugin-pwa@1.3.0 vitest@4.1.10 @vitest/coverage-v8@4.1.10 jsdom@29.1.1 @testing-library/dom@10.4.1 @testing-library/react@16.3.2 @testing-library/jest-dom@7.0.0 @testing-library/user-event@14.6.1 fake-indexeddb@6.2.5 @playwright/test@1.62.0 eslint@10.8.0 @eslint/js@10.0.1 typescript-eslint@8.65.0 eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-refresh@0.5.3 globals@17.7.0 wrangler@4.114.0
```

These are the stable registry versions verified against Node `24.15.0` on 2026-07-26. TypeScript is intentionally pinned to `6.0.3` rather than registry-latest `7.x` because `typescript-eslint@8.65.0` supports TypeScript `<6.1.0`. `@playwright/test` already installs the matching `playwright` package and CLI; do not add a duplicate direct dependency.

- [ ] **Step 3: Configure scripts and strict gates**

`package.json` scripts:

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "lint": "eslint . --max-warnings 0",
  "typecheck": "tsc -b --pretty false",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "extract:vocabulary": "python scripts/extract_vocabulary.py --source-dir .. --output-dir src/data/books --report-dir reports",
  "validate:vocabulary": "python scripts/validate_vocabulary.py --data-dir src/data/books --report reports/vocabulary-validation.json",
  "deploy:pages": "wrangler pages deploy dist --project-name ielts-vocabulary-pwa --branch main"
}
```

Keep `strict: true`, `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true`. Reference `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.test.json` from the root config so source, configuration, unit/component tests, and E2E tests all participate in type checking. Put `vite/client` in `src/vite-env.d.ts`.

Register `react()` and Tailwind v4's `tailwindcss()` Vite plugin; import `src/styles/index.css` from `main.tsx`, and start that stylesheet with `@import "tailwindcss";`. Do not add a Tailwind v3 PostCSS scaffold. Configure Vitest with `environment: 'jsdom'`, `src/test/setup.ts`, and an E2E exclusion. The setup file imports `@testing-library/jest-dom/vitest` and `fake-indexeddb/auto` and performs React Testing Library cleanup after each test.

Set Playwright's local base URL to `http://127.0.0.1:4173` and use a production-preview web server command (`pnpm build && pnpm preview --host 127.0.0.1 --port 4173`). When `PLAYWRIGHT_BASE_URL` is present for hosted acceptance, use it and omit the local web server entirely. Keep `testDir: './e2e'`.

When Task 10 enables `VitePWA`, include `json` in Workbox's explicit asset glob (`**/*.{js,css,html,ico,png,svg,webp,woff2,json}`) and add `vite-plugin-pwa/react` to the app types. The `.gitignore` must cover `node_modules`, `dist`, `coverage`, `.wrangler`, Playwright reports/results, Python caches, local `.env` files, and `*.pdf`; retain an exception for `.env.example`.

- [ ] **Step 4: Add a smoke test before the app implementation**

```tsx
it('renders the application name', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /IELTS Word/i })).toBeInTheDocument()
})
```

- [ ] **Step 5: Verify RED, then add the minimum app shell**

Run `pnpm test -- tests/components/app-smoke.test.tsx`; expect failure before `App` exists. Add `src/app/App.tsx` and rerun; expect pass.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "chore: initialize React Vite project"
```

### Task 3: Dexie schema, seed, and settings

**Files:**

- Create: `src/db/types.ts`
- Create: `src/db/database.ts`
- Create: `src/db/migrations.ts`
- Create: `src/db/seed.ts`
- Create: `src/data/books/index.ts`
- Create: `tests/unit/database.test.ts`
- Create: `tests/unit/seed.test.ts`
- Create: `tests/unit/migration-v1-v2.test.ts`

- [ ] **Step 1: Write failing database tests**

```ts
it('creates all current version-two tables', async () => {
  const names = db.tables.map((table) => table.name)
  expect(names).toEqual(expect.arrayContaining([
    'books', 'words', 'cards', 'reviewLogs', 'dailyPlans',
    'dailyProgress', 'settings', 'favorites', 'mistakes',
    'studySessions', 'appMeta',
  ]))
})

it('seeds vocabulary idempotently', async () => {
  await seedVocabulary(db, fixtures)
  await seedVocabulary(db, fixtures)
  expect(await db.words.count()).toBe(fixtures.words.length)
})

it('migrates v1 progress to v2 without losing user records', async () => {
  const name = uniqueDatabaseName()
  await writeVersionOneFixture(name, {
    cards: [legacyCard],
    reviewLogs: [legacyReviewLog],
    favorites: [legacyFavorite],
    mistakes: [legacyMistake],
    settings: [legacySettings],
  })

  const migrated = openVersionTwoDatabase(name)
  await migrated.open()

  expect(await migrated.cards.get(legacyCard.id)).toMatchObject({
    id: legacyCard.id,
    reps: legacyCard.reps,
  })
  expect(await migrated.reviewLogs.count()).toBe(1)
  expect(await migrated.favorites.count()).toBe(1)
  expect(await migrated.mistakes.count()).toBe(1)
  expect(await migrated.settings.get('default')).toMatchObject({
    currentBookId: legacySettings.currentBookId,
  })
})
```

- [ ] **Step 2: Verify RED**

Run `pnpm test -- tests/unit/database.test.ts tests/unit/seed.test.ts tests/unit/migration-v1-v2.test.ts`; expect missing module failures.

- [ ] **Step 3: Implement versioned records and Dexie schema**

Use epoch milliseconds for indexed time values and define:

```ts
class IELTSWordDatabase extends Dexie {
  books!: Table<BookRecord, string>
  words!: Table<WordRecord, string>
  cards!: Table<CardRecord, string>
  reviewLogs!: Table<ReviewLogRecord, string>
  dailyPlans!: Table<DailyPlanRecord, string>
  dailyProgress!: Table<DailyProgressRecord, string>
  settings!: Table<SettingsRecord, string>
  favorites!: Table<FavoriteRecord, string>
  mistakes!: Table<MistakeRecord, string>
  studySessions!: Table<StudySessionRecord, string>
  appMeta!: Table<AppMetaRecord, string>
}
```

Define the legacy v1 stores in `migrations.ts`, then define Dexie v2 with an `upgrade()` callback that supplies defaults for new CardRecord and SettingsRecord fields. The callback must preserve existing primary keys and must not clear cards, reviewLogs, favorites, mistakes, plans, sessions, or settings. Seed books/words and default settings inside a transaction. Store `vocabularyVersion` in appMeta and never clear progress when only vocabulary content is refreshed.

- [ ] **Step 4: Verify GREEN**

Run `pnpm test -- tests/unit/database.test.ts tests/unit/seed.test.ts tests/unit/migration-v1-v2.test.ts`; expect all pass and verify the fixture database is deleted in test cleanup.

- [ ] **Step 5: Commit**

```powershell
git add src/db src/data/books/index.ts tests/unit
git commit -m "feat: add versioned IndexedDB storage"
```

### Task 4: FSRS adapter and next-day invariant

**Files:**

- Create: `src/domain/fsrs/adapter.ts`
- Create: `src/domain/fsrs/reviewService.ts`
- Create: `src/domain/daily/dateKey.ts`
- Create: `tests/unit/fsrs-adapter.test.ts`
- Create: `tests/unit/next-day-review.test.ts`

- [ ] **Step 1: Write failing rating and conversion tests**

```ts
it.each([
  [Rating.Again, 1],
  [Rating.Hard, 2],
  [Rating.Good, 3],
  [Rating.Easy, 4],
])('persists rating %s and increments reps', async (rating) => {
  const result = scheduleReview(emptyCardRow(now), rating, now)
  expect(result.card.reps).toBe(1)
  expect(result.log.rating).toBe(rating)
  expect(Number.isFinite(result.card.dueAt)).toBe(true)
})
```

- [ ] **Step 2: Write failing next-day tests**

```ts
it('clamps the first formal review to the next local day', async () => {
  const introducedAt = new Date(2026, 6, 26, 23, 58).getTime()
  const result = await reviewCard(db, newCardId, Rating.Easy, introducedAt, 'recognition')
  expect(result.card.dueAt).toBe(new Date(2026, 6, 27, 0, 0).getTime())
  expect(result.card.firstNextDayReviewAt).toBeUndefined()
})

it('releases the clamp after a later local-date review', async () => {
  const reviewedAt = new Date(2026, 6, 27, 8, 0).getTime()
  const result = await reviewCard(db, pendingCardId, Rating.Good, reviewedAt, 'recognition')
  expect(result.card.firstNextDayReviewAt).toBe(reviewedAt)
  expect(result.card.dueAt).toBe(result.fsrsDueAt)
})
```

- [ ] **Step 3: Verify RED**

Run `pnpm test -- tests/unit/fsrs-adapter.test.ts tests/unit/next-day-review.test.ts`; expect missing adapter/service failures.

- [ ] **Step 4: Implement the adapter and atomic service**

`scheduleReview()` converts CardRecord to `CardInput`, calls `fsrs().next()`, converts Dates to epoch ms, and returns a complete log. `reviewCard()` wraps card update, log insertion, progress/session update, and optional mistake upsert in one Dexie transaction.

- [ ] **Step 5: Verify GREEN**

Run the two test files and confirm all ratings, midnight, same-day Again, next-day completion, and timezone-offset cases pass.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/fsrs src/domain/daily/dateKey.ts tests/unit
git commit -m "feat: add FSRS scheduling and next-day rule"
```

### Task 5: Daily new plan and review queue

**Files:**

- Create: `src/domain/daily/newPlan.ts`
- Create: `src/domain/daily/reviewQueue.ts`
- Create: `tests/unit/new-plan.test.ts`
- Create: `tests/unit/review-queue.test.ts`

- [ ] **Step 1: Write failing deterministic-plan tests**

```ts
it('returns the same plan after refresh', async () => {
  const first = await getOrCreateDailyPlan(db, bookId, dateKey, 20)
  const second = await getOrCreateDailyPlan(db, bookId, dateKey, 50)
  expect(second.wordIds).toEqual(first.wordIds)
})

it('selects only never-introduced words in source order', async () => {
  const plan = await getOrCreateDailyPlan(db, bookId, dateKey, 3)
  expect(plan.wordIds).toEqual(['word-0002', 'word-0004', 'word-0005'])
})
```

- [ ] **Step 2: Write failing review priority tests**

Assert mastered/suspended exclusion, `dueAt <= now`, overdue ordering, Relearning priority, forced next-day inclusion, and review-limit bypass for short-term Relearning. Add the invariant where forced cards exceed the configured limit:

```ts
it('never hides forced next-day cards behind dailyReviewLimit', () => {
  const forced = Array.from({ length: 7 }, (_, index) =>
    forcedNextDayCard({ id: `forced-${index}`, dueAt: now - index }),
  )
  const normal = [dueCard({ id: 'normal-due', dueAt: now - DAY_MS })]

  const result = buildReviewQueue([...forced, ...normal], {
    now,
    today,
    dailyReviewLimit: 3,
  })

  expect(result.due.filter((card) => card.id.startsWith('forced-'))).toHaveLength(7)
  expect(result.forcedNextDayCount).toBe(7)
})
```

- [ ] **Step 3: Verify RED**

Run `pnpm test -- tests/unit/new-plan.test.ts tests/unit/review-queue.test.ts`; expect missing module failures.

- [ ] **Step 4: Implement pure selection plus Dexie persistence**

Daily plan IDs use `${bookId}:${dateKey}`. Existing plans are immutable until explicit reset. Apply `dailyReviewLimit` only after collecting all due Relearning and forced-next-day cards; those mandatory cards bypass the limit, while the remaining slots are filled by normal due cards. Review queue returns:

```ts
interface ReviewQueueResult {
  due: CardRecord[]
  totalDue: number
  overdueCount: number
  forcedNextDayCount: number
  relearningCount: number
}
```

- [ ] **Step 5: Verify GREEN and commit**

```powershell
pnpm test -- tests/unit/new-plan.test.ts tests/unit/review-queue.test.ts
git add src/domain/daily tests/unit
git commit -m "feat: add separate daily queues"
```

### Task 6: Onboarding, home, and navigation

**Files:**

- Create: `src/features/onboarding/OnboardingPage.tsx`
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/useHomeSummary.ts`
- Create: `src/shared/components/AppShell.tsx`
- Create: `src/shared/components/BottomNav.tsx`
- Create: `src/shared/components/AsyncState.tsx`
- Modify: `src/styles/index.css`
- Create: `tests/components/onboarding.test.tsx`
- Create: `tests/components/home.test.tsx`

- [ ] **Step 1: Write failing onboarding and home tests**

```tsx
it('saves book, daily amount, mode and local-data consent', async () => {
  render(<OnboardingPage />)
  await user.selectOptions(screen.getByLabelText('选择词书'), 'ielts-toefl-basic')
  await user.clear(screen.getByLabelText('每日新词'))
  await user.type(screen.getByLabelText('每日新词'), '15')
  await user.click(screen.getByRole('button', { name: '开始学习' }))
  expect(await db.settings.get('default')).toMatchObject({ dailyNewLimit: 15 })
})

it('renders separate review and new-word sections', async () => {
  render(<HomePage />)
  expect(await screen.findByRole('heading', { name: '今日复习' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '今日新词' })).toBeVisible()
  expect(screen.getByRole('button', { name: '开始复习' })).not.toBe(
    screen.getByRole('button', { name: '开始新词' }),
  )
})

it('shows every required home metric from the summary query', async () => {
  vi.mocked(useHomeSummary).mockReturnValue({
    status: 'ready',
    data: {
      dueCount: 12,
      overdueCount: 4,
      reviewCompletedCount: 3,
      reviewEstimateMinutes: 8,
      newPlannedCount: 15,
      newCompletedCount: 6,
      currentBookName: '雅思·托福基础词汇',
      streakDays: 5,
      todayCompletedCount: 9,
      todayTotalCount: 27,
      lastSevenDays: [1, 2, 3, 4, 5, 6, 7],
    },
  })
  render(<HomePage />)
  expect(screen.getByText('到期 12')).toBeVisible()
  expect(screen.getByText('逾期 4')).toBeVisible()
  expect(screen.getByText('已完成 3')).toBeVisible()
  expect(screen.getByText('预计 8 分钟')).toBeVisible()
  expect(screen.getByText('今日计划 15')).toBeVisible()
  expect(screen.getByText('新词已完成 6')).toBeVisible()
  expect(screen.getByText('连续 5 天')).toBeVisible()
  expect(screen.getByLabelText('最近 7 天学习量')).toBeVisible()
})

it('shows the backup reminder and personal-use notice before onboarding completes', () => {
  render(<OnboardingPage />)
  expect(screen.getByText(/定期导出备份/)).toBeVisible()
  expect(screen.getByText('词书仅供个人学习使用')).toBeVisible()
})
```

- [ ] **Step 2: Verify RED**

Run the two component files; expect missing pages.

- [ ] **Step 3: Implement mobile-first routes and states**

Use routes `/welcome`, `/`, `/study/new`, `/study/review`, `/mistakes`, `/favorites`, `/mastered`, `/statistics`, `/settings`. The shell uses `min-height: 100dvh` and safe-area CSS. Onboarding shows the local-only explanation, recurring-export reminder, and “词书仅供个人学习使用” before completion. Home has independent buttons and renders due, overdue, review-completed, estimated duration, new planned/completed, current book, streak, total progress, and 7-day activity from `useHomeSummary`.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
pnpm test -- tests/components/onboarding.test.tsx tests/components/home.test.tsx
git add src/features/onboarding src/features/home src/shared src/styles tests/components
git commit -m "feat: add onboarding and separated home tasks"
```

### Task 7: Three study modes and speech

**Files:**

- Create: `src/domain/spelling/compare.ts`
- Create: `src/services/audio/SpeechService.ts`
- Create: `src/features/study/StudySessionPage.tsx`
- Create: `src/features/study/RecognitionCard.tsx`
- Create: `src/features/study/SpellingCard.tsx`
- Create: `src/features/study/RatingControls.tsx`
- Create: `src/features/study/NextDuePreview.tsx`
- Create: `tests/unit/spelling.test.ts`
- Create: `tests/unit/speech-service.test.ts`
- Create: `tests/components/study-session.test.tsx`

- [ ] **Step 1: Write failing spelling tests**

```ts
expect(normalizeAnswer('  AcCommodation  ')).toBe('accommodation')
expect(compareAnswer('colour', 'color').correct).toBe(false)
expect(compareAnswer('apple', 'appl').parts).toContainEqual(
  expect.objectContaining({ kind: 'missing', char: 'e' }),
)
```

- [ ] **Step 2: Write failing study component tests**

Cover hidden/revealed answer, pronunciation button, four Chinese rating buttons, Chinese-to-English input, listening mode without visible English, mistake upsert, and next-due text.

- [ ] **Step 3: Verify RED**

Run unit and component study tests; expect missing modules.

- [ ] **Step 4: Implement independent diff, TTS singleton, and session state machine**

The diff algorithm uses dynamic programming over Unicode code points and emits `equal`, `replace`, `missing`, `extra`. `SpeechService.speak()` cancels prior utterances, prefers the configured English locale, and returns a typed result instead of throwing for unavailable voices.

- [ ] **Step 5: Verify GREEN and commit**

```powershell
pnpm test -- tests/unit/spelling.test.ts tests/unit/speech-service.test.ts tests/components/study-session.test.tsx
git add src/domain/spelling src/services/audio src/features/study tests
git commit -m "feat: add three study modes"
```

### Task 8: Mistakes, favorites, mastered, statistics, and settings

**Files:**

- Create: `src/features/collections/MistakesPage.tsx`
- Create: `src/features/collections/FavoritesPage.tsx`
- Create: `src/features/collections/MasteredPage.tsx`
- Create: `src/features/collections/collectionService.ts`
- Create: `src/domain/statistics/calculate.ts`
- Create: `src/domain/settings/clearStudyData.ts`
- Create: `src/features/statistics/StatisticsPage.tsx`
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `tests/unit/statistics.test.ts`
- Create: `tests/unit/settings-clear.test.ts`
- Create: `tests/components/collections.test.tsx`
- Create: `tests/components/settings.test.tsx`

- [ ] **Step 1: Write failing collection, statistics, and settings tests**

Collections must assert:

- mistake count, recent error time, current FSRS state, descending error-count sorting, book filter, removal, and a dedicated-practice route containing only selected mistake IDs;
- favorite search, book filter, toggle, and a dedicated-practice route containing only selected favorite IDs;
- mastered exclusion/restoration with confirmation and intact review history.

Statistics fixtures must assert exact values for today new, today review, today accuracy, Again/Hard/Good/Easy distribution, streak, 7-day totals, 30-day totals, both book-progress ratios, most-missed words, and future due buckets. Also assert the zero-denominator accuracy state does not render `NaN`.

Settings tests must save and reload every required field:

```ts
const requiredSettings = {
  currentBookId: 'ielts-toefl-basic',
  dailyNewLimit: 15,
  dailyReviewLimit: 80,
  defaultMode: 'zh-to-en',
  autoPlayPronunciation: true,
  voiceLocale: 'en-GB',
  showPhonetic: false,
  reviewFirst: true,
  theme: 'dark',
  schemaVersion: 2,
  lastExportedAt: 1784995200000,
  installPromptDismissed: true,
} as const
```

Assert explicit daily-plan reset, install/privacy/version sections, and that export updates `lastExportedAt`.

Add a transaction-clear test:

```ts
it('requires confirmation and clears only user-owned data atomically', async () => {
  const beforeWords = await db.words.count()
  await expect(clearStudyData(db, { confirmed: false })).rejects.toThrow()

  await clearStudyData(db, { confirmed: true })

  expect(await db.words.count()).toBe(beforeWords)
  expect(await db.books.count()).toBeGreaterThan(0)
  for (const table of [
    db.cards,
    db.reviewLogs,
    db.dailyPlans,
    db.dailyProgress,
    db.favorites,
    db.mistakes,
    db.studySessions,
  ]) {
    expect(await table.count()).toBe(0)
  }
})
```

The component test must prove that the first click opens an impact summary and only the second confirmation executes the clear.

- [ ] **Step 2: Verify RED**

Run `pnpm test -- tests/unit/statistics.test.ts tests/unit/settings-clear.test.ts tests/components/collections.test.tsx tests/components/settings.test.tsx`; expect missing modules.

- [ ] **Step 3: Implement services and pages**

Keep collections as keyed tables. Removing a mistake deletes only the mistake aggregate, never its card or review history. Mistake/favorite dedicated practice reuses the study state machine with an explicit ordered word-ID source and keeps one FSRS card per word. Display the current card state beside each mistake.

Calculate all required statistics from logs/cards rather than mutable presentation counters. Use CSS bars with accessible labels instead of a chart dependency. The future-due trend groups non-mastered cards into deterministic local-date buckets.

Render controls for all 12 SettingsRecord fields, an explicit current-plan reset, install/privacy/version sections, and a destructive clear dialog. `clearStudyData()` clears user-owned tables in one Dexie transaction, preserves books/words, rolls back on failure, and re-queries counts before reporting success.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
pnpm test -- tests/unit/statistics.test.ts tests/unit/settings-clear.test.ts tests/components/collections.test.tsx tests/components/settings.test.tsx
git add src/features/collections src/domain/statistics src/domain/settings src/features/statistics src/features/settings tests
git commit -m "feat: add collections statistics and settings"
```

### Task 9: Versioned backup, validation, and rollback

**Files:**

- Create: `src/domain/backup/schema.ts`
- Create: `src/domain/backup/service.ts`
- Create: `src/features/settings/BackupPanel.tsx`
- Create: `tests/unit/backup.test.ts`
- Create: `tests/components/backup-panel.test.tsx`

- [ ] **Step 1: Write failing export/import tests**

```ts
it('exports versioned user data without bundled vocabulary', async () => {
  const backup = await exportBackup(db, now)
  expect(backup).toMatchObject({ schemaVersion: 1, appVersion: expect.any(String) })
  expect(backup).not.toHaveProperty('words')
})

it('rolls back every table when import fails mid-transaction', async () => {
  const before = await exportBackup(db, now)
  await expect(importBackup(db, validBackup, failingHook)).rejects.toThrow()
  expect(await exportBackup(db, now)).toEqual(before)
})
```

- [ ] **Step 2: Verify RED**

Run backup tests; expect missing service.

- [ ] **Step 3: Implement strict Zod schema and transaction**

Validate record limits, IDs, ratings, finite epoch milliseconds, and supported versions. Generate a backup blob before import, show a summary, require confirmation, and replace all user-owned tables in one Dexie transaction.

- [ ] **Step 4: Verify GREEN and commit**

```powershell
pnpm test -- tests/unit/backup.test.ts tests/components/backup-panel.test.tsx
git add src/domain/backup src/features/settings/BackupPanel.tsx tests
git commit -m "feat: add validated backup and restore"
```

### Task 10: PWA, offline assets, iPhone layout, and original icons

**Files:**

- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `src/app/PwaUpdatePrompt.tsx`
- Create: `src/app/NetworkStatus.tsx`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/apple-touch-icon.png`
- Create: `public/favicon-32.png`
- Create: `public/_redirects`
- Create: `tests/components/pwa-status.test.tsx`

- [ ] **Step 1: Write failing PWA component tests**

Assert offline status, closable iPhone install guidance, waiting-update prompt, and no forced reload during a study session.

- [ ] **Step 2: Verify RED**

Run `pnpm test -- tests/components/pwa-status.test.tsx`; expect missing components.

- [ ] **Step 3: Generate and inspect one original icon**

Generate a text-free vocabulary mark, inspect it, then resize/crop with opaque Apple and padded maskable variants. Do not copy commercial app marks.

- [ ] **Step 4: Configure Workbox**

Use `registerType: 'prompt'`, precache `js,css,html,ico,png,woff2,json`, `navigateFallback: '/index.html'`, and no runtime caching for external APIs. Add `viewport-fit=cover`, standalone metadata, portrait orientation, theme colors, and `/* /index.html 200`.

- [ ] **Step 5: Verify build artifacts**

Run:

```powershell
pnpm build
```

Assert `dist/manifest.webmanifest`, `dist/sw.js`, Workbox chunk, icons, `_redirects`, and emitted JSON vocabulary assets exist; assert no `.pdf` exists in `dist`.

- [ ] **Step 6: Commit**

```powershell
git add vite.config.ts index.html src/app public tests/components
git commit -m "feat: add offline PWA and iPhone support"
```

### Task 11: Full unit, component, and E2E coverage

**Files:**

- Create: `e2e/onboarding.spec.ts`
- Create: `e2e/persistence-next-day.spec.ts`
- Create: `e2e/persistence-reopen.spec.ts`
- Create: `e2e/study-modes.spec.ts`
- Create: `e2e/backup-collections.spec.ts`
- Create: `e2e/pwa-mobile-offline.spec.ts`
- Create: `e2e/webkit-mobile.spec.ts`
- Create: `e2e/fixtures/time.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write E2E tests before final fixes**

Tests cover onboarding, new learning, refresh persistence, time jump to next day, forced review, four ratings, spelling mistake, mistake/favorite dedicated practice, mastered restore, export/import, 390x844 viewport, safe-area action visibility, installed service worker, offline reload, and no console errors.

Configure two projects:

```ts
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'webkit-iphone',
    testMatch: /(onboarding|study-modes|backup-collections|webkit-mobile)\.spec\.ts/,
    use: { ...devices['iPhone 13'] },
  },
]
```

Chromium runs the full suite, including Service Worker/offline and the persistent-profile test. WebKit runs core onboarding, study, collections and mobile-layout flows. `webkit-mobile.spec.ts` asserts `viewport-fit=cover`, computed safe-area padding declarations, 44px controls, and visible fixed actions, but its result must be described as a WebKit approximation rather than a physical-iPhone installation result.

Use a persistent browser profile to prove close/reopen persistence rather than only refreshing:

```ts
test('keeps IndexedDB progress after closing and reopening the browser', async ({}, testInfo) => {
  const userDataDir = testInfo.outputPath('persistent-profile')
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
  const first = await chromium.launchPersistentContext(userDataDir, { baseURL })
  const firstPage = await first.newPage()
  await firstPage.goto('/')
  await firstPage.getByLabel('选择词书').selectOption('ielts-toefl-basic')
  await firstPage.getByLabel('每日新词').fill('1')
  await firstPage.getByRole('button', { name: '开始学习' }).click()
  await firstPage.getByRole('button', { name: '开始新词' }).click()
  await firstPage.getByRole('button', { name: '显示答案' }).click()
  await firstPage.getByRole('button', { name: '认识' }).click()
  await expect(firstPage.getByText('新词已完成 1')).toBeVisible()
  await first.close()

  const second = await chromium.launchPersistentContext(userDataDir, { baseURL })
  const secondPage = await second.newPage()
  await secondPage.goto('/')
  await expect(secondPage.getByText('新词已完成 1')).toBeVisible()
  await second.close()
})
```

- [ ] **Step 2: Run and observe RED**

```powershell
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

Expected: any missing behavior fails with a specific assertion rather than a skipped test.

- [ ] **Step 3: Fix one failure at a time with regression tests**

For each failure: identify root cause, add or tighten the smallest unit/component reproduction, verify it fails, apply one fix, rerun the focused test, then rerun the affected E2E file.

- [ ] **Step 4: Run the full local quality gate**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Expected: every command exits 0 with zero skipped core cases. Record Chromium and WebKit project totals separately. Automated results may establish resource/installability and layout evidence, but they must not be recorded as proof of a real iPhone Safari “添加到主屏幕”, standalone launch, notch, or Home Indicator test.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "test: complete quality and e2e coverage"
```

### Task 12: Documentation and privacy audit

**Files:**

- Create: `README.md`
- Create: `CHANGELOG.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `docs/architecture.md`
- Create: `docs/data-model.md`
- Create: `docs/fsrs-design.md`
- Create: `docs/pdf-extraction.md`
- Create: `docs/ios-pwa-guide.md`
- Create: `docs/deployment.md`
- Create: `docs/testing.md`
- Create: `docs/privacy.md`

- [ ] **Step 1: Write every required document from verified behavior**

README includes features, stack, local run, tests, build, deployment, iPhone install, offline behavior, backup/restore, privacy, tree, and known limits. The onboarding/privacy documentation preserves the exact visible notice “词书仅供个人学习使用” and the recurring export reminder. `docs/ios-pwa-guide.md` separates:

- automated manifest/HTTPS/Service Worker/Chromium offline checks;
- Playwright WebKit iPhone-profile checks;
- a manual Safari checklist on a physical iPhone for sharing → adding to Home Screen, standalone launch, offline reopen, notch, and Home Indicator.

Notices list actual installed direct dependencies and the clean-room reference policy.

- [ ] **Step 2: Run privacy and artifact checks**

```powershell
rg -n -i "password|token|secret|api[_-]?key" . -g "!pnpm-lock.yaml" -g "!node_modules/**" -g "!dist/**"
Get-ChildItem -Recurse -File dist | Where-Object Extension -eq '.pdf'
git status --short
```

Expected: no credential values, no PDF in dist, and only intentional project files.

- [ ] **Step 3: Commit**

```powershell
git add README.md CHANGELOG.md THIRD_PARTY_NOTICES.md docs
git commit -m "docs: add project operations and privacy guides"
```

### Task 13: Cloudflare Pages deployment and online acceptance

**Files:**

- Create: `docs/deployment-result.md`
- Create: `reports/final-verification.md`

- [ ] **Step 1: Re-run the complete quality gate immediately before deployment**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Do not deploy if any command is non-zero.

- [ ] **Step 2: Authenticate only if required**

Run:

```powershell
pnpm exec wrangler whoami
```

If unauthenticated, run `pnpm exec wrangler login`, pause only for the browser authorization click, then continue from this step.

- [ ] **Step 3: Create/deploy the Pages project**

List projects as JSON, create the target only when absent, and treat an existing project as the successful idempotent path:

```powershell
$pagesProjectName = 'ielts-vocabulary-pwa'
$existingProjectsJson = pnpm exec wrangler pages project list --json | Out-String
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to list Cloudflare Pages projects.'
}
$existingProjects = $existingProjectsJson | ConvertFrom-Json
$projectExists = @($existingProjects | Where-Object {
  $_.name -eq $pagesProjectName -or $_.project_name -eq $pagesProjectName
}).Count -gt 0
if (-not $projectExists) {
  pnpm exec wrangler pages project create $pagesProjectName --production-branch main
  if ($LASTEXITCODE -ne 0) {
    throw 'Unable to create Cloudflare Pages project.'
  }
}
pnpm exec wrangler pages deploy dist --project-name ielts-vocabulary-pwa --branch main
```

Capture the list/create result, actual production `.pages.dev` URL, and deployment ID from Wrangler output. Do not depend on an interactive create prompt from `pages deploy`.

- [ ] **Step 4: Run online and offline smoke tests**

Run Playwright against the deployed URL and verify:

- HTTPS 200 and SPA route reload
- manifest 200 and install fields/icons
- Service Worker registered and controlling after reload
- onboarding/home/study core flow
- 390x844 action visibility
- browser offline reload after first online load
- no `.pdf` asset and no credential leakage

Run the hosted core flow with both the Chromium and `webkit-iphone` Playwright projects. Record these as automated checks only. The physical-iPhone checklist remains a separate manual evidence field; absent a real-device result, record `未人工确认` rather than `通过`.

- [ ] **Step 5: Record result and final verification**

`docs/deployment-result.md` records deployment date, project, URL, command, access level, Chromium PWA/offline results, WebKit-profile results, a distinct physical-iPhone manual-check field, and the update command. `reports/final-verification.md` records fresh command outputs and the requirement checklist. Never infer a physical-iPhone result from manifest fields, Chromium, WebKit, screenshots, or viewport dimensions.

- [ ] **Step 6: Commit and complete**

```powershell
git add docs/deployment-result.md reports/final-verification.md
git commit -m "docs: record Cloudflare Pages deployment"
git status --short
```

Expected: clean working tree and a verified production URL.

- [ ] **Step 7: Deliver the required final response**

The final Chinese response must contain every section below with concrete values:

```markdown
# IELTS-Word 项目交付完成

## 正式项目路径
## 线上网址
## 参考项目分析
## 词库提取结果
## 已实现功能
## 测试结果
- lint：
- typecheck：
- unit：
- component：
- e2e Chromium：
- e2e WebKit：
- build：

## iPhone 安装步骤
## 实体 iPhone 人工确认状态
## 数据保存和备份
## 部署与更新
## 隐私与访问权限
## 已知限制
```

Include both book counts and anomaly/fix counts, the actual Pages URL, fresh command results, exact Add-to-Home-Screen steps, backup/import instructions, the repeat-deploy command, access level, and the personal-learning notice. If no physical-iPhone result was supplied, write `未人工确认`; do not describe it as passed.
