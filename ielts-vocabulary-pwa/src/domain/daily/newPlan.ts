import type { IELTSWordDatabase } from '../../db/database'
import type { DailyPlanRecord } from '../../db/types'

function planId(bookId: string, dateKey: string): string {
  return `${bookId}:${dateKey}`
}

/**
 * Picks the first `limit` never-introduced words of the book in source
 * order. A word counts as introduced once its card carries `introducedOn`.
 */
async function selectNewWordIds(
  db: IELTSWordDatabase,
  bookId: string,
  limit: number,
): Promise<string[]> {
  const words = await db.words
    .where('[bookId+sourceOrder]')
    .between([bookId, -Infinity], [bookId, Infinity])
    .toArray()
  const cards = await db.cards.where('bookId').equals(bookId).toArray()
  const introduced = new Set(
    cards
      .filter((card) => card.introducedOn !== undefined)
      .map((card) => card.wordId),
  )
  return words
    .filter((word) => !introduced.has(word.id))
    .slice(0, Math.max(0, limit))
    .map((word) => word.id)
}

/**
 * Returns today's fixed plan. The plan is created once per book and local
 * date and is immutable afterwards: refreshing the page or changing the
 * daily limit does not alter it. Use `resetDailyPlan` for an explicit reset.
 */
export async function getOrCreateDailyPlan(
  db: IELTSWordDatabase,
  bookId: string,
  dateKey: string,
  limit: number,
): Promise<DailyPlanRecord> {
  return db.transaction('rw', [db.dailyPlans, db.words, db.cards], async () => {
    const existing = await db.dailyPlans.get(planId(bookId, dateKey))
    if (existing) {
      return existing
    }
    const wordIds = await selectNewWordIds(db, bookId, limit)
    const plan: DailyPlanRecord = {
      id: planId(bookId, dateKey),
      bookId,
      dateKey,
      wordIds,
      createdAt: Date.now(),
    }
    await db.dailyPlans.put(plan)
    return plan
  })
}

/**
 * Explicit same-day reset requested from the settings page. Words already
 * introduced (including earlier today) never re-enter the plan.
 */
export async function resetDailyPlan(
  db: IELTSWordDatabase,
  bookId: string,
  dateKey: string,
  limit: number,
): Promise<DailyPlanRecord> {
  return db.transaction('rw', [db.dailyPlans, db.words, db.cards], async () => {
    const wordIds = await selectNewWordIds(db, bookId, limit)
    const plan: DailyPlanRecord = {
      id: planId(bookId, dateKey),
      bookId,
      dateKey,
      wordIds,
      createdAt: Date.now(),
    }
    await db.dailyPlans.put(plan)
    return plan
  })
}

/** Word IDs from today's plan that still have no introduced card. */
export async function remainingPlanWordIds(
  db: IELTSWordDatabase,
  plan: DailyPlanRecord,
): Promise<string[]> {
  const cards = await db.cards.bulkGet(plan.wordIds)
  return plan.wordIds.filter((_wordId, index) => {
    const card = cards[index]
    return card === undefined || card.introducedOn === undefined
  })
}
