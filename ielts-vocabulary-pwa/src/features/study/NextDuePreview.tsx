import { formatInterval } from '../../shared/format'

interface NextDuePreviewProps {
  now: number
  dueAt: number
}

export default function NextDuePreview({ now, dueAt }: NextDuePreviewProps) {
  return (
    <span className="text-[11px] leading-tight text-ink-soft">
      {formatInterval(now, dueAt)}
    </span>
  )
}
