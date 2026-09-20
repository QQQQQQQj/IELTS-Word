import type { IELTSWordDatabase } from './database'
import type { AppMetaRecord, BookRecord, SettingsRecord, WordRecord } from './types'

export const APP_VERSION = '0.1.0'
export const SCHEMA_VERSION = 2

export interface VocabularyFixture {
  version: number
  books: BookRecord[]
  words: WordRecord[]
}

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'default',
  currentBookId: 'ielts-toefl-basic',
  dailyNewLimit: 20,
  dailyReviewLimit: 200,
  defaultMode: 'recognition',
  autoPlayPronunciation: false,
  voiceLocale: 'en-US',
  showPhonetic: true,
  reviewFirst: true,
  theme: 'system',
  schemaVersion: SCHEMA_VERSION,
  installPromptDismissed: false,
}

/**
 * Seeds the immutable vocabulary tables idempotently. Existing user
 * progress (cards, logs, favorites, mistakes, plans, sessions, settings)
 * is never touched, even when the vocabulary content is refreshed.
 */
export async function seedVocabulary(
  db: IELTSWordDatabase,
  fixture: VocabularyFixture,
): Promise<void> {
  await db.transaction('rw', [db.books, db.words, db.appMeta], async () => {
    const meta = await db.appMeta.get('app')
    const wordCount = await db.words.count()
    const upToDate =
      meta?.vocabularyVersion === fixture.version &&
      wordCount === fixture.words.length
    if (!upToDate) {
      await db.books.bulkPut(fixture.books)
      await db.words.bulkPut(fixture.words)
    }
    const nextMeta: AppMetaRecord = {
      id: 'app',
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      vocabularyVersion: fixture.version,
      onboardingCompleted: meta?.onboardingCompleted ?? false,
    }
    await db.appMeta.put(nextMeta)
  })
}

/** Creates the settings singleton when missing; user edits are kept. */
export async function ensureDefaultSettings(
  db: IELTSWordDatabase,
): Promise<SettingsRecord> {
  return db.transaction('rw', db.settings, async () => {
    const existing = await db.settings.get('default')
    if (existing) {
      return existing
    }
    await db.settings.put(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  })
}
