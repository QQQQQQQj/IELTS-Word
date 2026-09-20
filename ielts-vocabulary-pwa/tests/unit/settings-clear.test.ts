import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IELTSWordDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'
import { clearStudyData } from '../../src/domain/settings/clearStudyData'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'

let db: IELTSWordDatabase

beforeEach(async () => {
  db = new IELTSWordDatabase(
    `clear-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  await db.open()
  await db.books.put({
    id: 'ielts-toefl-basic',
    name: '雅思·托福基础词汇',
    description: '',
    totalWords: 1,
    enabled: true,
    version: 1,
    createdAt: 1,
  })
  await db.words.put({
    id: 'w1',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    meanings: ['精确的'],
  })
  await db.settings.put({ ...DEFAULT_SETTINGS, dailyNewLimit: 33 })
  await db.cards.put(createEmptyCardRecord('w1', 'ielts-toefl-basic', 1))
  await db.reviewLogs.put({
    id: 'log-1',
    cardId: 'w1',
    wordId: 'w1',
    bookId: 'ielts-toefl-basic',
    mode: 'recognition',
    rating: 3,
    reviewedAt: 1,
    studyDate: '2026-07-27',
    nextDueAt: 2,
    elapsedDays: 0,
    scheduledDays: 1,
    stateBefore: 0,
    stateAfter: 1,
    stability: 1,
    difficulty: 5,
    timezoneOffsetMinutes: -480,
    isNewIntroduction: true,
  })
  await db.dailyPlans.put({
    id: 'ielts-toefl-basic:2026-07-27',
    bookId: 'ielts-toefl-basic',
    dateKey: '2026-07-27',
    wordIds: ['w1'],
    createdAt: 1,
  })
  await db.dailyProgress.put({
    id: 'ielts-toefl-basic:2026-07-27',
    bookId: 'ielts-toefl-basic',
    dateKey: '2026-07-27',
    newCompletedIds: ['w1'],
    reviewCompletedCount: 0,
    updatedAt: 1,
  })
  await db.favorites.put({
    id: 'w1',
    wordId: 'w1',
    bookId: 'ielts-toefl-basic',
    createdAt: 1,
  })
  await db.mistakes.put({
    id: 'w1',
    wordId: 'w1',
    bookId: 'ielts-toefl-basic',
    errorCount: 1,
    lastErrorAt: 1,
    createdAt: 1,
    updatedAt: 1,
  })
  await db.studySessions.put({
    id: 's1',
    type: 'new',
    mode: 'recognition',
    bookId: 'ielts-toefl-basic',
    dateKey: '2026-07-27',
    startedAt: 1,
    plannedCount: 1,
    completedCount: 1,
  })
})

afterEach(async () => {
  await db.delete()
})

describe('clearStudyData', () => {
  it('requires confirmation and clears only user-owned data atomically', async () => {
    const beforeWords = await db.words.count()
    await expect(clearStudyData(db, { confirmed: false })).rejects.toThrow()
    // Nothing changed after the rejected attempt.
    expect(await db.cards.count()).toBe(1)

    const counts = await clearStudyData(db, { confirmed: true })

    expect(await db.words.count()).toBe(beforeWords)
    expect(await db.books.count()).toBeGreaterThan(0)
    expect((await db.settings.get('default'))?.dailyNewLimit).toBe(33)
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
    expect(counts).toMatchObject({
      cards: 0,
      reviewLogs: 0,
      dailyPlans: 0,
      dailyProgress: 0,
      favorites: 0,
      mistakes: 0,
      studySessions: 0,
    })
  })
})
