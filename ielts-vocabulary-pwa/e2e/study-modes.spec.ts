import { expect, test } from '@playwright/test'
import { completeOnboarding, setAppTime, DAY_ONE } from './fixtures/app'

test('zh-to-en spelling grades answers and records mistakes', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'zh-to-en' })

  await page.getByRole('button', { name: '开始新词' }).click()

  // Chinese is visible, English is hidden.
  await expect(page.getByLabel('输入英文')).toBeVisible()

  // A wrong spelling shows character feedback and lands in the mistakes book.
  await page.getByLabel('输入英文').fill('wrongspelling')
  await page.getByRole('button', { name: '提交' }).click()
  await expect(page.getByText('拼写有误')).toBeVisible()
  await expect(page.getByLabel('拼写反馈')).toBeVisible()

  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /完全不会/ }).click()
  await expect(page.getByText(/学习.*完成|专项练习完成|今日新词完成/)).toBeVisible()

  await page.getByRole('link', { name: '返回首页' }).click()
  await page.getByRole('link', { name: '错词本' }).click()
  await expect(page.getByText(/错误 1 次/)).toBeVisible()

  // Dedicated practice from the mistakes book reuses the study flow.
  await page.getByRole('button', { name: /练习全部错词/ }).click()
  await expect(page.getByLabel('输入英文')).toBeVisible()
})

test('listening mode hides the word and reveals a Chinese hint on demand', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'listening-spelling' })

  await page.getByRole('button', { name: '开始新词' }).click()
  await expect(page.getByText('听发音，拼写这个单词')).toBeVisible()
  await expect(page.getByLabel('播放发音')).toBeVisible()

  await page.getByRole('button', { name: '显示中文提示' }).click()
  // Chinese hint appears; the English answer stays hidden until reveal.
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /认识/ }).click()
  await expect(page.getByText(/本次共完成 1 个单词/)).toBeVisible()
})

test('recognition mode supports favorites during study', async ({ page }) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'recognition' })

  await page.getByRole('button', { name: '开始新词' }).click()
  await page.getByLabel('收藏', { exact: true }).click()
  await expect(page.getByLabel('取消收藏')).toBeVisible()
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /很简单/ }).click()

  await page.getByRole('link', { name: '返回首页' }).click()
  await page.getByRole('link', { name: '收藏本' }).click()
  await expect(page.getByRole('button', { name: '练习全部收藏' })).toBeVisible()
})
