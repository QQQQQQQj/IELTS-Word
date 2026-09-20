import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { IELTSWordDatabase } from '../../src/db/database'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import { reviewCard } from '../../src/domain/fsrs/reviewService'
import { dateKeyOf, startOfNextLocalDay } from '../../src/domain/daily/dateKey'

const BOOK_ID = 'ielts-toefl-basic'

let db: IELTSWordDatabase

beforeEach(async () => {
  db = new IELTSWordDatabase(
    `next-day-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  await db.open()
})

afterEach(async () => {
  await db.delete()
})

async function seedNewCard(id: string, createdAt: number): Promise<void> {
  await db.cards.put(createEmptyCardRecord(id, BOOK_ID, createdAt))
}

async function seedIntroducedCard(
  id: string,
  introducedAt: number,
): Promise<void> {
  const base = createEmptyCardRecord(id, BOOK_ID, introducedAt)
  await db.cards.put({
    ...base,
    state: 1,
    reps: 1,
    stability: 2.5,
    difficulty: 5.2,
    dueAt: startOfNextLocalDay(introducedAt),
    lastReviewAt: introducedAt,
    introducedOn: dateKeyOf(introducedAt),
    firstLearnedAt: introducedAt,
  })
}

describe('next-day mandatory review', () => {
  it('clamps the first formal review to the next local day', async () => {
    const introducedAt = new Date(2026, 6, 26, 23, 58).getTime()
    await seedNewCard('card-clamp', introducedAt)

    const result = await reviewCard(
      db,
      'card-clamp',
      Rating.Easy,
      introducedAt,
      'recognition',
    )

    expect(result.card.dueAt).toBe(new Date(2026, 6, 27, 0, 0).getTime())
    expect(result.card.firstNextDayReviewAt).toBeUndefined()
    expect(result.card.introducedOn).toBe('2026-07-26')
    expect(result.fsrsDueAt).toBeGreaterThan(result.card.dueAt)
  })

  it('keeps same-day Again short-term relearning due times', async () => {
    const introducedAt = new Date(2026, 6, 26, 9, 0).getTime()
    await seedNewCard('card-again', introducedAt)

    const result = await reviewCard(
      db,
      'card-again',
      Rating.Again,
      introducedAt,
      'recognition',
    )

    expect(result.card.dueAt).toBeLessThan(startOfNextLocalDay(introducedAt))
    expect(result.card.firstNextDayReviewAt).toBeUndefined()
  })

  it('still requires the next-day review after several same-day reviews', async () => {
    const introducedAt = new Date(2026, 6, 26, 9, 0).getTime()
    await seedNewCard('card-multi', introducedAt)

    await reviewCard(db, 'card-multi', Rating.Again, introducedAt, 'recognition')
    const secondAt = introducedAt + 10 * 60 * 1000
    const result = await reviewCard(
      db,
      'card-multi',
      Rating.Good,
      secondAt,
      'recognition',
    )

    expect(result.card.firstNextDayReviewAt).toBeUndefined()
    expect(result.card.dueAt).toBeLessThanOrEqual(
      startOfNextLocalDay(introducedAt),
    )
  })

  it('releases the clamp after a later local-date review', async () => {
    const introducedAt = new Date(2026, 6, 26, 22, 0).getTime()
    await seedIntroducedCard('card-release', introducedAt)

    const reviewedAt = new Date(2026, 6, 27, 8, 0).getTime()
    const result = await reviewCard(
      db,
      'card-release',
      Rating.Good,
      reviewedAt,
      'recognition',
    )

    expect(result.card.firstNextDayReviewAt).toBe(reviewedAt)
    expect(result.card.dueAt).toBe(result.fsrsDueAt)
  })

  it('never re-applies the clamp after the formal next-day review', async () => {
    const introducedAt = new Date(2026, 6, 26, 22, 0).getTime()
    await seedIntroducedCard('card-done', introducedAt)
    const reviewedAt = new Date(2026, 6, 27, 8, 0).getTime()
    await reviewCard(db, 'card-done', Rating.Good, reviewedAt, 'recognition')

    const laterAt = new Date(2026, 6, 27, 9, 0).getTime()
    const result = await reviewCard(
      db,
      'card-done',
      Rating.Good,
      laterAt,
      'recognition',
    )

    expect(result.card.firstNextDayReviewAt).toBe(reviewedAt)
    expect(result.card.dueAt).toBe(result.fsrsDueAt)
  })

  it('writes an immutable review log and daily progress in one transaction', async () => {
    const introducedAt = new Date(2026, 6, 26, 9, 0).getTime()
    await seedNewCard('card-log', introducedAt)

    const result = await reviewCard(
      db,
      'card-log',
      Rating.Good,
      introducedAt,
      'zh-to-en',
      { durationMs: 1200, answerCorrect: true },
    )

    expect(await db.reviewLogs.count()).toBe(1)
    const log = await db.reviewLogs.get(result.log.id)
    expect(log).toMatchObject({
      cardId: 'card-log',
      rating: Rating.Good,
      mode: 'zh-to-en',
      studyDate: '2026-07-26',
      answerCorrect: true,
      isNewIntroduction: true,
    })
    const progress = await db.dailyProgress.get(`${BOOK_ID}:2026-07-26`)
    expect(progress?.newCompletedIds).toContain('card-log')
  })

  it('upserts the mistake aggregate for wrong spelling answers', async () => {
    const introducedAt = new Date(2026, 6, 26, 9, 0).getTime()
    await seedNewCard('card-wrong', introducedAt)

    await reviewCard(db, 'card-wrong', Rating.Again, introducedAt, 'zh-to-en', {
      answerCorrect: false,
      wrongAnswer: 'wrnog',
    })
    await reviewCard(
      db,
      'card-wrong',
      Rating.Again,
      introducedAt + 60_000,
      'zh-to-en',
      { answerCorrect: false, wrongAnswer: 'wrongg' },
    )

    const mistake = await db.mistakes.get('card-wrong')
    expect(mistake).toMatchObject({
      errorCount: 2,
      lastAnswer: 'wrongg',
    })
    expect(await db.mistakes.count()).toBe(1)
  })

  it('handles a non-UTC timezone boundary using local dates', async () => {
    // The suite runs in the host timezone; assert consistency between the
    // dateKey helper and the clamp rather than hard-coding UTC values.
    const introducedAt = new Date(2026, 11, 31, 23, 30).getTime()
    await seedNewCard('card-tz', introducedAt)

    const result = await reviewCard(
      db,
      'card-tz',
      Rating.Easy,
      introducedAt,
      'recognition',
    )

    expect(dateKeyOf(result.card.dueAt)).toBe('2027-01-01')
    expect(result.card.dueAt).toBe(startOfNextLocalDay(introducedAt))
  })
})
