import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDatabase } from '../../db/database'
import { ensureDefaultSettings } from '../../db/seed'
import type { BookRecord, StudyMode } from '../../db/types'

const MODE_OPTIONS: { value: StudyMode; label: string }[] = [
  { value: 'recognition', label: '普通记忆' },
  { value: 'zh-to-en', label: '看中文拼英文' },
  { value: 'listening-spelling', label: '听音拼写' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<BookRecord[]>([])
  const [bookId, setBookId] = useState('ielts-toefl-basic')
  const [dailyAmount, setDailyAmount] = useState('20')
  const [mode, setMode] = useState<StudyMode>('recognition')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getDatabase()
      .books.toArray()
      .then((rows) => {
        if (!cancelled) {
          setBooks(rows)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function completeOnboarding(event: FormEvent) {
    event.preventDefault()
    const amount = Number(dailyAmount)
    if (!Number.isInteger(amount) || amount < 1 || amount > 200) {
      setError('每日新词数量必须是 1-200 之间的整数')
      return
    }
    setSaving(true)
    try {
      const db = getDatabase()
      await ensureDefaultSettings(db)
      await db.transaction('rw', [db.settings, db.appMeta], async () => {
        await db.settings.update('default', {
          currentBookId: bookId,
          dailyNewLimit: amount,
          defaultMode: mode,
        })
        const meta = await db.appMeta.get('app')
        if (meta) {
          await db.appMeta.put({ ...meta, onboardingCompleted: true })
        } else {
          await db.appMeta.put({
            id: 'app',
            schemaVersion: 2,
            appVersion: '0.1.0',
            vocabularyVersion: 0,
            onboardingCompleted: true,
          })
        }
      })
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '初始化失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-2xl font-semibold">欢迎使用</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          这是一款离线优先的雅思背单词工具。所有学习数据仅保存在本机浏览器的
          IndexedDB 中，不会上传到任何服务器。建议定期导出备份，防止清理浏览器
          数据时丢失学习进度。
        </p>
        <p className="mt-2 text-sm text-ink-soft">词书仅供个人学习使用</p>
      </div>

      <form
        onSubmit={completeOnboarding}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboarding-book" className="text-sm font-medium">
            选择词书
          </label>
          <select
            id="onboarding-book"
            value={bookId}
            onChange={(event) => setBookId(event.target.value)}
            className="min-h-11 rounded-lg border border-line bg-card px-3"
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}（{book.totalWords} 词）
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboarding-amount" className="text-sm font-medium">
            每日新词
          </label>
          <input
            id="onboarding-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={dailyAmount}
            onChange={(event) => setDailyAmount(event.target.value)}
            className="min-h-11 rounded-lg border border-line bg-card px-3"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboarding-mode" className="text-sm font-medium">
            默认模式
          </label>
          <select
            id="onboarding-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as StudyMode)}
            className="min-h-11 rounded-lg border border-line bg-card px-3"
          >
            {MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="min-h-12 rounded-xl bg-accent text-base font-medium text-white disabled:opacity-60"
        >
          开始学习
        </button>
      </form>
    </section>
  )
}
