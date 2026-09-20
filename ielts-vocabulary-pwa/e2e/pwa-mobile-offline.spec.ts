import { expect, test } from '@playwright/test'
import { completeOnboarding, setAppTime, DAY_ONE } from './fixtures/app'

test('registers a service worker and works offline after the first load', async ({
  page,
  context,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text())
    }
  })

  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1 })

  // Wait until the service worker is active, then reload so it controls
  // the page.
  await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker?.getRegistration()
      return registration?.active !== null && registration?.active !== undefined
    },
    { timeout: 30_000 },
  )
  await page.reload()
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    { timeout: 30_000 },
  )
  await expect(page.getByRole('heading', { name: '今日新词' })).toBeVisible()

  // The manifest is served and complete.
  const manifest = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest')
    return response.json() as Promise<Record<string, unknown>>
  })
  expect(manifest.display).toBe('standalone')
  expect(Array.isArray(manifest.icons)).toBe(true)

  // Offline reload keeps the app fully usable.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '今日复习' })).toBeVisible({
    timeout: 30_000,
  })
  // The offline banner itself is covered by component tests; Playwright's
  // network emulation does not reliably drive navigator.onLine here.
  await context.setOffline(false)

  expect(consoleErrors).toEqual([])
})

test('keeps primary actions visible on a 390x844 viewport', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1 })

  const reviewButton = page.getByRole('button', { name: '开始复习' })
  const newButton = page.getByRole('button', { name: '开始新词' })
  await expect(reviewButton).toBeVisible()
  await expect(newButton).toBeVisible()

  // Bottom navigation stays reachable and at least 44px tall.
  const nav = page.getByRole('navigation', { name: '主导航' })
  await expect(nav).toBeVisible()
  const navBox = await nav.boundingBox()
  expect(navBox).not.toBeNull()
  expect(navBox!.height).toBeGreaterThanOrEqual(44)
  expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(844 + 1)

  const buttonBox = await newButton.boundingBox()
  expect(buttonBox).not.toBeNull()
  expect(buttonBox!.height).toBeGreaterThanOrEqual(44)

  await context.close()
})
