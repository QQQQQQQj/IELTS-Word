interface AsyncStateProps {
  status: 'loading' | 'error' | 'empty'
  message?: string
  emptyText?: string
  onRetry?: () => void
}

/** Unified loading / error / empty display used by every route. */
export default function AsyncState({
  status,
  message,
  emptyText,
  onRetry,
}: AsyncStateProps) {
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-ink-soft">
        <div
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
        />
        <p>加载中…</p>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16">
        <p className="text-danger">{message ?? '出现了一个错误'}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-lg bg-accent px-6 text-white"
          >
            重试
          </button>
        ) : null}
      </div>
    )
  }
  return (
    <div className="py-16 text-center text-ink-soft">
      <p>{emptyText ?? '暂无内容'}</p>
    </div>
  )
}
