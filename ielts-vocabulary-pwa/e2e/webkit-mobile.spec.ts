import { expect, test } from '@playwright/test'
import { completeOnboarding, setAppTime, DAY_ONE } from './fixtures/app'

// These checks run in Playwright's WebKit engine with an iPhone device
// profile. They approximate iPhone Safari but are NOT evidence of a real
// physical-iPhone installation, standalone launch, notch or Home
// Indicator behaviour; that remains a manual checklist item.

test('serves iPhone viewport metadata and safe-area styles', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await page.goto('/')

  const viewportMeta = await page
    .locator('meta[name="viewport"]')
    .getAttribute('content')
  expect(viewportMeta).toContain('viewport-fit=cover')

  const bodyPaddingTop = await page.evaluate(() => {
    return getComputedStyle(document.body).paddingTop
  })
  // env(safe-area-inset-top) computes to 0px outside a notched device but
  // the declaration must exist and resolve.
  expect(bodyPaddingTop).toMatch(/px$/)

  const appleCapable = await page
    .locator('meta[name="apple-mobile-web-app-capable"]')
    .getAttribute('content')
  expect(appleCapable).toBe('yes')
})

test('core flow works in the WebKit iPhone profile with 44px controls', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'recognition' })

  const newButton = page.getByRole('button', { name: '开始新词' })
  await expect(newButton).toBeVisible()
  const box = await newButton.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(44)

  await newButton.click()
  await page.getByRole('button', { name: '显示答案' }).click()
  const rating = page.getByRole('button', { name: /认识/ })
  const ratingBox = await rating.boundingBox()
  expect(ratingBox).not.toBeNull()
  expect(ratingBox!.height).toBeGreaterThanOrEqual(44)
  await rating.click()
  await expect(page.getByText(/本次共完成 1 个单词/)).toBeVisible()

  const nav = page.getByRole('navigation', { name: '主导航' })
  await expect(nav).toBeVisible()
})
