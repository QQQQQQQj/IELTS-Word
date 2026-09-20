import { describe, expect, it, afterEach } from 'vitest'
import { IELTSWordDatabase } from '../../src/db/database'

let db: IELTSWordDatabase | undefined

afterEach(async () => {
  if (db) {
    await db.delete()
    db = undefined
  }
})

describe('IELTSWordDatabase', () => {
  it('creates all current version-two tables', async () => {
    db = new IELTSWordDatabase(`db-test-${Date.now()}`)
    await db.open()
    const names = db.tables.map((table) => table.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'books',
        'words',
        'cards',
        'reviewLogs',
        'dailyPlans',
        'dailyProgress',
        'settings',
        'favorites',
        'mistakes',
        'studySessions',
        'appMeta',
      ]),
    )
  })

  it('opens at schema version two', async () => {
    db = new IELTSWordDatabase(`db-version-${Date.now()}`)
    await db.open()
    expect(db.verno).toBe(2)
  })
})
