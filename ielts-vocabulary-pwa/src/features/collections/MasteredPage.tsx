import { useCallback, useEffect, useState } from 'react'
import { getDatabase } from '../../db/database'
import AsyncState from '../../shared/components/AsyncState'
import {
  listMastered,
  setMastered,
  type MasteredListItem,
} from './collectionService'

export default function MasteredPage() {
  const [items, setItems] = useState<MasteredListItem[] | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setItems(await listMastered(getDatabase()))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!items) {
    return <AsyncState status="loading" />
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h2 className="text-xl font-semibold">已掌握</h2>
      <p className="text-sm text-ink-soft">
        已掌握的单词不再进入日常复习；恢复学习后会重新参与调度，历史记录不会丢失。
      </p>

      {items.length === 0 ? (
        <AsyncState status="empty" emptyText="还没有标记为已掌握的单词" />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ word }) => (
            <li
              key={word.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-card p-4"
            >
              <div>
                <p className="text-lg font-medium">{word.word}</p>
                <p className="text-sm text-ink-soft">
                  {word.meanings.join('；')}
                </p>
              </div>
              {confirming === word.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void setMastered(
                        getDatabase(),
                        word.id,
                        word.bookId,
                        false,
                      ).then(() => {
                        setConfirming(null)
                        void reload()
                      })
                    }}
                    className="min-h-10 rounded-lg bg-accent px-3 text-sm text-white"
                  >
                    确认恢复
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="min-h-10 rounded-lg border border-line px-3 text-sm"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(word.id)}
                  className="min-h-10 rounded-lg border border-line px-3 text-sm"
                >
                  恢复学习
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
