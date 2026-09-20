import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '../../src/features/home/HomePage'
import { useHomeSummary } from '../../src/features/home/useHomeSummary'
import type { HomeSummaryState } from '../../src/features/home/useHomeSummary'

vi.mock('../../src/features/home/useHomeSummary', () => ({
  useHomeSummary: vi.fn(),
}))

const readySummary: HomeSummaryState = {
  status: 'ready',
  data: {
    needsOnboarding: false,
    dueCount: 12,
    overdueCount: 4,
    reviewCompletedCount: 3,
    reviewEstimateMinutes: 8,
    forcedNextDayCount: 2,
    newPlannedCount: 15,
    newCompletedCount: 6,
    currentBookName: '雅思·托福基础词汇',
    streakDays: 5,
    todayCompletedCount: 9,
    todayTotalCount: 27,
    lastSevenDays: [1, 2, 3, 4, 5, 6, 7],
  },
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(useHomeSummary).mockReturnValue(readySummary)
})

describe('HomePage', () => {
  it('renders separate review and new-word sections', async () => {
    renderHome()
    expect(
      await screen.findByRole('heading', { name: '今日复习' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: '今日新词' })).toBeVisible()
    expect(screen.getByRole('button', { name: '开始复习' })).not.toBe(
      screen.getByRole('button', { name: '开始新词' }),
    )
  })

  it('shows every required home metric from the summary query', () => {
    renderHome()
    expect(screen.getByText('到期 12')).toBeVisible()
    expect(screen.getByText('逾期 4')).toBeVisible()
    expect(screen.getByText('已完成 3')).toBeVisible()
    expect(screen.getByText('预计 8 分钟')).toBeVisible()
    expect(screen.getByText('今日计划 15')).toBeVisible()
    expect(screen.getByText('新词已完成 6')).toBeVisible()
    expect(screen.getByText('雅思·托福基础词汇')).toBeVisible()
    expect(screen.getByText('连续 5 天')).toBeVisible()
    expect(screen.getByText('9 / 27')).toBeVisible()
    expect(screen.getByLabelText('最近 7 天学习量')).toBeVisible()
  })

  it('links to mistakes, favorites, statistics and settings', () => {
    renderHome()
    expect(screen.getByRole('link', { name: '错词本' })).toBeVisible()
    expect(screen.getByRole('link', { name: '收藏本' })).toBeVisible()
    expect(screen.getByRole('link', { name: '统计' })).toBeVisible()
    expect(screen.getByRole('link', { name: '设置' })).toBeVisible()
  })

  it('shows the loading state before the summary resolves', () => {
    vi.mocked(useHomeSummary).mockReturnValue({ status: 'loading' })
    renderHome()
    expect(screen.getByText('加载中…')).toBeVisible()
  })

  it('shows a retryable error state', () => {
    vi.mocked(useHomeSummary).mockReturnValue({
      status: 'error',
      message: '数据库不可用',
    })
    renderHome()
    expect(screen.getByText('数据库不可用')).toBeVisible()
  })
})
