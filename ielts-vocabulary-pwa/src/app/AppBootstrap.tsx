import { useEffect, useState, type ReactNode } from 'react'
import { loadVocabulary } from '../data/books'
import { getDatabase } from '../db/database'
import { ensureDefaultSettings, seedVocabulary } from '../db/seed'
import AsyncState from '../shared/components/AsyncState'

type BootstrapStatus = 'loading' | 'error' | 'ready'

/**
 * Seeds the vocabulary and default settings before rendering any route.
 * Failures never leave the app half-initialised: the seed transaction is
 * atomic and this boundary offers an explicit retry.
 */
export default function AppBootstrap({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BootstrapStatus>('loading')
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void (async () => {
      const db = getDatabase()
      const vocabulary = await loadVocabulary(Date.now())
      await seedVocabulary(db, vocabulary)
      await ensureDefaultSettings(db)
    })()
      .then(() => {
        if (!cancelled) {
          setStatus('ready')
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setMessage(
            cause instanceof Error ? cause.message : '初始化本地数据失败',
          )
          setStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (status === 'loading') {
    return <AsyncState status="loading" />
  }
  if (status === 'error') {
    return (
      <AsyncState
        status="error"
        message={message}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    )
  }
  return children
}
