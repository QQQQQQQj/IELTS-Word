import type { IELTSWordDatabase } from '../../db/database'
import type {
  CardRecord,
  MistakeRecord,
  RatingValue,
  ReviewLogRecord,
  StudyMode,
} from '../../db/types'
import { dateKeyOf, startOfNextLocalDay } from '../daily/dateKey'
import { scheduleReview } from './adapter'

export interface ReviewOptions {
  durationMs?: number
  answerCorrect?: boolean
  wrongAnswer?: string
}

export interface ReviewResult {
  card: CardRecord
  log: ReviewLogRecord
  /** Unclamped FSRS due time; equals card.dueAt once the clamp is released. */
  fsrsDueAt: number
}

function makeLogId(cardId: string, reviewedAt: number): string {
  return `${cardId}:${reviewedAt.toString(36)}:${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

/**
 * Rates a card atomically: card snapshot, immutable review log, daily
 * progress and the optional mistake aggregate are updated in one Dexie
 * transaction. Applies the mandatory next-day rule:
 *
 * 1. While `firstNextDayReviewAt` is unset and the review happens on the
 *    introduction day, the due time may never pass the next local midnight.
 * 2. The first review on a later local day releases the clamp, records
 *    `firstNextDayReviewAt`, and FSRS output is used untouched afterwards.
 */
export async function reviewCard(
  db: IELTSWordDatabase,
  cardId: string,
  rating: RatingValue,
  now: number,
  mode: StudyMode,
  options: ReviewOptions = {},
): Promise<ReviewResult> {
  return db.transaction(
    'rw',
    [db.cards, db.reviewLogs, db.dailyProgress, db.mistakes],
    async () => {
      const existing = await db.cards.get(cardId)
      if (!existing) {
        throw new Error(`卡片不存在：${cardId}`)
      }

      const today = dateKeyOf(now)
      const isNewIntroduction = existing.reps === 0
      const introducedOn = existing.introducedOn ?? today

      const scheduled = scheduleReview(existing, rating, now)
      let card: CardRecord = {
        ...scheduled.card,
        introducedOn,
        firstLearnedAt: existing.firstLearnedAt ?? now,
        lastMode: mode,
      }

      if (card.firstNextDayReviewAt === undefined) {
        if (today === introducedOn) {
          // Same local day as the introduction: clamp so the word must
          // reappear no later than tomorrow. Short-term relearning due
          // times before midnight stay untouched.
          const nextMidnight = startOfNextLocalDay(now)
          if (card.dueAt > nextMidnight) {
            card = { ...card, dueAt: nextMidnight }
          }
        } else {
          // First formal review on a later local date releases the clamp.
          card = { ...card, firstNextDayReviewAt: now }
        }
      }

      const log: ReviewLogRecord = {
        id: makeLogId(cardId, now),
        cardId,
        wordId: existing.wordId,
        bookId: existing.bookId,
        mode,
        rating,
        reviewedAt: now,
        studyDate: today,
        previousDueAt: scheduled.log.previousDueAt,
        nextDueAt: card.dueAt,
        elapsedDays: scheduled.log.elapsedDays,
        scheduledDays: scheduled.log.scheduledDays,
        stateBefore: scheduled.log.stateBefore,
        stateAfter: scheduled.log.stateAfter,
        stability: scheduled.log.stability,
        difficulty: scheduled.log.difficulty,
        ...(options.durationMs !== undefined
          ? { durationMs: options.durationMs }
          : {}),
        ...(options.answerCorrect !== undefined
          ? { answerCorrect: options.answerCorrect }
          : {}),
        timezoneOffsetMinutes: new Date(now).getTimezoneOffset(),
        isNewIntroduction,
      }

      await db.cards.put(card)
      await db.reviewLogs.add(log)

      const progressId = `${existing.bookId}:${today}`
      const progress = (await db.dailyProgress.get(progressId)) ?? {
        id: progressId,
        bookId: existing.bookId,
        dateKey: today,
        newCompletedIds: [],
        reviewCompletedCount: 0,
        updatedAt: now,
      }
      if (isNewIntroduction) {
        if (!progress.newCompletedIds.includes(existing.wordId)) {
          progress.newCompletedIds = [
            ...progress.newCompletedIds,
            existing.wordId,
          ]
        }
      } else {
        progress.reviewCompletedCount += 1
      }
      progress.updatedAt = now
      await db.dailyProgress.put(progress)

      if (options.answerCorrect === false) {
        const previous = await db.mistakes.get(existing.wordId)
        const mistake: MistakeRecord = {
          id: existing.wordId,
          wordId: existing.wordId,
          bookId: existing.bookId,
          errorCount: (previous?.errorCount ?? 0) + 1,
          lastErrorAt: now,
          ...(options.wrongAnswer !== undefined
            ? { lastAnswer: options.wrongAnswer }
            : previous?.lastAnswer !== undefined
              ? { lastAnswer: previous.lastAnswer }
              : {}),
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        }
        await db.mistakes.put(mistake)
      }

      return { card, log, fsrsDueAt: scheduled.fsrsDueAt }
    },
  )
}
