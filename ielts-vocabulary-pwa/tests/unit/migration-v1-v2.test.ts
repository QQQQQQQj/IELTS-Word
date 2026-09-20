import { afterEach, describe, expect, it } from 'vitest'
import {
  openVersionTwoDatabase,
  writeVersionOneFixture,
} from '../../src/db/migrations'
import type { IELTSWordDatabase } from '../../src/db/database'

const legacyCard = {
  id: 'ielts-toefl-basic-0001',
  wordId: 'ielts-toefl-basic-0001',
  bookId: 'ielts-toefl-basic',
  state: 2,
  dueAt: 1753586400000,
  stability: 4.5,
  difficulty: 5.4,
  elapsedDays: 1,
  scheduledDays: 3,
  reps: 4,
  lapses: 1,
  createdAt: 1753400000000,
  updatedAt: 1753500000000,
}

const legacyReviewLog = {
  id: 'log-0001',
  cardId: 'ielts-toefl-basic-0001',
  wordId: 'ielts-toefl-basic-0001',
  bookId: 'ielts-toefl-basic',
  rating: 3,
  reviewedAt: 1753500000000,
  nextDueAt: 1753586400000,
  elapsedDays: 1,
  scheduledDays: 3,
  stateBefore: 1,
  stateAfter: 2,
}

const legacyFavorite = {
  id: 'ielts-toefl-basic-0002',
  wordId: 'ielts-toefl-basic-0002',
  bookId: 'ielts-toefl-basic',
  createdAt: 1753500000000,
}

const legacyMistake = {
  id: 'ielts-toefl-basic-0003',
  wordId: 'ielts-toefl-basic-0003',
  bookId: 'ielts-toefl-basic',
  errorCount: 2,
  lastErrorAt: 1753500000000,
  createdAt: 1753400000000,
  updatedAt: 1753500000000,
}

const legacySettings = {
  id: 'default',
  currentBookId: 'ielts-toefl-basic',
  dailyNewLimit: 15,
  defaultMode: 'recognition',
}

function uniqueDatabaseName(): string {
  return `migration-test-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

let migrated: IELTSWordDatabase | undefined

afterEach(async () => {
  if (migrated) {
    await migrated.delete()
    migrated = undefined
  }
})

describe('v1 to v2 migration', () => {
  it('migrates v1 progress to v2 without losing user records', async () => {
    const name = uniqueDatabaseName()
    await writeVersionOneFixture(name, {
      cards: [legacyCard],
      reviewLogs: [legacyReviewLog],
      favorites: [legacyFavorite],
      mistakes: [legacyMistake],
      settings: [legacySettings],
    })

    migrated = openVersionTwoDatabase(name)
    await migrated.open()
    expect(migrated.verno).toBe(2)

    expect(await migrated.cards.get(legacyCard.id)).toMatchObject({
      id: legacyCard.id,
      reps: legacyCard.reps,
      stability: legacyCard.stability,
      dueAt: legacyCard.dueAt,
    })
    expect(await migrated.reviewLogs.count()).toBe(1)
    expect(await migrated.favorites.count()).toBe(1)
    expect(await migrated.mistakes.count()).toBe(1)
    expect(await migrated.settings.get('default')).toMatchObject({
      currentBookId: legacySettings.currentBookId,
      dailyNewLimit: legacySettings.dailyNewLimit,
    })
  })

  it('supplies defaults for the new v2 card and settings fields', async () => {
    const name = uniqueDatabaseName()
    await writeVersionOneFixture(name, {
      cards: [legacyCard],
      settings: [legacySettings],
    })

    migrated = openVersionTwoDatabase(name)
    await migrated.open()

    const card = await migrated.cards.get(legacyCard.id)
    expect(card).toMatchObject({
      learningSteps: 0,
      suspended: false,
      mastered: false,
      version: 2,
    })

    const settings = await migrated.settings.get('default')
    expect(settings).toMatchObject({
      dailyReviewLimit: 200,
      voiceLocale: 'en-US',
      autoPlayPronunciation: false,
      showPhonetic: true,
      reviewFirst: true,
      theme: 'system',
      schemaVersion: 2,
      installPromptDismissed: false,
    })
  })
})
