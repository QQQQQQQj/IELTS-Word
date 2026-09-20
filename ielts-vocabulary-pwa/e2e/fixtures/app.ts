import { expect, type Page } from '@playwright/test'

/** Fixed local times used to make day boundaries deterministic. */
export const DAY_ONE = new Date(2026, 6, 28, 10, 0, 0)
export const DAY_ONE_LATER = new Date(2026, 6, 28, 21, 0, 0)
export const DAY_TWO = new Date(2026, 6, 29, 10, 0, 0)

/** Fixes Date.now() in the page while keeping real timers running. */
export async function setAppTime(page: Page, time: Date): Promise<void> {
  await page.clock.setFixedTime(time)
}

export interface OnboardingOptions {
  dailyNew?: number
  mode?: 'recognition' | 'zh-to-en' | 'listening-spelling'
  bookId?: string
}

/** Completes the first-run flow and lands on the separated home page. */
export async function completeOnboarding(
  page: Page,
  options: OnboardingOptions = {},
): Promise<void> {
  const {
    dailyNew = 2,
    mode = 'recognition',
    bookId = 'ielts-toefl-basic',
  } = options
  await page.goto('/')
  await page.waitForSelector(`#onboarding-book option[value="${bookId}"]`, {
    state: 'attached',
    timeout: 30_000,
  })
  await page.getByLabel('选择词书').selectOption(bookId)
  await page.getByLabel('每日新词').fill(String(dailyNew))
  await page.getByLabel('默认模式').selectOption(mode)
  await page.getByRole('button', { name: '开始学习' }).click()
  await expect(page.getByRole('heading', { name: '今日复习' })).toBeVisible({
    timeout: 30_000,
  })
}

/** Rates the currently revealed card in recognition mode. */
export async function studyOneRecognitionWord(
  page: Page,
  rating: '完全不会' | '有点模糊' | '认识' | '很简单' = '认识',
): Promise<void> {
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: new RegExp(rating) }).click()
}
