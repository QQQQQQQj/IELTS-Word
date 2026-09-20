import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { IELTSWordDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import {
  exportBackup,
  importBackup,
  summarizeBackup,
  type BackupPayload,
} from '../../src/domain/backup/service'
import { parseBackup } from '../../src/domain/backup/schema'

const now = 1785000000000

let db: IELTSWordDatabase

beforeEach(async () => {
  db = new IELTSWordDatabase(
    `backup-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  )
  await db.open()
  await db.words.put({
    id: 'w1',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    meanings: ['精确的'],
  })
  await db.settings.put({ ...DEFAULT_SETTINGS, dailyNewLimit: 12 })
  await db.cards.put({
    ...createEmptyCardRecord('w1', 'ielts-toefl-basic', now),
    reps: 3,
    introducedOn: '2026-07-20',
  })
  await db.reviewLogs.put({
    id: 'log-1',
    cardId: 'w1',
    wordId: 'w1',
    bookId: 'ielts-toefl-basic',
    mode: 'recognition',
    rating: 3,
    reviewedAt: now,
    studyDate: '2026-07-20',
    nextDueAt: now + 1,
    elapsedDays: 0,
    scheduledDays: 1,
    stateBefore: 0,
    stateAfter: 1,
    stability: 2,
    difficulty: 5,
    timezoneOffsetMinutes: -480,
    isNewIntroduction: true,
  })
  await db.favorites.put({
    id: 'w1',
    wordId: 'w1',
    bookId: 'ielts-toefl-basic',
    createdAt: now,
  })
})

afterEach(async () => {
  await db.delete()
})

describe('exportBackup', () => {
  it('exports versioned user data without bundled vocabulary', async () => {
    const backup = await exportBackup(db, now)
    expect(backup).toMatchObject({
      schemaVersion: 1,
      appVersion: expect.any(String),
      exportedAt: now,
    })
    expect(backup).not.toHaveProperty('words')
    expect(backup).not.toHaveProperty('books')
    expect(backup.cards).toHaveLength(1)
    expect(backup.reviewLogs).toHaveLength(1)
    expect(backup.settings?.dailyNewLimit).toBe(12)
  })
})

describe('parseBackup', () => {
  it('accepts a real exported payload', async () => {
    const backup = await exportBackup(db, now)
    const parsed = parseBackup(JSON.parse(JSON.stringify(backup)))
    expect(parsed.cards).toHaveLength(1)
  })

  it('rejects unsupported schema versions', async () => {
    const backup = await exportBackup(db, now)
    expect(() => parseBackup({ ...backup, schemaVersion: 99 })).toThrow()
  })

  it('rejects malformed records', async () => {
    const backup = await exportBackup(db, now)
    const corrupted = JSON.parse(JSON.stringify(backup)) as BackupPayload
    ;(corrupted.cards[0] as unknown as Record<string, unknown>).rating = 'bad'
    expect(() => parseBackup(corrupted)).toThrow()
    ;(corrupted.cards as unknown[])[0] = { id: 1 }
    expect(() => parseBackup(corrupted)).toThrow()
  })
})

describe('importBackup', () => {
  it('replaces user tables atomically and keeps vocabulary', async () => {
    const backup = await exportBackup(db, now)
    // Simulate a fresh device with different current data.
    await db.cards.clear()
    await db.reviewLogs.clear()
    await db.favorites.clear()
    await db.settings.update('default', { dailyNewLimit: 99 })

    const summary = await importBackup(db, backup)

    expect(await db.cards.count()).toBe(1)
    expect(await db.reviewLogs.count()).toBe(1)
    expect(await db.favorites.count()).toBe(1)
    expect((await db.settings.get('default'))?.dailyNewLimit).toBe(12)
    expect(await db.words.count()).toBe(1)
    expect(summary.cards).toBe(1)
  })

  it('rolls back every table when import fails mid-transaction', async () => {
    const before = await exportBackup(db, now)
    const incoming = JSON.parse(JSON.stringify(before)) as BackupPayload
    incoming.cards = []
    incoming.favorites = []

    await expect(
      importBackup(db, incoming, {
        beforeCommit: () => {
          throw new Error('simulated failure')
        },
      }),
    ).rejects.toThrow('simulated failure')

    const after = await exportBackup(db, now)
    expect(after).toEqual(before)
  })
})

describe('summarizeBackup', () => {
  it('summarises record counts and review range', async () => {
    const backup = await exportBackup(db, now)
    const summary = summarizeBackup(backup)
    expect(summary).toMatchObject({
      cards: 1,
      reviewLogs: 1,
      favorites: 1,
      mistakes: 0,
    })
    expect(summary.firstReviewAt).toBe(now)
    expect(summary.lastReviewAt).toBe(now)
  })
})
