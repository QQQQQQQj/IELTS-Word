import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import FavoritesPage from '../../src/features/collections/FavoritesPage'
import MasteredPage from '../../src/features/collections/MasteredPage'
import MistakesPage from '../../src/features/collections/MistakesPage'
import { getDatabase } from '../../src/db/database'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import type { WordRecord } from '../../src/db/types'

const db = getDatabase()
const now = Date.now()

const words: WordRecord[] = [
  {
    id: 'w1',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 1,
    sourceGroup: 'Day 1',
    word: 'precise',
    normalizedWord: 'precise',
    meanings: ['精确的'],
  },
  {
    id: 'w2',
    bookId: 'ielts-toefl-basic',
    sourceOrder: 2,
    sourceGroup: 'Day 1',
    word: 'topic',
    normalizedWord: 'topic',
    meanings: ['主题'],
  },
  {
    id: 'w3',
    bookId: 'ielts-listening-spelling',
    sourceOrder: 1,
    sourceGroup: 'main',
    word: 'absence',
    normalizedWord: 'absence',
    meanings: ['缺席'],
  },
]

function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

function renderPage(page: 'mistakes' | 'favorites' | 'mastered') {
  const element =
    page === 'mistakes' ? (
      <MistakesPage />
    ) : page === 'favorites' ? (
      <FavoritesPage />
    ) : (
      <MasteredPage />
    )
  return render(
    <MemoryRouter initialEntries={[`/${page}`]}>
      <Routes>
        <Route path={`/${page}`} element={element} />
        <Route path="/study/:kind" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.words.bulkPut(words)
  await db.books.bulkPut([
    {
      id: 'ielts-toefl-basic',
      name: '雅思·托福基础词汇',
      description: '',
      totalWords: 2,
      enabled: true,
      version: 1,
      createdAt: now,
    },
    {
      id: 'ielts-listening-spelling',
      name: '雅思听力拼写词汇',
      description: '',
      totalWords: 1,
      enabled: true,
      version: 1,
      createdAt: now,
    },
  ])
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('MistakesPage', () => {
  beforeEach(async () => {
    await db.mistakes.bulkPut([
      {
        id: 'w1',
        wordId: 'w1',
        bookId: 'ielts-toefl-basic',
        errorCount: 2,
        lastErrorAt: now - 60_000,
        lastAnswer: 'precize',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'w3',
        wordId: 'w3',
        bookId: 'ielts-listening-spelling',
        errorCount: 5,
        lastErrorAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])
    await db.cards.put({
      ...createEmptyCardRecord('w1', 'ielts-toefl-basic', now),
      state: 2,
      reps: 3,
    })
  })

  it('sorts by error count, shows counts, time and FSRS state', async () => {
    renderPage('mistakes')
    const list = await screen.findAllByRole('listitem')
    expect(list).toHaveLength(2)
    expect(within(list[0]!).getByText('absence')).toBeVisible()
    expect(within(list[0]!).getByText(/错误 5 次/)).toBeVisible()
    expect(within(list[1]!).getByText(/错误 2 次/)).toBeVisible()
    expect(within(list[1]!).getByText(/复习中/)).toBeVisible()
    expect(within(list[1]!).getByText(/上次输入 precize/)).toBeVisible()
  })

  it('filters by book and removes only the mistake aggregate', async () => {
    renderPage('mistakes')
    const user = userEvent.setup()

    await screen.findAllByRole('listitem')
    await user.selectOptions(
      screen.getByLabelText('按词书筛选'),
      'ielts-toefl-basic',
    )
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(1)
    })
    expect(screen.getByText('precise')).toBeVisible()

    await user.click(screen.getByRole('button', { name: '移除' }))
    await waitFor(async () => {
      expect(await db.mistakes.get('w1')).toBeUndefined()
    })
    // Card and history survive the removal.
    expect(await db.cards.get('w1')).toBeDefined()
  })

  it('starts dedicated practice with only the selected mistake IDs', async () => {
    renderPage('mistakes')
    const user = userEvent.setup()

    await user.click(await screen.findByLabelText('选择 absence'))
    await user.click(
      screen.getByRole('button', { name: /练习选中的 1 个错词/ }),
    )

    const location = await screen.findByTestId('location')
    expect(location.textContent).toContain('/study/practice')
    expect(location.textContent).toContain('source=mistakes')
    expect(location.textContent).toContain('words=w3')
    expect(location.textContent).not.toContain('w1')
  })
})

describe('FavoritesPage', () => {
  beforeEach(async () => {
    await db.favorites.bulkPut([
      {
        id: 'w1',
        wordId: 'w1',
        bookId: 'ielts-toefl-basic',
        createdAt: now - 1,
      },
      {
        id: 'w3',
        wordId: 'w3',
        bookId: 'ielts-listening-spelling',
        createdAt: now,
      },
    ])
  })

  it('searches, filters by book and toggles favorites', async () => {
    renderPage('favorites')
    const user = userEvent.setup()

    expect(await screen.findByText('precise')).toBeVisible()
    expect(screen.getByText('absence')).toBeVisible()

    await user.type(screen.getByLabelText('搜索收藏'), 'prec')
    await waitFor(() => {
      expect(screen.queryByText('absence')).not.toBeInTheDocument()
    })
    await user.clear(screen.getByLabelText('搜索收藏'))

    await user.selectOptions(
      screen.getByLabelText('按词书筛选'),
      'ielts-listening-spelling',
    )
    await waitFor(() => {
      expect(screen.queryByText('precise')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '取消收藏' }))
    await waitFor(async () => {
      expect(await db.favorites.get('w3')).toBeUndefined()
    })
  })

  it('starts dedicated practice with the favorite IDs', async () => {
    renderPage('favorites')
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', { name: '练习全部收藏' }),
    )
    const location = await screen.findByTestId('location')
    expect(location.textContent).toContain('source=favorites')
    expect(location.textContent).toContain('w1')
    expect(location.textContent).toContain('w3')
  })
})

describe('MasteredPage', () => {
  beforeEach(async () => {
    await db.cards.put({
      ...createEmptyCardRecord('w2', 'ielts-toefl-basic', now),
      reps: 6,
      state: 2,
      mastered: true,
      introducedOn: '2026-07-01',
    })
    await db.reviewLogs.put({
      id: 'log-w2',
      cardId: 'w2',
      wordId: 'w2',
      bookId: 'ielts-toefl-basic',
      mode: 'recognition',
      rating: 4,
      reviewedAt: now,
      studyDate: '2026-07-01',
      nextDueAt: now,
      elapsedDays: 0,
      scheduledDays: 1,
      stateBefore: 1,
      stateAfter: 2,
      stability: 5,
      difficulty: 4,
      timezoneOffsetMinutes: -480,
      isNewIntroduction: false,
    })
  })

  it('restores a mastered card only after confirmation and keeps history', async () => {
    renderPage('mastered')
    const user = userEvent.setup()

    expect(await screen.findByText('topic')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '恢复学习' }))
    // First click only opens the confirmation.
    expect((await db.cards.get('w2'))?.mastered).toBe(true)

    await user.click(screen.getByRole('button', { name: '确认恢复' }))
    await waitFor(async () => {
      expect((await db.cards.get('w2'))?.mastered).toBe(false)
    })
    expect(await db.reviewLogs.count()).toBe(1)
    expect((await db.cards.get('w2'))?.reps).toBe(6)
  })
})
