import { describe, expect, it } from 'vitest'
import { calculateStatistics } from '../../src/domain/statistics/calculate'
import type {
  BookRecord,
  CardRecord,
  MistakeRecord,
  ReviewLogRecord,
} from '../../src/db/types'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'

const DAY_MS = 24 * 60 * 60 * 1000
const now = new Date(2026, 6, 27, 20, 0).getTime()

function log(overrides: Partial<ReviewLogRecord> & { id: string }): ReviewLogRecord {
  return {
    cardId: overrides.id,
    wordId: overrides.id,
    bookId: 'ielts-toefl-basic',
    mode: 'recognition',
    rating: 3,
    reviewedAt: now,
    studyDate: '2026-07-27',
    nextDueAt: now + DAY_MS,
    elapsedDays: 0,
    scheduledDays: 1,
    stateBefore: 0,
    stateAfter: 1,
    stability: 3,
    difficulty: 5,
    timezoneOffsetMinutes: -480,
    isNewIntroduction: false,
    ...overrides,
  }
}

function card(id: string, overrides: Partial<CardRecord>): CardRecord {
  return {
    ...createEmptyCardRecord(id, 'ielts-toefl-basic', now - 3 * DAY_MS),
    ...overrides,
  }
}

const books: BookRecord[] = [
  {
    id: 'ielts-toefl-basic',
    name: '雅思·托福基础词汇',
    description: '',
    totalWords: 4,
    enabled: true,
    version: 1,
    createdAt: now,
  },
  {
    id: 'ielts-listening-spelling',
    name: '雅思听力拼写词汇',
    description: '',
    totalWords: 2,
    enabled: true,
    version: 1,
    createdAt: now,
  },
]

const logs: ReviewLogRecord[] = [
  // Today: two new introductions and three reviews.
  log({ id: 'w1', isNewIntroduction: true, rating: 3 }),
  log({ id: 'w2', isNewIntroduction: true, rating: 1 }),
  log({ id: 'w3', rating: 3, answerCorrect: true }),
  log({ id: 'w4', rating: 2, answerCorrect: false }),
  log({ id: 'w5', rating: 4 }),
  // Yesterday keeps the streak alive.
  log({ id: 'w6', studyDate: '2026-07-26', reviewedAt: now - DAY_MS }),
  // A gap two weeks ago must not count toward the streak.
  log({ id: 'w7', studyDate: '2026-07-13', reviewedAt: now - 14 * DAY_MS }),
]

const cards: CardRecord[] = [
  card('w1', { introducedOn: '2026-07-27', reps: 1, dueAt: now + DAY_MS }),
  card('w2', { introducedOn: '2026-07-27', reps: 1, dueAt: now + 2 * DAY_MS }),
  card('w3', { introducedOn: '2026-07-26', reps: 2, dueAt: now + 3 * DAY_MS }),
  card('mastered', {
    introducedOn: '2026-07-20',
    reps: 5,
    mastered: true,
    dueAt: now + DAY_MS,
  }),
  {
    ...card('listening-1', { introducedOn: '2026-07-25', reps: 2 }),
    bookId: 'ielts-listening-spelling',
    dueAt: now - 1000,
  },
]

const mistakes: MistakeRecord[] = [
  {
    id: 'w4',
    wordId: 'w4',
    bookId: 'ielts-toefl-basic',
    errorCount: 5,
    lastErrorAt: now,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'w2',
    wordId: 'w2',
    bookId: 'ielts-toefl-basic',
    errorCount: 2,
    lastErrorAt: now,
    createdAt: now,
    updatedAt: now,
  },
]

describe('calculateStatistics', () => {
  const result = calculateStatistics({ now, logs, cards, mistakes, books })

  it('computes today new, review and accuracy', () => {
    expect(result.todayNewCount).toBe(2)
    expect(result.todayReviewCount).toBe(3)
    // Correctness: w1 ✓(rating 3) w2 ✗(rating 1) w3 ✓(true) w4 ✗(false) w5 ✓(rating 4)
    expect(result.todayAccuracy).toBeCloseTo(3 / 5)
  })

  it('computes the four-rating distribution', () => {
    expect(result.ratingDistribution).toEqual({ 1: 1, 2: 1, 3: 4, 4: 1 })
  })

  it('computes streak and 7/30-day totals', () => {
    expect(result.streakDays).toBe(2)
    expect(result.last7DayTotal).toBe(6)
    expect(result.last30DayTotal).toBe(7)
    expect(result.last7DayCounts).toHaveLength(7)
    expect(result.last7DayCounts[6]).toBe(5)
    expect(result.last7DayCounts[5]).toBe(1)
  })

  it('computes per-book progress ratios', () => {
    const basic = result.bookProgress.find(
      (entry) => entry.bookId === 'ielts-toefl-basic',
    )
    const listening = result.bookProgress.find(
      (entry) => entry.bookId === 'ielts-listening-spelling',
    )
    expect(basic).toMatchObject({ introducedCount: 4, totalWords: 4 })
    expect(listening).toMatchObject({ introducedCount: 1, totalWords: 2 })
    expect(listening?.ratio).toBeCloseTo(0.5)
  })

  it('lists most-missed words in descending error order', () => {
    expect(result.mostMissed.map((entry) => entry.wordId)).toEqual(['w4', 'w2'])
  })

  it('buckets future due cards by local date excluding mastered', () => {
    expect(result.futureDueBuckets).toHaveLength(7)
    const total = result.futureDueBuckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    )
    // w1 (+1d), w2 (+2d), w3 (+3d), overdue listening-1 counted today;
    // the mastered card is excluded.
    expect(total).toBe(4)
    expect(result.futureDueBuckets[0]?.count).toBe(1)
  })

  it('returns null accuracy instead of NaN for an empty day', () => {
    const empty = calculateStatistics({
      now,
      logs: [],
      cards: [],
      mistakes: [],
      books,
    })
    expect(empty.todayAccuracy).toBeNull()
    expect(empty.streakDays).toBe(0)
  })
})
