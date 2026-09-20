import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDatabase } from '../../db/database'
import type { BookRecord } from '../../db/types'
import { formatInterval } from '../../shared/format'
import AsyncState from '../../shared/components/AsyncState'
import {
  listMistakes,
  removeMistake,
  type MistakeListItem,
} from './collectionService'

const STATE_NAMES = ['新卡', '学习中', '复习中', '重学中'] as const

function stateName(state: number | undefined): string {
  if (state === undefined) {
    return '未学习'
  }
  return STATE_NAMES[state] ?? '未知'
}

export default function MistakesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<MistakeListItem[] | null>(null)
  const [books, setBooks] = useState<BookRecord[]>([])
  const [bookFilter, setBookFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    const db = getDatabase()
    setBooks(await db.books.toArray())
    setItems(await listMistakes(db, bookFilter || undefined))
  }, [bookFilter])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!items) {
    return <AsyncState status="loading" />
  }

  const practiceIds =
    selected.size > 0
      ? items.filter((item) => selected.has(item.word.id))
      : items

  function toggleSelected(wordId: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(wordId)) {
        next.delete(wordId)
      } else {
        next.add(wordId)
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">错词本</h2>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          词书筛选
          <select
            aria-label="按词书筛选"
            value={bookFilter}
            onChange={(event) => setBookFilter(event.target.value)}
            className="min-h-10 rounded-lg border border-line bg-card px-2"
          >
            <option value="">全部词书</option>
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length === 0 ? (
        <AsyncState status="empty" emptyText="还没有拼错的单词" />
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/study/practice?source=mistakes&words=${practiceIds
                  .map((item) => item.word.id)
                  .join(',')}`,
              )
            }
            className="min-h-12 rounded-xl bg-accent font-medium text-white"
          >
            {selected.size > 0
              ? `练习选中的 ${selected.size} 个错词`
              : '练习全部错词'}
          </button>
          <ul className="flex flex-col gap-3">
            {items.map(({ mistake, word, card }) => (
              <li
                key={word.id}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={`选择 ${word.word}`}
                      checked={selected.has(word.id)}
                      onChange={() => toggleSelected(word.id)}
                      className="h-5 w-5"
                    />
                    <div>
                      <p className="text-lg font-medium">{word.word}</p>
                      <p className="text-sm text-ink-soft">
                        {word.meanings.join('；')}
                      </p>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      void removeMistake(getDatabase(), word.id).then(reload)
                    }}
                    className="min-h-10 rounded-lg border border-line px-3 text-sm"
                  >
                    移除
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  错误 {mistake.errorCount} 次 · 最近{' '}
                  {formatInterval(mistake.lastErrorAt, Date.now())}前 · 状态：
                  {stateName(card?.state)}
                  {mistake.lastAnswer ? ` · 上次输入 ${mistake.lastAnswer}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
