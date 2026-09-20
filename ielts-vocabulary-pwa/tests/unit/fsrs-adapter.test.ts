import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import {
  createEmptyCardRecord,
  previewSchedule,
  scheduleReview,
} from '../../src/domain/fsrs/adapter'
import type { RatingValue } from '../../src/db/types'

const now = new Date(2026, 6, 26, 10, 0).getTime()

function emptyCardRow(timestamp: number) {
  return createEmptyCardRecord('word-0001', 'ielts-toefl-basic', timestamp)
}

describe('scheduleReview', () => {
  it.each([
    [Rating.Again],
    [Rating.Hard],
    [Rating.Good],
    [Rating.Easy],
  ])('persists rating %s and increments reps', (rating) => {
    const result = scheduleReview(emptyCardRow(now), rating as RatingValue, now)
    expect(result.card.reps).toBe(1)
    expect(result.log.rating).toBe(rating)
    expect(Number.isFinite(result.card.dueAt)).toBe(true)
    expect(result.card.dueAt).toBeGreaterThan(now)
  })

  it('keeps a complete FSRS snapshot on the card record', () => {
    const result = scheduleReview(emptyCardRow(now), 3, now)
    expect(result.card.state).toBeGreaterThan(0)
    expect(result.card.stability).toBeGreaterThan(0)
    expect(result.card.difficulty).toBeGreaterThan(0)
    expect(result.card.lastReviewAt).toBe(now)
    expect(result.card.updatedAt).toBe(now)
    expect(result.fsrsDueAt).toBe(result.card.dueAt)
  })

  it('records state transitions in the log payload', () => {
    const first = scheduleReview(emptyCardRow(now), 3, now)
    expect(first.log.stateBefore).toBe(0)
    expect(first.log.stateAfter).toBe(first.card.state)
    expect(first.log.nextDueAt).toBe(first.card.dueAt)
  })

  it('increases lapses when a review card is rated Again', () => {
    let record = emptyCardRow(now)
    record = scheduleReview(record, 4, now).card
    const later = record.dueAt + 1000
    const relapsed = scheduleReview(record, 1, later)
    expect(relapsed.card.lapses).toBe(record.lapses + 1)
    expect(relapsed.card.reps).toBe(record.reps + 1)
  })
})

describe('previewSchedule', () => {
  it('previews four distinct rating outcomes without mutating the card', () => {
    const record = emptyCardRow(now)
    const preview = previewSchedule(record, now)
    expect(Object.keys(preview)).toHaveLength(4)
    expect(preview[1].dueAt).toBeGreaterThan(now)
    expect(preview[4].dueAt).toBeGreaterThanOrEqual(preview[1].dueAt)
    expect(record.reps).toBe(0)
  })
})
