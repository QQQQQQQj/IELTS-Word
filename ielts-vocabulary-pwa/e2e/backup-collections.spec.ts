import { expect, test, type Page } from '@playwright/test'
import { completeOnboarding, setAppTime, DAY_ONE } from './fixtures/app'

function navLink(page: Page, name: string) {
  return page
    .getByRole('navigation', { name: '主导航' })
    .getByRole('link', { name })
}

test('exports a backup and restores it after clearing study data', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'recognition' })

  await page.getByRole('button', { name: '开始新词' }).click()
  await page.getByRole('button', { name: '显示答案' }).click()
  await page.getByRole('button', { name: /认识/ }).click()
  await page.getByRole('link', { name: '返回首页' }).click()
  await expect(page.getByText('新词已完成 1')).toBeVisible()

  await navLink(page, '设置').click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出数据' }).click()
  const backupFile = await download
  const backupPath = await backupFile.path()
  expect(backupFile.suggestedFilename()).toMatch(
    /^ielts-words-backup-\d{4}-\d{2}-\d{2}\.json$/,
  )
  await expect(page.getByText('已导出学习数据备份')).toBeVisible()

  // Clearing requires the second confirmation.
  await page.getByRole('button', { name: '清空学习记录' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: '确认清空' }).click()
  await expect(page.getByText('学习记录已清空')).toBeVisible()

  await navLink(page, '首页').click()
  await expect(page.getByText('新词已完成 0')).toBeVisible()

  // Restore the exported backup.
  await navLink(page, '设置').click()
  const preImportDownload = page.waitForEvent('download')
  await page.getByLabel('选择备份文件').setInputFiles(backupPath)
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: '确认导入' }).click()
  await preImportDownload
  await expect(page.getByText(/导入成功/)).toBeVisible()

  await navLink(page, '首页').click()
  await expect(page.getByText('新词已完成 1')).toBeVisible()
})

test('mastered words leave the review queue and can be restored', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1, mode: 'recognition' })
  await navLink(page, '统计').click()
  await expect(page.getByRole('heading', { name: '学习统计' })).toBeVisible()
  await expect(page.getByText('今日暂无学习')).toBeVisible()

  await page.goto('/mastered')
  await expect(page.getByRole('heading', { name: '已掌握' })).toBeVisible()
  await expect(page.getByText('还没有标记为已掌握的单词')).toBeVisible()
})

test('rejects an invalid backup file without changing data', async ({
  page,
}) => {
  await setAppTime(page, DAY_ONE)
  await completeOnboarding(page, { dailyNew: 1 })
  await navLink(page, '设置').click()

  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":99}'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
})
