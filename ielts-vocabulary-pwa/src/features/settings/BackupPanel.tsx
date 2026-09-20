import { useState, type ChangeEvent } from 'react'
import { getDatabase } from '../../db/database'
import { dateKeyOf } from '../../domain/daily/dateKey'
import {
  backupFileName,
  exportBackup,
  importBackup,
  summarizeBackup,
  type BackupSummary,
} from '../../domain/backup/service'
import { parseBackup, type ParsedBackup } from '../../domain/backup/schema'

const MAX_FILE_BYTES = 50 * 1024 * 1024

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
    // Best-effort download; the restore flow does not depend on it.
  }
}

interface PendingImport {
  backup: ParsedBackup
  summary: BackupSummary
}

interface BackupPanelProps {
  onImported?: () => void
}

/** Import flow: validate → summarise → confirm → auto-backup → restore. */
export default function BackupPanel({ onImported }: BackupPanelProps) {
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    setResult('')
    setPending(null)
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('备份文件过大，无法导入')
      return
    }
    try {
      const text = await file.text()
      const backup = parseBackup(JSON.parse(text) as unknown)
      setPending({ backup, summary: summarizeBackup(backup) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '备份文件无法解析')
    }
  }

  async function confirmImport() {
    if (!pending) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const db = getDatabase()
      const now = Date.now()
      // Automatic safety backup of the current data before replacing it.
      const current = await exportBackup(db, now)
      downloadJson(`pre-import-${backupFileName(dateKeyOf(now))}`, current)
      const summary = await importBackup(db, pending.backup)
      setPending(null)
      setResult(
        `导入成功：卡片 ${summary.cards} 张、复习日志 ${summary.reviewLogs} 条、收藏 ${summary.favorites} 个、错词 ${summary.mistakes} 个`,
      )
      onImported?.()
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `导入失败，已回滚：${cause.message}`
          : '导入失败，数据已回滚',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="backup-file" className="text-sm font-medium">
        导入数据
      </label>
      <input
        id="backup-file"
        type="file"
        accept="application/json,.json"
        aria-label="选择备份文件"
        onChange={(event) => void handleFile(event)}
        className="text-sm"
      />

      {pending ? (
        <div
          role="alertdialog"
          aria-label="确认导入备份"
          className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4"
        >
          <p className="text-sm">
            备份内容：卡片 {pending.summary.cards} 张 · 复习日志{' '}
            {pending.summary.reviewLogs} 条 · 收藏 {pending.summary.favorites}{' '}
            个 · 错词 {pending.summary.mistakes} 个
            {pending.summary.lastReviewAt
              ? ` · 最近复习 ${new Date(
                  pending.summary.lastReviewAt,
                ).toLocaleDateString('zh-CN')}`
              : ''}
          </p>
          <p className="text-sm text-danger">
            导入将替换当前全部学习记录；导入前会自动下载当前数据的备份。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirmImport()}
              className="min-h-11 flex-1 rounded-lg bg-accent text-sm font-medium text-white disabled:opacity-60"
            >
              确认导入
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPending(null)}
              className="min-h-11 flex-1 rounded-lg border border-line text-sm"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {result ? (
        <p role="status" className="text-sm text-accent">
          {result}
        </p>
      ) : null}
    </div>
  )
}
