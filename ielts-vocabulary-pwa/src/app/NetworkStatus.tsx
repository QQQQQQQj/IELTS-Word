import { useEffect, useState } from 'react'

/** Offline banner; studying continues to work fully offline. */
export default function NetworkStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) {
    return null
  }
  return (
    <p
      role="status"
      className="border-b border-line bg-paper px-4 py-1.5 text-center text-xs text-ink-soft"
    >
      当前离线：学习功能不受影响，数据保存在本机
    </p>
  )
}
