import { useRegisterSW } from 'virtual:pwa-register/react'

interface UpdateBarProps {
  visible: boolean
  onUpdate: () => void
  onDismiss: () => void
}

/**
 * Non-blocking update bar. The new Service Worker keeps waiting until the
 * user explicitly confirms; the app never reloads on its own, so an active
 * study session is never interrupted and IndexedDB data is untouched.
 */
export function UpdateBar({ visible, onUpdate, onDismiss }: UpdateBarProps) {
  if (!visible) {
    return null
  }
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-line bg-card px-4 py-2 text-sm"
    >
      <span>发现新版本</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onUpdate}
          className="min-h-10 rounded-lg bg-accent px-3 text-white"
        >
          立即更新
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-10 rounded-lg border border-line px-3"
        >
          稍后
        </button>
      </div>
    </div>
  )
}

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true })

  return (
    <UpdateBar
      visible={needRefresh}
      onUpdate={() => void updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  )
}
