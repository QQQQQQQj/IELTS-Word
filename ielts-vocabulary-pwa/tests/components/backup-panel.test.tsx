import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import BackupPanel from '../../src/features/settings/BackupPanel'
import { getDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import { exportBackup } from '../../src/domain/backup/service'

const db = getDatabase()
const now = 1785000000000

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.words.put({
    id: 'w1',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    meanings: ['精确的'],
  })
  await db.settings.put({ ...DEFAULT_SETTINGS })
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

function jsonFile(payload: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(payload)], name, {
    type: 'application/json',
  })
}

describe('BackupPanel', () => {
  it('shows a summary and only imports after confirmation', async () => {
    await db.cards.put({
      ...createEmptyCardRecord('w1', 'ielts-toefl-basic', now),
      reps: 2,
      introducedOn: '2026-07-20',
    })
    await db.favorites.put({
      id: 'w1',
      wordId: 'w1',
      bookId: 'ielts-toefl-basic',
      createdAt: now,
    })
    const backup = await exportBackup(db, now)
    await db.cards.clear()
    await db.favorites.clear()

    render(<BackupPanel />)
    const user = userEvent.setup()

    await user.upload(
      screen.getByLabelText('选择备份文件'),
      jsonFile(JSON.parse(JSON.stringify(backup))),
    )

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toBeVisible()
    expect(screen.getByText(/卡片 1 张/)).toBeVisible()
    // Nothing is written before the confirmation.
    expect(await db.cards.count()).toBe(0)

    await user.click(screen.getByRole('button', { name: '确认导入' }))
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(1)
    })
    expect(await screen.findByText(/导入成功/)).toBeVisible()
    expect(await db.favorites.count()).toBe(1)
    expect(await db.words.count()).toBe(1)
  })

  it('rejects an invalid backup without writing anything', async () => {
    render(<BackupPanel />)
    const user = userEvent.setup()

    await user.upload(
      screen.getByLabelText('选择备份文件'),
      jsonFile({ schemaVersion: 99, cards: 'nope' }),
    )

    expect(await screen.findByRole('alert')).toBeVisible()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(await db.cards.count()).toBe(0)
  })

  it('can cancel the pending import', async () => {
    const backup = await exportBackup(db, now)
    render(<BackupPanel />)
    const user = userEvent.setup()

    await user.upload(
      screen.getByLabelText('选择备份文件'),
      jsonFile(JSON.parse(JSON.stringify(backup))),
    )
    await user.click(await screen.findByRole('button', { name: '取消' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
