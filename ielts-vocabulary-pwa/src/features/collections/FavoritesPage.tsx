import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDatabase } from '../../db/database'
import type { BookRecord } from '../../db/types'
import AsyncState from '../../shared/components/AsyncState'
import {
  listFavorites,
  toggleFavorite,
  type FavoriteListItem,
} from './collectionService'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<FavoriteListItem[] | null>(null)
  const [books, setBooks] = useState<BookRecord[]>([])
  const [bookFilter, setBookFilter] = useState('')
  const [search, setSearch] = useState('')

  const reload = useCallback(async () => {
    const db = getDatabase()
    setBooks(await db.books.toArray())
    setItems(
      await listFavorites(db, {
        ...(bookFilter ? { bookId: bookFilter } : {}),
        ...(search ? { search } : {}),
      }),
    )
  }, [bookFilter, search])

  useEffect(() => {
    void reload()
  }, [reload])

  if (!items) {
    return <AsyncState status="loading" />
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h2 className="text-xl font-semibold">收藏本</h2>
      <div className="flex gap-2">
        <input
          type="search"
          aria-label="搜索收藏"
          placeholder="搜索单词或释义"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-line bg-card px-3"
        />
        <select
          aria-label="按词书筛选"
          value={bookFilter}
          onChange={(event) => setBookFilter(event.target.value)}
          className="min-h-11 rounded-lg border border-line bg-card px-2"
        >
          <option value="">全部词书</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <AsyncState status="empty" emptyText="还没有收藏的单词" />
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/study/practice?source=favorites&words=${items
                  .map((item) => item.word.id)
                  .join(',')}`,
              )
            }
            className="min-h-12 rounded-xl bg-accent font-medium text-white"
          >
            练习全部收藏
          </button>
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
                <button
                  type="button"
                  onClick={() => {
                    void toggleFavorite(
                      getDatabase(),
                      word.id,
                      word.bookId,
                    ).then(reload)
                  }}
                  className="min-h-10 rounded-lg border border-line px-3 text-sm"
                >
                  取消收藏
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
