import {
  createEmptyCard,
  fsrs,
  type Card,
  type Grade,
  type State,
} from 'ts-fsrs'
import type { CardRecord, RatingValue } from '../../db/types'

/**
 * Single scheduler instance with default FSRS v5 parameters. Cards store a
 * complete FSRS snapshot so the scheduler stays stateless.
 */
const scheduler = fsrs()

export function toFsrsCard(record: CardRecord): Card {
  return {
    due: new Date(record.dueAt),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsedDays,
    scheduled_days: record.scheduledDays,
    learning_steps: record.learningSteps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state as State,
    ...(record.lastReviewAt !== undefined
      ? { last_review: new Date(record.lastReviewAt) }
      : {}),
  }
}

function applyFsrsCard(record: CardRecord, card: Card, now: number): CardRecord {
  return {
    ...record,
    state: card.state,
    dueAt: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewAt: now,
    updatedAt: now,
  }
}

/** Creates the persisted record for a never-studied word. */
export function createEmptyCardRecord(
  wordId: string,
  bookId: string,
  now: number,
): CardRecord {
  const card = createEmptyCard(new Date(now))
  return {
    id: wordId,
    wordId,
    bookId,
    state: card.state,
    dueAt: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    suspended: false,
    mastered: false,
    createdAt: now,
    updatedAt: now,
    version: 2,
  }
}

export interface ScheduleLogData {
  rating: RatingValue
  reviewedAt: number
  previousDueAt: number
  nextDueAt: number
  elapsedDays: number
  scheduledDays: number
  stateBefore: number
  stateAfter: number
  stability: number
  difficulty: number
}

export interface ScheduleResult {
  card: CardRecord
  log: ScheduleLogData
  /** The unclamped due time produced by FSRS. */
  fsrsDueAt: number
}

/** Pure FSRS transition: rate a card at `now` and return the new snapshot. */
export function scheduleReview(
  record: CardRecord,
  rating: RatingValue,
  now: number,
): ScheduleResult {
  const { card, log } = scheduler.next(
    toFsrsCard(record),
    new Date(now),
    rating as Grade,
  )
  const nextRecord = applyFsrsCard(record, card, now)
  return {
    card: nextRecord,
    log: {
      rating,
      reviewedAt: now,
      previousDueAt: record.dueAt,
      nextDueAt: nextRecord.dueAt,
      elapsedDays: log.elapsed_days,
      scheduledDays: log.scheduled_days,
      stateBefore: record.state,
      stateAfter: nextRecord.state,
      stability: nextRecord.stability,
      difficulty: nextRecord.difficulty,
    },
    fsrsDueAt: nextRecord.dueAt,
  }
}

export interface RatingPreview {
  dueAt: number
  scheduledDays: number
}

/** Previews the due time for all four ratings without mutating anything. */
export function previewSchedule(
  record: CardRecord,
  now: number,
): Record<RatingValue, RatingPreview> {
  const preview = {} as Record<RatingValue, RatingPreview>
  for (const rating of [1, 2, 3, 4] as const) {
    const { card } = scheduler.next(
      toFsrsCard(record),
      new Date(now),
      rating as Grade,
    )
    preview[rating] = {
      dueAt: card.due.getTime(),
      scheduledDays: card.scheduled_days,
    }
  }
  return preview
}
