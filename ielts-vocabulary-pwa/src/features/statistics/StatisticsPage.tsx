import { useEffect, useState } from 'react'
import { getDatabase } from '../../db/database'
import {
  calculateStatistics,
  type StatisticsResult,
} from '../../domain/statistics/calculate'
import type { WordRecord } from '../../db/types'
import AsyncState from '../../shared/components/AsyncState'

const RATING_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '完全不会',
  2: '有点模糊',
  3: '认识',
  4: '很简单',
}

function Bars({
  counts,
  label,
}: {
  counts: number[]
  label: string
}) {
  const max = Math.max(1, ...counts)
  return (
    <div aria-label={label} role="img" className="flex h-14 items-end gap-1">
      {counts.map((count, index) => (
        <div
          key={index}
          title={`${count} 次`}
          className="flex-1 rounded-t bg-accent/70"
          style={{ height: `${Math.max(5, (count / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export default function StatisticsPage() {
  const [result, setResult] = useState<StatisticsResult | null>(null)
  const [wordsById, setWordsById] = useState<Map<string, WordRecord>>(new Map())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const db = getDatabase()
      const [logs, cards, mistakes, books] = await Promise.all([
        db.reviewLogs.toArray(),
        db.cards.toArray(),
        db.mistakes.toArray(),
        db.books.toArray(),
      ])
      const stats = calculateStatistics({
        now: Date.now(),
        logs,
        cards,
        mistakes,
        books,
      })
      const missedWords = await db.words.bulkGet(
        stats.mostMissed.map((entry) => entry.wordId),
      )
      if (!cancelled) {
        setWordsById(
          new Map(
            missedWords
              .filter((word): word is WordRecord => word !== undefined)
              .map((word) => [word.id, word]),
          ),
        )
        setResult(stats)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!result) {
    return <AsyncState status="loading" />
  }

  const totalRatings =
    result.ratingDistribution[1] +
    result.ratingDistribution[2] +
    result.ratingDistribution[3] +
    result.ratingDistribution[4]

  return (
    <div className="flex flex-col gap-4 py-2">
      <h2 className="text-xl font-semibold">学习统计</h2>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">今日</h3>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-semibold">{result.todayNewCount}</p>
            <p className="text-xs text-ink-soft">今日新学</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{result.todayReviewCount}</p>
            <p className="text-xs text-ink-soft">今日复习</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">
              {result.todayAccuracy === null
                ? '—'
                : `${Math.round(result.todayAccuracy * 100)}%`}
            </p>
            <p className="text-xs text-ink-soft">
              {result.todayAccuracy === null ? '今日暂无学习' : '今日正确率'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">评分分布</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {([1, 2, 3, 4] as const).map((rating) => {
            const count = result.ratingDistribution[rating]
            const width =
              totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
            return (
              <li key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-ink-soft">
                  {RATING_LABELS[rating]}
                </span>
                <div className="h-3 flex-1 rounded-full bg-paper">
                  <div
                    className="h-3 rounded-full bg-accent/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-8 text-right">{count}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">学习趋势</h3>
          <span className="rounded-full bg-paper px-3 py-1 text-xs text-ink-soft">
            连续 {result.streakDays} 天
          </span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          最近 7 天 {result.last7DayTotal} 次 · 最近 30 天{' '}
          {result.last30DayTotal} 次
        </p>
        <div className="mt-3">
          <Bars counts={result.last7DayCounts} label="最近 7 天学习量" />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">词书进度</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {result.bookProgress.map((book) => (
            <li key={book.bookId}>
              <div className="flex justify-between text-sm">
                <span>{book.name}</span>
                <span className="text-ink-soft">
                  {book.introducedCount} / {book.totalWords}
                  {book.ratio !== null
                    ? `（${Math.round(book.ratio * 100)}%）`
                    : ''}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-paper">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${Math.round((book.ratio ?? 0) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">最常拼错</h3>
        {result.mostMissed.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">暂无拼写错误记录</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {result.mostMissed.map((mistake) => (
              <li
                key={mistake.wordId}
                className="flex justify-between text-sm"
              >
                <span>
                  {wordsById.get(mistake.wordId)?.word ?? mistake.wordId}
                </span>
                <span className="text-ink-soft">
                  错误 {mistake.errorCount} 次
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h3 className="text-base font-semibold">未来 7 天到期</h3>
        <div className="mt-3">
          <Bars
            counts={result.futureDueBuckets.map((bucket) => bucket.count)}
            label="未来 7 天到期卡片"
          />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {result.futureDueBuckets
            .map((bucket) => `${bucket.dateKey.slice(5)} ${bucket.count}`)
            .join(' · ')}
        </p>
      </section>
    </div>
  )
}
