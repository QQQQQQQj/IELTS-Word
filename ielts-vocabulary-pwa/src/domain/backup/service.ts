import type { IELTSWordDatabase } from '../../db/database'
import { APP_VERSION, SCHEMA_VERSION } from '../../db/seed'
import { parseBackup } from './schema'
import type {
  CardRecord,
  DailyPlanRecord,
  DailyProgressRecord,
  FavoriteRecord,
  MistakeRecord,
  ReviewLogRecord,
  SettingsRecord,
  StudySessionRecord,
} from '../../db/types'

export const BACKUP_SCHEMA_VERSION = 1

export interface BackupPayload {
  schemaVersion: number
  appVersion: string
  dbSchemaVersion: number
  exportedAt: number
  settings: SettingsRecord | null
  cards: CardRecord[]
  reviewLogs: ReviewLogRecord[]
  dailyPlans: DailyPlanRecord[]
  dailyProgress: DailyProgressRecord[]
  favorites: FavoriteRecord[]
  mistakes: MistakeRecord[]
  studySessions: StudySessionRecord[]
}

/**
 * Exports every user-owned table as a versioned JSON payload. Built-in
 * vocabulary (books/words) is intentionally not duplicated into backups.
 */
export async function exportBackup(
  db: IELTSWordDatabase,
  now: number,
): Promise<BackupPayload> {
  return db.transaction(
    'r',
    [
      db.settings,
      db.cards,
      db.reviewLogs,
      db.dailyPlans,
      db.dailyProgress,
      db.favorites,
      db.mistakes,
      db.studySessions,
    ],
    async () => ({
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      dbSchemaVersion: SCHEMA_VERSION,
      exportedAt: now,
      settings: (await db.settings.get('default')) ?? null,
      cards: await db.cards.toArray(),
      reviewLogs: await db.reviewLogs.toArray(),
      dailyPlans: await db.dailyPlans.toArray(),
      dailyProgress: await db.dailyProgress.toArray(),
      favorites: await db.favorites.toArray(),
      mistakes: await db.mistakes.toArray(),
      studySessions: await db.studySessions.toArray(),
    }),
  )
}

/** Suggested backup filename, e.g. ielts-words-backup-2026-07-28.json */
export function backupFileName(dateKey: string): string {
  return `ielts-words-backup-${dateKey}.json`
}

export interface BackupSummary {
  cards: number
  reviewLogs: number
  dailyPlans: number
  favorites: number
  mistakes: number
  studySessions: number
  firstReviewAt: number | null
  lastReviewAt: number | null
}

/** Structural subset accepted by the summary (payload or parsed form). */
export interface SummarizableBackup {
  cards: readonly unknown[]
  reviewLogs: readonly { reviewedAt: number }[]
  dailyPlans: readonly unknown[]
  favorites: readonly unknown[]
  mistakes: readonly unknown[]
  studySessions: readonly unknown[]
}

/** Human-facing summary shown before a restore is confirmed. */
export function summarizeBackup(payload: SummarizableBackup): BackupSummary {
  const reviewTimes = payload.reviewLogs.map((log) => log.reviewedAt)
  return {
    cards: payload.cards.length,
    reviewLogs: payload.reviewLogs.length,
    dailyPlans: payload.dailyPlans.length,
    favorites: payload.favorites.length,
    mistakes: payload.mistakes.length,
    studySessions: payload.studySessions.length,
    firstReviewAt: reviewTimes.length > 0 ? Math.min(...reviewTimes) : null,
    lastReviewAt: reviewTimes.length > 0 ? Math.max(...reviewTimes) : null,
  }
}

export interface ImportHooks {
  /** Test hook executed inside the transaction before it commits. */
  beforeCommit?: () => void
}

/**
 * Zod-inferred optionals are `T | undefined`, which conflicts with the
 * record contracts under `exactOptionalPropertyTypes`. Dropping the
 * undefined-valued keys restores the exact persisted shape.
 */
function sanitizeRow<R>(row: object): R {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) {
      clean[key] = value
    }
  }
  return clean as R
}

function sanitizeRows<R>(rows: object[]): R[] {
  return rows.map((row) => sanitizeRow<R>(row))
}

/**
 * Validates and atomically restores a backup. All user tables are replaced
 * in a single Dexie `rw` transaction; any failure (including validation of
 * a single record) rolls the whole database back to its previous state.
 * The payload is treated as data only — nothing from it is executed.
 */
export async function importBackup(
  db: IELTSWordDatabase,
  payload: unknown,
  hooks: ImportHooks = {},
): Promise<BackupSummary> {
  const backup = parseBackup(payload)
  await db.transaction(
    'rw',
    [
      db.settings,
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

      await db.cards.bulkAdd(sanitizeRows<CardRecord>(backup.cards))
      await db.reviewLogs.bulkAdd(
        sanitizeRows<ReviewLogRecord>(backup.reviewLogs),
      )
      await db.dailyPlans.bulkAdd(
        sanitizeRows<DailyPlanRecord>(backup.dailyPlans),
      )
      await db.dailyProgress.bulkAdd(
        sanitizeRows<DailyProgressRecord>(backup.dailyProgress),
      )
      await db.favorites.bulkAdd(sanitizeRows<FavoriteRecord>(backup.favorites))
      await db.mistakes.bulkAdd(sanitizeRows<MistakeRecord>(backup.mistakes))
      await db.studySessions.bulkAdd(
        sanitizeRows<StudySessionRecord>(backup.studySessions),
      )
      if (backup.settings) {
        await db.settings.put(sanitizeRow<SettingsRecord>(backup.settings))
      }
      hooks.beforeCommit?.()
    },
  )
  return summarizeBackup(backup)
}
