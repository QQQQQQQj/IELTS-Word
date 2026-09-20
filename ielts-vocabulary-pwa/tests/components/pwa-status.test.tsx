import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InstallHint from '../../src/app/InstallHint'
import NetworkStatus from '../../src/app/NetworkStatus'
import { UpdateBar } from '../../src/app/PwaUpdatePrompt'
import { getDatabase } from '../../src/db/database'
import { DEFAULT_SETTINGS } from '../../src/db/seed'

const db = getDatabase()

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await db.settings.put({ ...DEFAULT_SETTINGS })
})

afterEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('NetworkStatus', () => {
  it('shows the offline banner when the browser goes offline', async () => {
    render(<NetworkStatus />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('当前离线')

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})

describe('UpdateBar', () => {
  it('shows a non-blocking prompt and never reloads by itself', async () => {
    const onUpdate = vi.fn()
    const onDismiss = vi.fn()
    render(
      <UpdateBar visible={true} onUpdate={onUpdate} onDismiss={onDismiss} />,
    )
    expect(screen.getByText('发现新版本')).toBeVisible()
    // Rendering alone must not trigger the update/reload.
    expect(onUpdate).not.toHaveBeenCalled()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '稍后' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onUpdate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '立即更新' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('renders nothing while no update is waiting', () => {
    render(
      <UpdateBar visible={false} onUpdate={() => {}} onDismiss={() => {}} />,
    )
    expect(screen.queryByText('发现新版本')).not.toBeInTheDocument()
  })
})

describe('InstallHint', () => {
  it('shows closable iPhone guidance and persists the dismissal', async () => {
    render(<InstallHint />)
    expect(await screen.findByRole('note')).toHaveTextContent('添加到主屏幕')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '关闭安装提示' }))
    await waitFor(async () => {
      expect(
        (await db.settings.get('default'))?.installPromptDismissed,
      ).toBe(true)
    })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('stays hidden after the user dismissed it before', async () => {
    await db.settings.update('default', { installPromptDismissed: true })
    render(<InstallHint />)
    await waitFor(() => {
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })
  })
})
