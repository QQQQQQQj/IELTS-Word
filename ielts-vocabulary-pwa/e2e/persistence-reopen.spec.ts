import { chromium, expect, test } from '@playwright/test'

test('keeps IndexedDB progress after closing and reopening the browser', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'persistent profile check runs on Chromium')
  const userDataDir = testInfo.outputPath('persistent-profile')
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'

  const first = await chromium.launchPersistentContext(userDataDir, {
    baseURL,
    channel: 'chromium',
  })
  const firstPage = await first.newPage()
  await firstPage.goto('/')
  await firstPage.waitForSelector(
    '#onboarding-book option[value="ielts-toefl-basic"]',
    { state: 'attached', timeout: 30_000 },
  )
  await firstPage.getByLabel('选择词书').selectOption('ielts-toefl-basic')
  await firstPage.getByLabel('每日新词').fill('1')
  await firstPage.getByRole('button', { name: '开始学习' }).click()
  await firstPage.getByRole('button', { name: '开始新词' }).click()
  await firstPage.getByRole('button', { name: '显示答案' }).click()
  await firstPage.getByRole('button', { name: /认识/ }).click()
  await firstPage.getByRole('link', { name: '返回首页' }).click()
  await expect(firstPage.getByText('新词已完成 1')).toBeVisible()
  await first.close()

  // Reopen the same persistent profile: progress must survive the full
  // browser shutdown, not only a refresh.
  const second = await chromium.launchPersistentContext(userDataDir, {
    baseURL,
    channel: 'chromium',
  })
  const secondPage = await second.newPage()
  await secondPage.goto('/')
  await expect(secondPage.getByText('新词已完成 1')).toBeVisible({
    timeout: 30_000,
  })
  await second.close()
})
