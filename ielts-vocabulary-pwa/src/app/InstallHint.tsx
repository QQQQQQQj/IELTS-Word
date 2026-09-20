import { useEffect, useState } from 'react'
import { getDatabase } from '../db/database'

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  if (window.matchMedia?.('(display-mode: standalone)').matches) {
    return true
  }
  return (
    'standalone' in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

/** Closable iPhone add-to-home-screen guidance. */
export default function InstallHint() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (isStandalone()) {
      return undefined
    }
    void getDatabase()
      .settings.get('default')
      .then((settings) => {
        if (!cancelled && settings && !settings.installPromptDismissed) {
          setVisible(true)
        }
      })
      .catch(() => {
        // Settings not ready yet; the hint simply stays hidden.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!visible) {
    return null
  }

  async function dismiss() {
    setVisible(false)
    await getDatabase().settings.update('default', {
      installPromptDismissed: true,
    })
  }

  return (
    <div
      role="note"
      className="flex items-start justify-between gap-3 border-b border-line bg-card px-4 py-2 text-xs text-ink-soft"
    >
      <span>
        在 iPhone Safari 中点击分享按钮，选择“添加到主屏幕”，即可离线使用。
      </span>
      <button
        type="button"
        aria-label="关闭安装提示"
        onClick={() => void dismiss()}
        className="min-h-8 shrink-0 rounded-lg border border-line px-2"
      >
        关闭
      </button>
    </div>
  )
}
