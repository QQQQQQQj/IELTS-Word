import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import StudySessionPage from '../../src/features/study/StudySessionPage'
import { getDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'
import type { WordRecord } from '../../src/db/types'

const BOOK_ID = 'ielts-toefl-basic'

const words: WordRecord[] = [
  {
    id: `${BOOK_ID}-0001`,
    bookId: BOOK_ID,
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    phonetic: '/prɪˈsaɪs/',
    partOfSpeech: 'a.',
    meanings: ['精确的'],
  },
  {
    id: `${BOOK_ID}-0002`,
    bookId: BOOK_ID,
    sourceOrder: 2,
    sourceGroup: 'Day 1',
    word: 'topic',
    normalizedWord: 'topic',
    partOfSpeech: 'n.',
    meanings: ['主题'],
  },
]

const db = getDatabase()

async function seedSession(defaultMode: string) {
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.words.bulkPut(words)
  await db.books.put({
    id: BOOK_ID,
    name: '雅思·托福基础词汇',
    description: '',
    totalWords: words.length,
    enabled: true,
    version: 1,
    createdAt: Date.now(),
  })
  await db.settings.put({
    ...DEFAULT_SETTINGS,
    currentBookId: BOOK_ID,
    dailyNewLimit: 2,
    defaultMode: defaultMode as typeof DEFAULT_SETTINGS.defaultMode,
  })
  await db.appMeta.put({
    id: 'app',
    schemaVersion: 2,
    appVersion: '0.1.0',
    vocabularyVersion: 1,
    onboardingCompleted: true,
  })
}

beforeEach(async () => {
  await seedSession('recognition')
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

function renderSession(path = '/study/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/study/:kind" element={<StudySessionPage />} />
        <Route path="/" element={<p>首页</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('StudySessionPage recognition mode', () => {
  it('hides the answer until reveal, then offers four Chinese ratings', async () => {
    renderSession()

    expect(await screen.findByText('precise')).toBeVisible()
    expect(screen.queryByText('精确的')).not.toBeInTheDocument()
    expect(screen.getByLabelText('播放发音')).toBeVisible()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '显示答案' }))

    expect(screen.getByText('精确的')).toBeVisible()
    for (const label of ['完全不会', '有点模糊', '认识', '很简单']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeVisible()
    }
    // Next-due previews are rendered inside the rating buttons.
    const goodButton = screen.getByRole('button', { name: /认识/ })
    expect(goodButton.textContent).toMatch(/分钟|小时|天/)
  })

  it('persists the rating, advances and finishes the session', async () => {
    renderSession()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '显示答案' }))
    await user.click(screen.getByRole('button', { name: /认识/ }))

    expect(await screen.findByText('topic')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '显示答案' }))
    await user.click(screen.getByRole('button', { name: /很简单/ }))

    expect(await screen.findByText(/本次共完成 2 个单词/)).toBeVisible()
    expect(await db.reviewLogs.count()).toBe(2)
    const card = await db.cards.get(`${BOOK_ID}-0001`)
    expect(card?.reps).toBe(1)
    expect(card?.introducedOn).toBeDefined()
  })
})

describe('StudySessionPage zh-to-en mode', () => {
  it('shows Chinese only, grades the answer and records mistakes', async () => {
    await seedSession('zh-to-en')
    renderSession()
    const user = userEvent.setup()

    expect(await screen.findByText('精确的')).toBeVisible()
    expect(screen.queryByText('precise')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('输入英文'), 'precize')
    await user.click(screen.getByRole('button', { name: '提交' }))

    expect(await screen.findByText('拼写有误')).toBeVisible()
    expect(screen.getByLabelText('拼写反馈')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '显示答案' }))
    await user.click(screen.getByRole('button', { name: /完全不会/ }))

    await waitFor(async () => {
      const mistake = await db.mistakes.get(`${BOOK_ID}-0001`)
      expect(mistake?.errorCount).toBe(1)
      expect(mistake?.lastAnswer).toBe('precize')
    })
  })

  it('accepts a correct answer ignoring case and spaces', async () => {
    await seedSession('zh-to-en')
    renderSession()
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('输入英文'), ' Precise ')
    await user.click(screen.getByRole('button', { name: '提交' }))

    expect(await screen.findByText('拼写正确')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /认识/ }))
    await waitFor(async () => {
      expect(await db.mistakes.count()).toBe(0)
      expect(await db.reviewLogs.count()).toBe(1)
    })
  })
})

describe('StudySessionPage listening mode', () => {
  it('hides both English and Chinese until hint or reveal', async () => {
    await seedSession('listening-spelling')
    renderSession()

    expect(
      await screen.findByText('听发音，拼写这个单词'),
    ).toBeVisible()
    expect(screen.queryByText('precise')).not.toBeInTheDocument()
    expect(screen.queryByText('精确的')).not.toBeInTheDocument()
    expect(screen.getByLabelText('播放发音')).toBeVisible()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '显示中文提示' }))
    expect(screen.getByText('精确的')).toBeVisible()
    expect(screen.queryByText('precise')).not.toBeInTheDocument()
  })
})
