import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import SettingsPage from '../../src/features/settings/SettingsPage'
import { getDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'
import { createEmptyCardRecord } from '../../src/domain/fsrs/adapter'
import { dateKeyOf } from '../../src/domain/daily/dateKey'

const db = getDatabase()
const now = Date.now()
const today = dateKeyOf(now)

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.books.bulkPut([
    {
      id: 'ielts-toefl-basic',
      name: '雅思·托福基础词汇',
      description: '',
      totalWords: 3,
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
  await db.words.bulkPut(
    ['w1', 'w2', 'w3'].map((id, index) => ({
      id,
      bookId: 'ielts-toefl-basic',
      sourceOrder: index + 1,
      sourceGroup: 'Day 1',
      word: `word${index + 1}`,
      normalizedWord: `word${index + 1}`,
      meanings: [`释义${index + 1}`],
    })),
  )
  await db.settings.put({ ...DEFAULT_SETTINGS })
  await db.appMeta.put({
    id: 'app',
    schemaVersion: 2,
    appVersion: '0.1.0',
    vocabularyVersion: 1,
    onboardingCompleted: true,
  })
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('SettingsPage', () => {
  it('saves and reloads every required settings field', async () => {
    renderSettings()
    const user = userEvent.setup()

    await user.selectOptions(
      await screen.findByLabelText('当前词书'),
      'ielts-listening-spelling',
    )
    const newLimit = screen.getByLabelText('每日新词')
    await user.clear(newLimit)
    await user.type(newLimit, '15')
    const reviewLimit = screen.getByLabelText('每日最大复习')
    await user.clear(reviewLimit)
    await user.type(reviewLimit, '80')
    await user.selectOptions(screen.getByLabelText('默认模式'), 'zh-to-en')
    await user.click(screen.getByLabelText('自动播放发音'))
    await user.selectOptions(screen.getByLabelText('语音口音'), 'en-GB')
    await user.click(screen.getByLabelText('显示音标'))
    await user.click(screen.getByLabelText('先复习后学新词'))
    await user.selectOptions(screen.getByLabelText('主题'), 'dark')
    await user.click(screen.getByLabelText('不再显示安装提示'))

    await waitFor(async () => {
      expect(await db.settings.get('default')).toMatchObject({
        currentBookId: 'ielts-listening-spelling',
        dailyNewLimit: 15,
        dailyReviewLimit: 80,
        defaultMode: 'zh-to-en',
        autoPlayPronunciation: true,
        voiceLocale: 'en-GB',
        showPhonetic: false,
        reviewFirst: false,
        theme: 'dark',
        schemaVersion: 2,
        installPromptDismissed: true,
      })
    })
  })

  it('shows install, privacy and version sections', async () => {
    renderSettings()
    expect(
      await screen.findByRole('heading', { name: 'PWA 安装说明' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: '隐私说明' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '版本信息' })).toBeVisible()
    expect(screen.getByText(/词书仅供个人学习使用/)).toBeVisible()
  })

  it('resets the daily plan only after confirmation', async () => {
    await db.dailyPlans.put({
      id: `ielts-toefl-basic:${today}`,
      bookId: 'ielts-toefl-basic',
      dateKey: today,
      wordIds: ['w1'],
      createdAt: now,
    })
    renderSettings()
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', { name: '重置今日计划' }),
    )
    expect(
      (await db.dailyPlans.get(`ielts-toefl-basic:${today}`))?.wordIds,
    ).toEqual(['w1'])

    await user.click(screen.getByRole('button', { name: '确认重置' }))
    await waitFor(async () => {
      const plan = await db.dailyPlans.get(`ielts-toefl-basic:${today}`)
      expect(plan?.wordIds).toEqual(['w1', 'w2', 'w3'])
    })
  })

  it('updates lastExportedAt when exporting data', async () => {
    renderSettings()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: '导出数据' }))
    await waitFor(async () => {
      const settings = await db.settings.get('default')
      expect(settings?.lastExportedAt).toBeGreaterThan(0)
    })
  })

  it('clears study data only after the second confirmation', async () => {
    await db.cards.put(createEmptyCardRecord('w1', 'ielts-toefl-basic', now))
    renderSettings()
    const user = userEvent.setup()

    await user.click(
      await screen.findByRole('button', { name: '清空学习记录' }),
    )
    // First click only shows the impact summary.
    expect(await screen.findByRole('alertdialog')).toBeVisible()
    expect(screen.getByText(/卡片 1 张/)).toBeVisible()
    expect(await db.cards.count()).toBe(1)

    await user.click(screen.getByRole('button', { name: '确认清空' }))
    await waitFor(async () => {
      expect(await db.cards.count()).toBe(0)
    })
    expect(await db.words.count()).toBe(3)
  })
})
