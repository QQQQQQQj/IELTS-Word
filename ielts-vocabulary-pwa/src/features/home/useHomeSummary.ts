import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '../../db/database'
import { dateKeyOf, startOfLocalDay } from '../../domain/daily/dateKey'
import { getOrCreateDailyPlan } from '../../domain/daily/newPlan'
import { buildReviewQueue } from '../../domain/daily/reviewQueue'

export interface HomeSummaryData {
  needsOnboarding: boolean
  dueCount: number
  overdueCount: number
  reviewCompletedCount: number
  reviewEstimateMinutes: number
  forcedNextDayCount: number
  newPlannedCount: number
  newCompletedCount: number
  currentBookName: string
  streakDays: number
  todayCompletedCount: number
  todayTotalCount: number
  lastSevenDays: number[]
}

export type HomeSummaryState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: HomeSummaryData }

const SECONDS_PER_CARD = 15

async function computeSummary(now: number): Promise<HomeSummaryData> {
  const db = getDatabase()
  const today = dateKeyOf(now)

  const meta = await db.appMeta.get('app')
  const settings = await db.settings.get('default')
  if (!meta || !settings || !meta.onboardingCompleted) {
    return {
      needsOnboarding: true,
      dueCount: 0,
      overdueCount: 0,
      reviewCompletedCount: 0,
      reviewEstimateMinutes: 0,
      forcedNextDayCount: 0,
      newPlannedCount: 0,
      newCompletedCount: 0,
      currentBookName: '',
      streakDays: 0,
      todayCompletedCount: 0,
      todayTotalCount: 0,
      lastSevenDays: [0, 0, 0, 0, 0, 0, 0],
    }
  }

  const bookId = settings.currentBookId
  const book = await db.books.get(bookId)
  const plan = await getOrCreateDailyPlan(
    db,
    bookId,
    today,
    settings.dailyNewLimit,
  )
  const cards = await db.cards.where('bookId').equals(bookId).toArray()
  const queue = buildReviewQueue(cards, {
    now,
    today,
    dailyReviewLimit: settings.dailyReviewLimit,
  })

  const progress = await db.dailyProgress.get(`${bookId}:${today}`)
  const newCompletedCount = progress?.newCompletedIds.length ?? 0
  const reviewCompletedCount = progress?.reviewCompletedCount ?? 0

  // Streak and 7-day activity come from immutable review logs.
  const logs = await db.reviewLogs.toArray()
  const activeDates = new Set(logs.map((log) => log.studyDate))
  const dayMs = 24 * 60 * 60 * 1000
  const todayStart = startOfLocalDay(now)
  let streakDays = 0
  let cursor = activeDates.has(today) ? todayStart : todayStart - dayMs
  while (activeDates.has(dateKeyOf(cursor))) {
    streakDays += 1
    cursor -= dayMs
  }

  const lastSevenDays: number[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const key = dateKeyOf(todayStart - offset * dayMs)
    lastSevenDays.push(logs.filter((log) => log.studyDate === key).length)
  }

  const remainingNew = Math.max(0, plan.wordIds.length - newCompletedCount)
  const todayTotalCount =
    queue.due.length + reviewCompletedCount + plan.wordIds.length
  const todayCompletedCount = reviewCompletedCount + newCompletedCount

  return {
    needsOnboarding: false,
    dueCount: queue.due.length,
    overdueCount: queue.overdueCount,
    reviewCompletedCount,
    reviewEstimateMinutes: Math.ceil(
      (queue.due.length * SECONDS_PER_CARD) / 60,
    ),
    forcedNextDayCount: queue.forcedNextDayCount,
    newPlannedCount: plan.wordIds.length,
    newCompletedCount: plan.wordIds.length - remainingNew,
    currentBookName: book?.name ?? bookId,
    streakDays,
    todayCompletedCount,
    todayTotalCount,
    lastSevenDays,
  }
}

export function useHomeSummary(): HomeSummaryState & { refresh?: () => void } {
  const [state, setState] = useState<HomeSummaryState>({ status: 'loading' })
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    computeSummary(Date.now())
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'ready', data })
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              cause instanceof Error ? cause.message : '首页数据加载失败',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return { ...state, refresh }
}
