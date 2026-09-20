import { describe, expect, it } from 'vitest'
import { buildReviewQueue } from '../../src/domain/daily/reviewQueue'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import type { CardRecord } from '../../src/db/types'

const BOOK_ID = 'ielts-toefl-basic'
const DAY_MS = 24 * 60 * 60 * 1000
const now = new Date(2026, 6, 27, 9, 0).getTime()
const today = '2026-07-27'

function card(id: string, overrides: Partial<CardRecord>): CardRecord {
  return {
    ...createEmptyCardRecord(id, BOOK_ID, now - 2 * DAY_MS),
    state: 2,
    reps: 2,
    introducedOn: '2026-07-25',
    firstNextDayReviewAt: now - DAY_MS,
    dueAt: now - 1000,
    ...overrides,
  }
}

function dueCard(overrides: Partial<CardRecord> & { id: string }): CardRecord {
  return card(overrides.id, overrides)
}

function forcedNextDayCard(
  overrides: Partial<CardRecord> & { id: string },
): CardRecord {
  const { id, ...rest } = overrides
  const base = card(id, {
    introducedOn: '2026-07-26',
    dueAt: now - 1000,
    state: 1,
    reps: 1,
  })
  delete (base as Partial<CardRecord>).firstNextDayReviewAt
  return { ...base, ...rest }
}

describe('buildReviewQueue', () => {
  it('includes only due cards and excludes mastered or suspended ones', () => {
    const cards = [
      dueCard({ id: 'due-1', dueAt: now - 1000 }),
      dueCard({ id: 'future', dueAt: now + DAY_MS }),
      dueCard({ id: 'mastered', dueAt: now - 1000, mastered: true }),
      dueCard({ id: 'suspended', dueAt: now - 1000, suspended: true }),
    ]
    const result = buildReviewQueue(cards, {
      now,
      today,
      dailyReviewLimit: 10,
    })
    expect(result.due.map((item) => item.id)).toEqual(['due-1'])
    expect(result.totalDue).toBe(1)
  })

  it('prioritises relearning, then forced next-day, then most overdue', () => {
    const cards = [
      dueCard({ id: 'normal-today', dueAt: now - 1000 }),
      dueCard({ id: 'overdue-3d', dueAt: now - 3 * DAY_MS }),
      forcedNextDayCard({ id: 'forced-yesterday' }),
      dueCard({ id: 'relearning', state: 3, dueAt: now - 500 }),
    ]
    const result = buildReviewQueue(cards, {
      now,
      today,
      dailyReviewLimit: 10,
    })
    expect(result.due.map((item) => item.id)).toEqual([
      'relearning',
      'forced-yesterday',
      'overdue-3d',
      'normal-today',
    ])
    expect(result.relearningCount).toBe(1)
    expect(result.forcedNextDayCount).toBe(1)
    expect(result.overdueCount).toBeGreaterThanOrEqual(1)
  })

  it('applies dailyReviewLimit only to normal due cards', () => {
    const cards = [
      dueCard({ id: 'normal-1', dueAt: now - 1000 }),
      dueCard({ id: 'normal-2', dueAt: now - 2000 }),
      dueCard({ id: 'normal-3', dueAt: now - 3000 }),
      dueCard({ id: 'relearn-1', state: 3, dueAt: now - 100 }),
      forcedNextDayCard({ id: 'forced-1' }),
    ]
    const result = buildReviewQueue(cards, {
      now,
      today,
      dailyReviewLimit: 2,
    })
    expect(result.due.map((item) => item.id)).toEqual([
      'relearn-1',
      'forced-1',
      'normal-3',
      'normal-2',
    ])
    expect(result.totalDue).toBe(5)
  })

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

    expect(result.due.filter((item) => item.id.startsWith('forced-'))).toHaveLength(7)
    expect(result.forcedNextDayCount).toBe(7)
  })

  it('keeps a forced next-day card even when its due time is later today', () => {
    const forced = forcedNextDayCard({
      id: 'forced-late',
      dueAt: now + 60 * 60 * 1000,
    })
    const result = buildReviewQueue([forced], {
      now,
      today,
      dailyReviewLimit: 5,
    })
    expect(result.due.map((item) => item.id)).toEqual(['forced-late'])
    expect(result.forcedNextDayCount).toBe(1)
  })

  it('does not treat words introduced today as forced next-day cards', () => {
    const introducedToday = card('intro-today', {
      introducedOn: today,
      state: 1,
      reps: 1,
      dueAt: now + 5 * 60 * 1000,
    })
    delete (introducedToday as Partial<CardRecord>).firstNextDayReviewAt
    const result = buildReviewQueue([introducedToday], {
      now,
      today,
      dailyReviewLimit: 5,
    })
    expect(result.due).toHaveLength(0)
    expect(result.forcedNextDayCount).toBe(0)
  })
})
