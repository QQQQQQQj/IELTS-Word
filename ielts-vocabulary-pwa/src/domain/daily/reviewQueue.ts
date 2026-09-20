import { State } from 'ts-fsrs'
import type { CardRecord } from '../../db/types'
import { startOfLocalDay } from './dateKey'

export interface ReviewQueueOptions {
  now: number
  /** Local date key of `now`, e.g. `2026-07-27`. */
  today: string
  dailyReviewLimit: number
}

export interface ReviewQueueResult {
  due: CardRecord[]
  totalDue: number
  overdueCount: number
  forcedNextDayCount: number
  relearningCount: number
}

function isForcedNextDay(card: CardRecord, today: string): boolean {
  return (
    card.introducedOn !== undefined &&
    card.introducedOn < today &&
    card.firstNextDayReviewAt === undefined
  )
}

/**
 * Builds today's review queue from raw cards.
 *
 * Priority: due relearning cards, then mandatory next-day cards, then the
 * remaining due cards ordered most-overdue-first. `dailyReviewLimit` caps
 * only the normal group; relearning and forced next-day cards always
 * bypass the limit and may exceed it.
 */
export function buildReviewQueue(
  cards: CardRecord[],
  options: ReviewQueueOptions,
): ReviewQueueResult {
  const { now, today, dailyReviewLimit } = options
  const todayStart = startOfLocalDay(now)

  const relearning: CardRecord[] = []
  const forced: CardRecord[] = []
  const normal: CardRecord[] = []

  for (const card of cards) {
    if (card.mastered || card.suspended) {
      continue
    }
    if (card.state === State.Relearning && card.dueAt <= now) {
      relearning.push(card)
    } else if (isForcedNextDay(card, today)) {
      forced.push(card)
    } else if (card.dueAt <= now) {
      normal.push(card)
    }
  }

  const byDueThenId = (a: CardRecord, b: CardRecord): number =>
    a.dueAt - b.dueAt || a.id.localeCompare(b.id)
  relearning.sort(byDueThenId)
  forced.sort(byDueThenId)
  normal.sort(byDueThenId)

  const limitedNormal =
    dailyReviewLimit >= 0 ? normal.slice(0, dailyReviewLimit) : normal
  const due = [...relearning, ...forced, ...limitedNormal]

  const overdueCount = due.filter((card) => card.dueAt < todayStart).length

  return {
    due,
    totalDue: relearning.length + forced.length + normal.length,
    overdueCount,
    forcedNextDayCount: forced.length,
    relearningCount: relearning.length,
  }
}
