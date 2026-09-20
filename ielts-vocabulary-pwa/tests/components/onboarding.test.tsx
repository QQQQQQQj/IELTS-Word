import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import OnboardingPage from '../../src/features/onboarding/OnboardingPage'
import { getDatabase } from '../../src/db/database'
import { ensureDefaultSettings, seedVocabulary } from '../../src/db/seed'
import type { BookRecord, WordRecord } from '../../src/db/types'

const books: BookRecord[] = [
  {
    id: 'ielts-toefl-basic',
    name: '雅思·托福基础词汇',
    description: '基础词汇',
    totalWords: 1,
    enabled: true,
    version: 1,
    createdAt: 1753500000000,
  },
  {
    id: 'ielts-listening-spelling',
    name: '雅思听力拼写词汇',
    description: '听力拼写词汇',
    totalWords: 1,
    enabled: true,
    version: 1,
    createdAt: 1753500000000,
  },
]

const words: WordRecord[] = [
  {
    id: 'ielts-toefl-basic-0001',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    meanings: ['精确的'],
  },
  {
    id: 'ielts-listening-spelling-0001',
    bookId: 'ielts-listening-spelling',
    sourceOrder: 1,
    sourceGroup: 'main',
    word: 'absence',
    normalizedWord: 'absence',
    meanings: ['缺席'],
  },
]

const db = getDatabase()

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await seedVocabulary(db, { version: 1, books, words })
  await ensureDefaultSettings(db)
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <OnboardingPage />
    </MemoryRouter>,
  )
}

describe('OnboardingPage', () => {
  it('saves book, daily amount, mode and local-data consent', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    const bookSelect = await screen.findByLabelText('选择词书')
    await screen.findByRole('option', { name: /雅思听力拼写词汇/ })
    await user.selectOptions(bookSelect, 'ielts-listening-spelling')
    const amount = screen.getByLabelText('每日新词')
    await user.clear(amount)
    await user.type(amount, '15')
    await user.selectOptions(screen.getByLabelText('默认模式'), 'zh-to-en')
    await user.click(screen.getByRole('button', { name: '开始学习' }))

    await waitFor(async () => {
      expect(await db.settings.get('default')).toMatchObject({
        currentBookId: 'ielts-listening-spelling',
        dailyNewLimit: 15,
        defaultMode: 'zh-to-en',
      })
    })
    expect((await db.appMeta.get('app'))?.onboardingCompleted).toBe(true)
  })

  it('shows the local-data, backup reminder and personal-use notices', async () => {
    renderOnboarding()
    expect(await screen.findByText(/数据仅保存在本机/)).toBeVisible()
    expect(screen.getByText(/定期导出备份/)).toBeVisible()
    expect(screen.getByText('词书仅供个人学习使用')).toBeVisible()
  })

  it('rejects an invalid daily amount instead of saving it', async () => {
    const user = userEvent.setup()
    renderOnboarding()

    const amount = await screen.findByLabelText('每日新词')
    await user.clear(amount)
    await user.type(amount, '0')
    await user.click(screen.getByRole('button', { name: '开始学习' }))

    expect(await screen.findByText(/每日新词数量/)).toBeVisible()
    expect((await db.appMeta.get('app'))?.onboardingCompleted).toBe(false)
  })
})
