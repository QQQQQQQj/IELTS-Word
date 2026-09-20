import { dateKeyOf, startOfLocalDay } from '../daily/dateKey'
import type {
  BookRecord,
  CardRecord,
  MistakeRecord,
  RatingValue,
  ReviewLogRecord,
} from '../../db/types'

const DAY_MS = 24 * 60 * 60 * 1000

export interface StatisticsInput {
  now: number
  logs: ReviewLogRecord[]
  cards: CardRecord[]
  mistakes: MistakeRecord[]
  books: BookRecord[]
}

export interface BookProgress {
  bookId: string
  name: string
  introducedCount: number
  totalWords: number
  /** 0..1; null when the book has no words. */
  ratio: number | null
}

export interface FutureDueBucket {
  dateKey: string
  count: number
}

export interface StatisticsResult {
  todayNewCount: number
  todayReviewCount: number
  /** null instead of NaN when nothing was studied today. */
  todayAccuracy: number | null
  ratingDistribution: Record<RatingValue, number>
  streakDays: number
  last7DayCounts: number[]
  last7DayTotal: number
  last30DayCounts: number[]
  last30DayTotal: number
  bookProgress: BookProgress[]
  mostMissed: MistakeRecord[]
  futureDueBuckets: FutureDueBucket[]
}

function isCorrect(log: ReviewLogRecord): boolean {
  return log.answerCorrect ?? log.rating >= 3
}

/** Pure metric calculation from immutable logs, cards and aggregates. */
export function calculateStatistics(input: StatisticsInput): StatisticsResult {
  const { now, logs, cards, mistakes, books } = input
  const today = dateKeyOf(now)
  const todayStart = startOfLocalDay(now)

  const todayLogs = logs.filter((log) => log.studyDate === today)
  const todayNewCount = todayLogs.filter((log) => log.isNewIntroduction).length
  const todayReviewCount = todayLogs.length - todayNewCount
  const todayAccuracy =
    todayLogs.length === 0
      ? null
      : todayLogs.filter(isCorrect).length / todayLogs.length

  const ratingDistribution: Record<RatingValue, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  }
  for (const log of logs) {
    ratingDistribution[log.rating] += 1
  }

  const activeDates = new Set(logs.map((log) => log.studyDate))
  let streakDays = 0
  let cursor = activeDates.has(today) ? todayStart : todayStart - DAY_MS
  while (activeDates.has(dateKeyOf(cursor))) {
    streakDays += 1
    cursor -= DAY_MS
  }

  const countsByDate = new Map<string, number>()
  for (const log of logs) {
    countsByDate.set(log.studyDate, (countsByDate.get(log.studyDate) ?? 0) + 1)
  }
  const windowCounts = (days: number): number[] => {
    const counts: number[] = []
    for (let offset = days - 1; offset >= 0; offset -= 1) {
      counts.push(countsByDate.get(dateKeyOf(todayStart - offset * DAY_MS)) ?? 0)
    }
    return counts
  }
  const last7DayCounts = windowCounts(7)
  const last30DayCounts = windowCounts(30)

  const bookProgress: BookProgress[] = books.map((book) => {
    const introducedCount = cards.filter(
      (card) => card.bookId === book.id && card.introducedOn !== undefined,
    ).length
    return {
      bookId: book.id,
      name: book.name,
      introducedCount,
      totalWords: book.totalWords,
      ratio: book.totalWords > 0 ? introducedCount / book.totalWords : null,
    }
  })

  const mostMissed = [...mistakes]
    .sort(
      (first, second) =>
        second.errorCount - first.errorCount ||
        second.lastErrorAt - first.lastErrorAt,
    )
    .slice(0, 10)

  const futureDueBuckets: FutureDueBucket[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    futureDueBuckets.push({
      dateKey: dateKeyOf(todayStart + offset * DAY_MS),
      count: 0,
    })
  }
  for (const card of cards) {
    if (card.mastered || card.suspended || card.introducedOn === undefined) {
      continue
    }
    const offset = Math.floor((card.dueAt - todayStart) / DAY_MS)
    const bucketIndex = Math.min(Math.max(offset, 0), 6)
    // Cards due beyond the 7-day window are not part of this trend.
    if (offset > 6) {
      continue
    }
    const bucket = futureDueBuckets[bucketIndex]
    if (bucket) {
      bucket.count += 1
    }
  }

  return {
    todayNewCount,
    todayReviewCount,
    todayAccuracy,
    ratingDistribution,
    streakDays,
    last7DayCounts,
    last7DayTotal: last7DayCounts.reduce((sum, count) => sum + count, 0),
    last30DayCounts,
    last30DayTotal: last30DayCounts.reduce((sum, count) => sum + count, 0),
    bookProgress,
    mostMissed,
    futureDueBuckets,
  }
}
