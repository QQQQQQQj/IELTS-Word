import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IELTSWordDatabase } from '../../src/db/database'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import {
  getOrCreateDailyPlan,
  resetDailyPlan,
} from '../../src/domain/daily/newPlan'
import type { WordRecord } from '../../src/db/types'

const BOOK_ID = 'ielts-toefl-basic'
const dateKey = '2026-07-26'
const now = new Date(2026, 6, 26, 9, 0).getTime()

function word(order: number): WordRecord {
  return {
    id: `word-${String(order).padStart(4, '0')}`,
    bookId: BOOK_ID,
    sourceOrder: order,
    sourceGroup: 'Day 1',
    word: `word${order}`,
    normalizedWord: `word${order}`,
    meanings: [`释义${order}`],
  }
}

let db: IELTSWordDatabase

beforeEach(async () => {
  db = new IELTSWordDatabase(
    `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  await db.open()
  await db.words.bulkPut([1, 2, 3, 4, 5, 6].map(word))
  // word-0001 and word-0003 were already introduced on an earlier day.
  for (const introduced of ['word-0001', 'word-0003']) {
    const base = createEmptyCardRecord(introduced, BOOK_ID, now - 86_400_000)
    await db.cards.put({
      ...base,
      reps: 1,
      state: 1,
      introducedOn: '2026-07-25',
    })
  }
})

afterEach(async () => {
  await db.delete()
})

describe('getOrCreateDailyPlan', () => {
  it('selects only never-introduced words in source order', async () => {
    const plan = await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 3)
    expect(plan.wordIds).toEqual(['word-0002', 'word-0004', 'word-0005'])
    expect(plan.id).toBe(`${BOOK_ID}:${dateKey}`)
  })

  it('returns the same plan after refresh even when the limit changes', async () => {
    const first = await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 2)
    const second = await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 5)
    expect(second.wordIds).toEqual(first.wordIds)
    expect(second.createdAt).toBe(first.createdAt)
  })

  it('caps the plan at the remaining unintroduced words', async () => {
    const plan = await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 99)
    expect(plan.wordIds).toEqual([
      'word-0002',
      'word-0004',
      'word-0005',
      'word-0006',
    ])
  })
})

describe('resetDailyPlan', () => {
  it('rebuilds today with the new limit but keeps learned words out', async () => {
    await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 4)
    // word-0002 gets learned today.
    const base = createEmptyCardRecord('word-0002', BOOK_ID, now)
    await db.cards.put({ ...base, reps: 1, state: 1, introducedOn: dateKey })

    const reset = await resetDailyPlan(db, BOOK_ID, dateKey, 2)
    expect(reset.wordIds).toEqual(['word-0004', 'word-0005'])

    const reloaded = await getOrCreateDailyPlan(db, BOOK_ID, dateKey, 10)
    expect(reloaded.wordIds).toEqual(reset.wordIds)
  })
})
