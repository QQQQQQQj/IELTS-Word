import Dexie from 'dexie'
import { IELTSWordDatabase } from './database'
import type { CardRecord, SettingsRecord } from './types'

export const SCHEMA_VERSION_ONE_STORES = {
  books: 'id',
  words: 'id, bookId',
  cards: 'id, bookId, dueAt',
  reviewLogs: 'id, cardId, reviewedAt',
  dailyPlans: 'id',
  dailyProgress: 'id',
  settings: 'id',
  favorites: 'id',
  mistakes: 'id',
  studySessions: 'id',
  appMeta: 'id',
} as const

export const SCHEMA_VERSION_TWO_STORES = {
  books: 'id',
  words: 'id, bookId, [bookId+sourceOrder], [bookId+normalizedWord]',
  cards: 'id, bookId, dueAt, [bookId+dueAt], [bookId+state+dueAt], introducedOn',
  reviewLogs:
    'id, cardId, bookId, reviewedAt, studyDate, [bookId+reviewedAt], [cardId+reviewedAt]',
  dailyPlans: 'id, bookId, dateKey',
  dailyProgress: 'id, bookId, dateKey',
  settings: 'id',
  favorites: 'id, bookId, createdAt',
  mistakes: 'id, bookId, errorCount, lastErrorAt',
  studySessions: 'id, dateKey, startedAt',
  appMeta: 'id',
} as const

const CARD_V2_DEFAULTS = {
  learningSteps: 0,
  suspended: false,
  mastered: false,
  version: 2,
} as const

const SETTINGS_V2_DEFAULTS = {
  dailyReviewLimit: 200,
  autoPlayPronunciation: false,
  voiceLocale: 'en-US',
  showPhonetic: true,
  reviewFirst: true,
  theme: 'system',
  schemaVersion: 2,
  installPromptDismissed: false,
} as const

/**
 * Registers every historical schema version plus the v1 → v2 upgrade on a
 * Dexie instance. The upgrade only fills in missing fields; it never drops
 * or rewrites user progress records.
 */
export function defineSchema(db: Dexie): void {
  db.version(1).stores({ ...SCHEMA_VERSION_ONE_STORES })
  db.version(2)
    .stores({ ...SCHEMA_VERSION_TWO_STORES })
    .upgrade(async (transaction) => {
      await transaction
        .table<Partial<CardRecord>, string>('cards')
        .toCollection()
        .modify((card) => {
          for (const [key, value] of Object.entries(CARD_V2_DEFAULTS)) {
            if (card[key as keyof CardRecord] === undefined) {
              Object.assign(card, { [key]: value })
            }
          }
        })
      await transaction
        .table<Partial<SettingsRecord>, string>('settings')
        .toCollection()
        .modify((settings) => {
          for (const [key, value] of Object.entries(SETTINGS_V2_DEFAULTS)) {
            if (settings[key as keyof SettingsRecord] === undefined) {
              Object.assign(settings, { [key]: value })
            }
          }
        })
    })
}

export interface VersionOneFixture {
  books?: Record<string, unknown>[]
  words?: Record<string, unknown>[]
  cards?: Record<string, unknown>[]
  reviewLogs?: Record<string, unknown>[]
  dailyPlans?: Record<string, unknown>[]
  dailyProgress?: Record<string, unknown>[]
  settings?: Record<string, unknown>[]
  favorites?: Record<string, unknown>[]
  mistakes?: Record<string, unknown>[]
  studySessions?: Record<string, unknown>[]
  appMeta?: Record<string, unknown>[]
}

/**
 * Creates an on-disk database that only knows the legacy v1 schema and
 * fills it with the provided records. Used by migration tests.
 */
export async function writeVersionOneFixture(
  name: string,
  fixture: VersionOneFixture,
): Promise<void> {
  const legacy = new Dexie(name)
  legacy.version(1).stores({ ...SCHEMA_VERSION_ONE_STORES })
  await legacy.open()
  try {
    await legacy.transaction('rw', legacy.tables, async () => {
      for (const [tableName, rows] of Object.entries(fixture)) {
        if (rows && rows.length > 0) {
          await legacy.table(tableName).bulkPut(rows)
        }
      }
    })
  } finally {
    legacy.close()
  }
}

/** Opens (without deleting) a database using the current v2 schema. */
export function openVersionTwoDatabase(name: string): IELTSWordDatabase {
  return new IELTSWordDatabase(name)
}
