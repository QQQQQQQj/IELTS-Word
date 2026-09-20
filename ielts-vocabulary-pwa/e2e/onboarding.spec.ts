import { expect, test } from '@playwright/test'
import { completeOnboarding, setAppTime, DAY_ONE } from './fixtures/app'

test('first run walks through onboarding into the separated home', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await page.goto('/')

  // A fresh profile is redirected to the welcome flow (seeding 4494
  // vocabulary rows can take a while on slower engines).
  await expect(page).toHaveURL(/\/welcome$/, { timeout: 30_000 })
  await expect(page.getByText(/数据仅保存在本机/)).toBeVisible()
  await expect(page.getByText(/定期导出备份/)).toBeVisible()
  await expect(page.getByText('词书仅供个人学习使用')).toBeVisible()

  await completeOnboarding(page, { dailyNew: 3 })

  await expect(page.getByRole('heading', { name: '今日复习' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '今日新词' })).toBeVisible()
  await expect(page.getByText('今日计划 3')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始复习' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始新词' })).toBeVisible()

  // Returning to the app skips onboarding.
  await page.reload()
  await expect(page.getByRole('heading', { name: '今日新词' })).toBeVisible()
  await expect(page).not.toHaveURL(/welcome/)
})
