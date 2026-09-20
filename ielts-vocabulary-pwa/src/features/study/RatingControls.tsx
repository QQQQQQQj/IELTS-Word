import type { CardRecord, RatingValue } from '../../db/types'
import { previewSchedule } from '../../domain/fsrs/adapter'
import NextDuePreview from './NextDuePreview'

const RATING_LABELS: { rating: RatingValue; label: string; tone: string }[] = [
  { rating: 1, label: '完全不会', tone: 'bg-danger' },
  { rating: 2, label: '有点模糊', tone: 'bg-[#a8842c]' },
  { rating: 3, label: '认识', tone: 'bg-accent' },
  { rating: 4, label: '很简单', tone: 'bg-ink' },
]

interface RatingControlsProps {
  card: CardRecord
  now: number
  disabled?: boolean
  onRate: (rating: RatingValue) => void
}

/** Four FSRS rating buttons with the projected next interval under each. */
export default function RatingControls({
  card,
  now,
  disabled = false,
  onRate,
}: RatingControlsProps) {
  const preview = previewSchedule(card, now)
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATING_LABELS.map(({ rating, label, tone }) => (
        <button
          key={rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(rating)}
          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-sm font-medium text-white disabled:opacity-50 ${tone}`}
        >
          {label}
          <NextDuePreview now={now} dueAt={preview[rating].dueAt} />
        </button>
      ))}
    </div>
  )
}
