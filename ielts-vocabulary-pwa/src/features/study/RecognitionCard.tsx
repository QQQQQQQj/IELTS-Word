import { SpeakerHighIcon, StarIcon } from '@phosphor-icons/react'
import type { WordRecord } from '../../db/types'

interface RecognitionCardProps {
  word: WordRecord
  revealed: boolean
  showPhonetic: boolean
  favorite: boolean
  onReveal: () => void
  onSpeak: () => void
  onToggleFavorite: () => void
}

/** Recognition mode: English first, details after an explicit reveal. */
export default function RecognitionCard({
  word,
  revealed,
  showPhonetic,
  favorite,
  onReveal,
  onSpeak,
  onToggleFavorite,
}: RecognitionCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold break-words">{word.word}</p>
          {showPhonetic && word.phonetic ? (
            <p className="mt-1 text-sm text-ink-soft">{word.phonetic}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="播放发音"
            onClick={onSpeak}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
          >
            <SpeakerHighIcon size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={favorite ? '取消收藏' : '收藏'}
            aria-pressed={favorite}
            onClick={onToggleFavorite}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
          >
            <StarIcon
              size={20}
              weight={favorite ? 'fill' : 'regular'}
              aria-hidden="true"
              className={favorite ? 'text-[#c79a2a]' : undefined}
            />
          </button>
        </div>
      </div>

      {revealed ? (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          {word.partOfSpeech ? (
            <p className="text-sm text-ink-soft">{word.partOfSpeech}</p>
          ) : null}
          <ul className="flex flex-col gap-1">
            {word.meanings.map((meaning) => (
              <li key={meaning} className="text-lg">
                {meaning}
              </li>
            ))}
          </ul>
          {word.note ? (
            <p className="text-sm text-ink-soft">备注：{word.note}</p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onReveal}
          className="min-h-12 rounded-xl border border-line bg-paper font-medium"
        >
          显示答案
        </button>
      )}
    </div>
  )
}
