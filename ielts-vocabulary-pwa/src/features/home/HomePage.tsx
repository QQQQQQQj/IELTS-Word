import { Link, Navigate, useNavigate } from 'react-router-dom'
import AsyncState from '../../shared/components/AsyncState'
import { useHomeSummary } from './useHomeSummary'

function Metric({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-paper px-3 py-1 text-xs text-ink-soft">
      {text}
    </span>
  )
}

export default function HomePage() {
  const summary = useHomeSummary()
  const navigate = useNavigate()

  if (summary.status === 'loading') {
    return <AsyncState status="loading" />
  }
  if (summary.status === 'error') {
    return (
      <AsyncState
        status="error"
        message={summary.message}
        {...(summary.refresh ? { onRetry: summary.refresh } : {})}
      />
    )
  }

  const data = summary.data
  if (data.needsOnboarding) {
    return <Navigate to="/welcome" replace />
  }

  const maxSeven = Math.max(1, ...data.lastSevenDays)

  return (
    <div className="flex flex-col gap-5 py-2">
      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">今日复习</h2>
          <Metric text={`预计 ${data.reviewEstimateMinutes} 分钟`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Metric text={`到期 ${data.dueCount}`} />
          <Metric text={`逾期 ${data.overdueCount}`} />
          <Metric text={`已完成 ${data.reviewCompletedCount}`} />
          {data.forcedNextDayCount > 0 ? (
            <Metric text={`昨日新词 ${data.forcedNextDayCount}`} />
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => navigate('/study/review')}
          disabled={data.dueCount === 0}
          className="mt-4 min-h-12 w-full rounded-xl bg-accent font-medium text-white disabled:opacity-50"
        >
          开始复习
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">今日新词</h2>
          <span className="text-xs text-ink-soft">{data.currentBookName}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Metric text={`今日计划 ${data.newPlannedCount}`} />
          <Metric text={`新词已完成 ${data.newCompletedCount}`} />
        </div>
        <button
          type="button"
          onClick={() => navigate('/study/new')}
          disabled={data.newCompletedCount >= data.newPlannedCount}
          className="mt-4 min-h-12 w-full rounded-xl bg-ink font-medium text-white disabled:opacity-50"
        >
          开始新词
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">学习概览</h2>
          <Metric text={`连续 ${data.streakDays} 天`} />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          今日总进度{' '}
          <span className="font-medium text-ink">
            {data.todayCompletedCount} / {data.todayTotalCount}
          </span>
        </p>
        <div
          aria-label="最近 7 天学习量"
          role="img"
          className="mt-3 flex h-16 items-end gap-1.5"
        >
          {data.lastSevenDays.map((count, index) => (
            <div
              key={index}
              title={`${count} 次`}
              className="flex-1 rounded-t bg-accent/70"
              style={{ height: `${Math.max(6, (count / maxSeven) * 100)}%` }}
            />
          ))}
        </div>
      </section>

      <nav aria-label="快捷入口" className="grid grid-cols-2 gap-3">
        <Link
          to="/mistakes"
          className="min-h-12 rounded-xl border border-line bg-card p-4 text-center font-medium"
        >
          错词本
        </Link>
        <Link
          to="/favorites"
          className="min-h-12 rounded-xl border border-line bg-card p-4 text-center font-medium"
        >
          收藏本
        </Link>
        <Link
          to="/statistics"
          className="min-h-12 rounded-xl border border-line bg-card p-4 text-center font-medium"
        >
          统计
        </Link>
        <Link
          to="/settings"
          className="min-h-12 rounded-xl border border-line bg-card p-4 text-center font-medium"
        >
          设置
        </Link>
      </nav>
    </div>
  )
}
