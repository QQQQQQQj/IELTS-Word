import type { IELTSWordDatabase } from '../../db/database'

export interface ClearResultCounts {
  cards: number
  reviewLogs: number
  dailyPlans: number
  dailyProgress: number
  favorites: number
  mistakes: number
  studySessions: number
}

/**
 * Transactionally clears every user-owned table after an explicit
 * confirmation. Built-in books/words, preference settings and appMeta are
 * preserved. A failure inside the transaction rolls everything back; the
 * returned counts are re-queried after the transaction commits.
 */
export async function clearStudyData(
  db: IELTSWordDatabase,
  options: { confirmed: boolean },
): Promise<ClearResultCounts> {
  if (!options.confirmed) {
    throw new Error('清空学习记录需要二次确认')
  }
  await db.transaction(
    'rw',
    [
      db.cards,
      db.reviewLogs,
      db.dailyPlans,
      db.dailyProgress,
      db.favorites,
      db.mistakes,
      db.studySessions,
    ],
    async () => {
      await db.cards.clear()
      await db.reviewLogs.clear()
      await db.dailyPlans.clear()
      await db.dailyProgress.clear()
      await db.favorites.clear()
      await db.mistakes.clear()
      await db.studySessions.clear()
    },
  )
  return {
    cards: await db.cards.count(),
    reviewLogs: await db.reviewLogs.count(),
    dailyPlans: await db.dailyPlans.count(),
    dailyProgress: await db.dailyProgress.count(),
    favorites: await db.favorites.count(),
    mistakes: await db.mistakes.count(),
    studySessions: await db.studySessions.count(),
  }
}

/** Impact summary shown in the confirmation dialog before clearing. */
export async function studyDataImpact(
  db: IELTSWordDatabase,
): Promise<ClearResultCounts> {
  return {
    cards: await db.cards.count(),
    reviewLogs: await db.reviewLogs.count(),
    dailyPlans: await db.dailyPlans.count(),
    dailyProgress: await db.dailyProgress.count(),
    favorites: await db.favorites.count(),
    mistakes: await db.mistakes.count(),
    studySessions: await db.studySessions.count(),
  }
}
