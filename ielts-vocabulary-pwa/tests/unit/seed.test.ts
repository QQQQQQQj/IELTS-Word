import { afterEach, describe, expect, it } from 'vitest'
import { IELTSWordDatabase } from '../../src/db/database'
import { ensureDefaultSettings, seedVocabulary } from '../../src/db/seed'
import type { BookRecord, WordRecord } from '../../src/db/types'

const fixtureBooks: BookRecord[] = [
  {
    id: 'ielts-toefl-basic',
    name: '雅思·托福基础词汇',
    description: '一叶留学教育基础词汇',
    totalWords: 3,
    enabled: true,
    version: 1,
    createdAt: 1753500000000,
  },
]

const fixtureWords: WordRecord[] = [
  {
    id: 'ielts-toefl-basic-0001',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    phonetic: '/prɪˈsaɪs/',
    partOfSpeech: 'a.',
    meanings: ['精确的'],
  },
  {
    id: 'ielts-toefl-basic-0002',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 2,
    sourceGroup: 'Day 1',
    word: 'topic',
    normalizedWord: 'topic',
    partOfSpeech: 'n.',
    meanings: ['主题', '话题,论题'],
  },
  {
    id: 'ielts-toefl-basic-0003',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 3,
    sourceGroup: 'Day 1',
    word: 'freeze',
    normalizedWord: 'freeze',
    partOfSpeech: 'v.',
    meanings: ['冷冻'],
  },
]

const fixtures = {
  version: 1,
  books: fixtureBooks,
  words: fixtureWords,
}

let db: IELTSWordDatabase | undefined

afterEach(async () => {
  if (db) {
    await db.delete()
    db = undefined
  }
})

describe('seedVocabulary', () => {
  it('seeds vocabulary idempotently', async () => {
    db = new IELTSWordDatabase(`seed-test-${Date.now()}`)
    await seedVocabulary(db, fixtures)
    await seedVocabulary(db, fixtures)
    expect(await db.words.count()).toBe(fixtures.words.length)
    expect(await db.books.count()).toBe(fixtures.books.length)
    const meta = await db.appMeta.get('app')
    expect(meta?.vocabularyVersion).toBe(1)
  })

  it('refreshes vocabulary content without touching user progress', async () => {
    db = new IELTSWordDatabase(`seed-refresh-${Date.now()}`)
    await seedVocabulary(db, fixtures)
    await db.cards.put({
      id: 'ielts-toefl-basic-0001',
      wordId: 'ielts-toefl-basic-0001',
      bookId: 'ielts-toefl-basic',
      state: 2,
      dueAt: 1753586400000,
      stability: 3.2,
      difficulty: 5.1,
      elapsedDays: 0,
      scheduledDays: 1,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      suspended: false,
      mastered: false,
      createdAt: 1753500000000,
      updatedAt: 1753500000000,
      version: 2,
    })

    await seedVocabulary(db, { ...fixtures, version: 2 })

    expect(await db.cards.count()).toBe(1)
    const meta = await db.appMeta.get('app')
    expect(meta?.vocabularyVersion).toBe(2)
  })
})

describe('ensureDefaultSettings', () => {
  it('creates the default settings once and keeps user edits', async () => {
    db = new IELTSWordDatabase(`settings-test-${Date.now()}`)
    await ensureDefaultSettings(db)
    const created = await db.settings.get('default')
    expect(created).toMatchObject({
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
      schemaVersion: 2,
      installPromptDismissed: false,
    })

    await db.settings.update('default', { dailyNewLimit: 15 })
    await ensureDefaultSettings(db)
    expect((await db.settings.get('default'))?.dailyNewLimit).toBe(15)
  })
})
