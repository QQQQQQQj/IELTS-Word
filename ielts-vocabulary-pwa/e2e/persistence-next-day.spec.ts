import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  setAppTime,
  studyOneRecognitionWord,
  DAY_ONE,
  DAY_TWO,
} from './fixtures/app'

test('new words persist across refresh and are forced into next-day review', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 2, mode: 'recognition' })

  // Learn both planned words.
  await page.getByRole('button', { name: '开始新词' }).click()
  await studyOneRecognitionWord(page, '认识')
  await studyOneRecognitionWord(page, '很简单')
  await expect(page.getByText(/本次共完成 2 个单词/)).toBeVisible()
  await page.getByRole('link', { name: '返回首页' }).click()
  await expect(page.getByText('新词已完成 2')).toBeVisible()

  // Refresh keeps the progress (IndexedDB persistence).
  await page.reload()
  await expect(page.getByText('新词已完成 2')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始新词' })).toBeDisabled()

  // Next local day: both words must be forced into the review queue,
  // even though one was rated 很简单 (Easy).
  await setAppTime(page, DAY_TWO)
  await page.reload()
  await expect(page.getByText('到期 2')).toBeVisible()
  await expect(page.getByText('今日计划 2')).toBeVisible()
  await expect(page.getByText('新词已完成 0')).toBeVisible()

  // Complete the mandatory next-day review with all four ratings covered.
  await page.getByRole('button', { name: '开始复习' }).click()
  await studyOneRecognitionWord(page, '完全不会')
  await studyOneRecognitionWord(page, '有点模糊')
  // The Again card re-enters as short-term relearning; finish it.
  await expect(page.getByText(/今日复习/).first()).toBeVisible()
  await page.getByRole('link', { name: '返回首页' }).click()
  await expect(page.getByText('已完成 2')).toBeVisible()
})
