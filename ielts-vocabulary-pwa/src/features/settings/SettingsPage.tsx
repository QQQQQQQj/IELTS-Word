import { useEffect, useState } from 'react'
import { getDatabase } from '../../db/database'
import { APP_VERSION } from '../../db/seed'
import type {
  AppMetaRecord,
  BookRecord,
  SettingsRecord,
  StudyMode,
  ThemePreference,
  VoiceLocale,
} from '../../db/types'
import { dateKeyOf } from '../../domain/daily/dateKey'
import { resetDailyPlan } from '../../domain/daily/newPlan'
import { backupFileName, exportBackup } from '../../domain/backup/service'
import {
  clearStudyData,
  studyDataImpact,
  type ClearResultCounts,
} from '../../domain/settings/clearStudyData'
import AsyncState from '../../shared/components/AsyncState'
import BackupPanel from './BackupPanel'

function downloadJson(fileName: string, payload: unknown): void {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.click()
    URL.revokeObjectURL(url)
  } catch {
    // jsdom and very old browsers: the export payload was still produced
    // and lastExportedAt updated; downloading is best-effort.
  }
}

interface NumberFieldProps {
  id: string
  label: string
  initialValue: number
  min: number
  max: number
  onValid: (value: number) => void
}

/** Number input with local text state so partial edits never snap back. */
function NumberField({
  id,
  label,
  initialValue,
  min,
  max,
  onValid,
}: NumberFieldProps) {
  const [text, setText] = useState(String(initialValue))
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          const value = Number(event.target.value)
          if (Number.isInteger(value) && value >= min && value <= max) {
            onValid(value)
          }
        }}
        className="min-h-11 w-24 rounded-lg border border-line bg-card px-3"
      />
    </div>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsRecord | null>(null)
  const [books, setBooks] = useState<BookRecord[]>([])
  const [meta, setMeta] = useState<AppMetaRecord | null>(null)
  const [resetConfirming, setResetConfirming] = useState(false)
  const [clearImpact, setClearImpact] = useState<ClearResultCounts | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const db = getDatabase()
      const [loaded, allBooks, appMeta] = await Promise.all([
        db.settings.get('default'),
        db.books.toArray(),
        db.appMeta.get('app'),
      ])
      if (!cancelled) {
        setSettings(loaded ?? null)
        setBooks(allBooks)
        setMeta(appMeta ?? null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!settings) {
    return <AsyncState status="loading" />
  }

  async function update(patch: Partial<SettingsRecord>): Promise<void> {
    const db = getDatabase()
    await db.settings.update('default', patch)
    const next = await db.settings.get('default')
    setSettings(next ?? null)
  }

  async function handleExport(): Promise<void> {
    const db = getDatabase()
    const now = Date.now()
    const payload = await exportBackup(db, now)
    downloadJson(backupFileName(dateKeyOf(now)), payload)
    await update({ lastExportedAt: now })
    setNotice('已导出学习数据备份')
  }

  async function handleResetPlan(): Promise<void> {
    if (!settings) {
      return
    }
    const db = getDatabase()
    await resetDailyPlan(
      db,
      settings.currentBookId,
      dateKeyOf(Date.now()),
      settings.dailyNewLimit,
    )
    setResetConfirming(false)
    setNotice('今日新词计划已重置')
  }

  async function handleClear(): Promise<void> {
    const db = getDatabase()
    await clearStudyData(db, { confirmed: true })
    setClearImpact(null)
    setNotice('学习记录已清空')
  }

  const fieldClass = 'min-h-11 rounded-lg border border-line bg-card px-3'
  const rowClass = 'flex items-center justify-between gap-3'

  return (
    <div className="flex flex-col gap-5 py-2">
      <h2 className="text-xl font-semibold">设置</h2>
      {notice ? (
        <p role="status" className="rounded-lg bg-accent/10 px-3 py-2 text-sm">
          {notice}
        </p>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">学习</h3>
        <div className={rowClass}>
          <label htmlFor="settings-book">当前词书</label>
          <select
            id="settings-book"
            value={settings.currentBookId}
            onChange={(event) =>
              void update({ currentBookId: event.target.value })
            }
            className={fieldClass}
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
        </div>
        <NumberField
          id="settings-new-limit"
          label="每日新词"
          initialValue={settings.dailyNewLimit}
          min={1}
          max={200}
          onValid={(value) => void update({ dailyNewLimit: value })}
        />
        <NumberField
          id="settings-review-limit"
          label="每日最大复习"
          initialValue={settings.dailyReviewLimit}
          min={10}
          max={1000}
          onValid={(value) => void update({ dailyReviewLimit: value })}
        />
        <div className={rowClass}>
          <label htmlFor="settings-mode">默认模式</label>
          <select
            id="settings-mode"
            value={settings.defaultMode}
            onChange={(event) =>
              void update({ defaultMode: event.target.value as StudyMode })
            }
            className={fieldClass}
          >
            <option value="recognition">普通记忆</option>
            <option value="zh-to-en">看中文拼英文</option>
            <option value="listening-spelling">听音拼写</option>
          </select>
        </div>
        <div className={rowClass}>
          <label htmlFor="settings-review-first">先复习后学新词</label>
          <input
            id="settings-review-first"
            type="checkbox"
            checked={settings.reviewFirst}
            onChange={(event) =>
              void update({ reviewFirst: event.target.checked })
            }
            className="h-5 w-5"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">发音与显示</h3>
        <div className={rowClass}>
          <label htmlFor="settings-autoplay">自动播放发音</label>
          <input
            id="settings-autoplay"
            type="checkbox"
            checked={settings.autoPlayPronunciation}
            onChange={(event) =>
              void update({ autoPlayPronunciation: event.target.checked })
            }
            className="h-5 w-5"
          />
        </div>
        <div className={rowClass}>
          <label htmlFor="settings-voice">语音口音</label>
          <select
            id="settings-voice"
            value={settings.voiceLocale}
            onChange={(event) =>
              void update({ voiceLocale: event.target.value as VoiceLocale })
            }
            className={fieldClass}
          >
            <option value="en-US">美式发音</option>
            <option value="en-GB">英式发音</option>
          </select>
        </div>
        <div className={rowClass}>
          <label htmlFor="settings-phonetic">显示音标</label>
          <input
            id="settings-phonetic"
            type="checkbox"
            checked={settings.showPhonetic}
            onChange={(event) =>
              void update({ showPhonetic: event.target.checked })
            }
            className="h-5 w-5"
          />
        </div>
        <div className={rowClass}>
          <label htmlFor="settings-theme">主题</label>
          <select
            id="settings-theme"
            value={settings.theme}
            onChange={(event) =>
              void update({ theme: event.target.value as ThemePreference })
            }
            className={fieldClass}
          >
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">今日计划</h3>
        <p className="text-sm text-ink-soft">
          修改每日新词数量默认从明天生效；重置后今日计划立即按当前设置重建，已学
          单词不会重新出现。
        </p>
        {resetConfirming ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleResetPlan()}
              className="min-h-11 flex-1 rounded-lg bg-accent text-sm font-medium text-white"
            >
              确认重置
            </button>
            <button
              type="button"
              onClick={() => setResetConfirming(false)}
              className="min-h-11 flex-1 rounded-lg border border-line text-sm"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setResetConfirming(true)}
            className="min-h-11 rounded-lg border border-line text-sm font-medium"
          >
            重置今日计划
          </button>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">数据备份</h3>
        <p className="text-sm text-ink-soft">
          {settings.lastExportedAt
            ? `上次导出：${new Date(settings.lastExportedAt).toLocaleString('zh-CN')}`
            : '还没有导出过备份，建议定期导出。'}
        </p>
        <button
          type="button"
          onClick={() => void handleExport()}
          className="min-h-11 rounded-lg bg-accent text-sm font-medium text-white"
        >
          导出数据
        </button>
        <BackupPanel />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">清空学习记录</h3>
        <p className="text-sm text-ink-soft">
          清空后所有卡片进度、复习日志、收藏、错词和会话都会被删除，且无法恢复。
          词库本身和偏好设置会保留。
        </p>
        {clearImpact ? (
          <div role="alertdialog" aria-label="确认清空学习记录" className="flex flex-col gap-3">
            <p className="text-sm">
              将删除：卡片 {clearImpact.cards} 张 · 复习日志{' '}
              {clearImpact.reviewLogs} 条 · 收藏 {clearImpact.favorites} 个 ·
              错词 {clearImpact.mistakes} 个 · 学习会话{' '}
              {clearImpact.studySessions} 次。此操作不可恢复。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleClear()}
                className="min-h-11 flex-1 rounded-lg bg-danger text-sm font-medium text-white"
              >
                确认清空
              </button>
              <button
                type="button"
                onClick={() => setClearImpact(null)}
                className="min-h-11 flex-1 rounded-lg border border-line text-sm"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              void studyDataImpact(getDatabase()).then(setClearImpact)
            }}
            className="min-h-11 rounded-lg border border-danger text-sm font-medium text-danger"
          >
            清空学习记录
          </button>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">PWA 安装说明</h3>
        <p className="text-sm text-ink-soft">
          在 iPhone Safari 中打开本站，点击分享按钮，然后选择“添加到主屏幕”，
          即可像普通 App 一样离线使用。
        </p>
        <label className="flex items-center justify-between gap-3 text-sm">
          不再显示安装提示
          <input
            type="checkbox"
            checked={settings.installPromptDismissed}
            onChange={(event) =>
              void update({ installPromptDismissed: event.target.checked })
            }
            className="h-5 w-5"
          />
        </label>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">隐私说明</h3>
        <p className="text-sm text-ink-soft">
          所有学习数据仅保存在本机浏览器的 IndexedDB 中，不会上传到任何服务器。
          词书仅供个人学习使用。
        </p>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">版本信息</h3>
        <p className="text-sm text-ink-soft">
          应用版本 {APP_VERSION} · 数据库版本 v{settings.schemaVersion} · 词库
          版本 v{meta?.vocabularyVersion ?? '—'}
        </p>
      </section>
    </div>
  )
}
