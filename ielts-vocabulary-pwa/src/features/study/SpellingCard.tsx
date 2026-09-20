import { useState, type FormEvent } from 'react'
import { SpeakerHighIcon } from '@phosphor-icons/react'
import type { StudyMode, WordRecord } from '../../db/types'
import {
  compareAnswer,
  type CompareResult,
} from '../../domain/spelling/compare'

interface SpellingCardProps {
  word: WordRecord
  mode: Extract<StudyMode, 'zh-to-en' | 'listening-spelling'>
  revealed: boolean
  showPhonetic: boolean
  onSpeak: () => void
  onReveal: () => void
  /** Called on every submitted attempt with the grading result. */
  onAttempt: (result: CompareResult, answer: string) => void
}

function DiffFeedback({ result }: { result: CompareResult }) {
  return (
    <div aria-label="拼写反馈" className="flex flex-wrap gap-0.5 text-lg">
      {result.parts.map((part, index) => {
        if (part.kind === 'equal') {
          return (
            <span key={index} className="text-accent">
              {part.char}
            </span>
          )
        }
        if (part.kind === 'missing') {
          return (
            <span
              key={index}
              className="text-danger underline decoration-dotted"
              title="缺少字符"
            >
              {part.char}
            </span>
          )
        }
        if (part.kind === 'extra') {
          return (
            <span key={index} className="text-danger line-through" title="多余字符">
              {part.char}
            </span>
          )
        }
        return (
          <span key={index} className="text-danger" title={`应为 ${part.char}`}>
            {part.input ?? part.char}
          </span>
        )
      })}
    </div>
  )
}

/** Shared spelling card for Chinese-to-English and listening dictation. */
export default function SpellingCard({
  word,
  mode,
  revealed,
  showPhonetic,
  onSpeak,
  onReveal,
  onAttempt,
}: SpellingCardProps) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<CompareResult | null>(null)
  const [hintVisible, setHintVisible] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const compared = compareAnswer(word.word, answer)
    setResult(compared)
    onAttempt(compared, answer)
  }

  const showChinese = mode === 'zh-to-en' || hintVisible || revealed

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {showChinese ? (
            <ul className="flex flex-col gap-1">
              {word.meanings.map((meaning) => (
                <li key={meaning} className="text-xl">
                  {meaning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">听发音，拼写这个单词</p>
          )}
          {word.partOfSpeech ? (
            <p className="mt-1 text-sm text-ink-soft">{word.partOfSpeech}</p>
          ) : null}
        </div>
        {mode === 'listening-spelling' ? (
          <button
            type="button"
            aria-label="播放发音"
            onClick={onSpeak}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line"
          >
            <SpeakerHighIcon size={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-3">
        <label htmlFor="spelling-answer" className="text-sm font-medium">
          输入英文
        </label>
        <input
          id="spelling-answer"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="min-h-12 rounded-xl border border-line bg-paper px-4 text-lg"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-12 flex-1 rounded-xl bg-accent font-medium text-white"
          >
            提交
          </button>
          {!revealed ? (
            <button
              type="button"
              onClick={onReveal}
              className="min-h-12 flex-1 rounded-xl border border-line font-medium"
            >
              显示答案
            </button>
          ) : null}
          {mode === 'listening-spelling' && !hintVisible && !revealed ? (
            <button
              type="button"
              onClick={() => setHintVisible(true)}
              className="min-h-12 flex-1 rounded-xl border border-line font-medium"
            >
              显示中文提示
            </button>
          ) : null}
        </div>
      </form>

      {result ? (
        <div className="border-t border-line pt-3">
          <p className={result.correct ? 'text-accent' : 'text-danger'}>
            {result.correct ? '拼写正确' : '拼写有误'}
          </p>
          {!result.correct ? <DiffFeedback result={result} /> : null}
        </div>
      ) : null}

      {revealed ? (
        <div className="border-t border-line pt-3">
          <p className="text-2xl font-semibold">{word.word}</p>
          {showPhonetic && word.phonetic ? (
            <p className="mt-1 text-sm text-ink-soft">{word.phonetic}</p>
          ) : null}
          {word.note ? (
            <p className="mt-1 text-sm text-ink-soft">备注：{word.note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
