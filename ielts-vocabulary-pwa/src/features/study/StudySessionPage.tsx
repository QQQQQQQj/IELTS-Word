import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getDatabase } from '../../db/database'
import type {
  CardRecord,
  RatingValue,
  SettingsRecord,
  SessionType,
  StudyMode,
  WordRecord,
} from '../../db/types'
import { dateKeyOf } from '../../domain/daily/dateKey'
import {
  getOrCreateDailyPlan,
  remainingPlanWordIds,
} from '../../domain/daily/newPlan'
import { buildReviewQueue } from '../../domain/daily/reviewQueue'
import { createEmptyCardRecord } from '../../domain/fsrs/adapter'
import { reviewCard } from '../../domain/fsrs/reviewService'
import type { CompareResult } from '../../domain/spelling/compare'
import { speechService } from '../../services/audio/SpeechService'
import AsyncState from '../../shared/components/AsyncState'
import RatingControls from './RatingControls'
import RecognitionCard from './RecognitionCard'
import SpellingCard from './SpellingCard'

type SessionStatus = 'loading' | 'error' | 'empty' | 'studying' | 'finished'

interface Attempt {
  answerCorrect?: boolean
  wrongAnswer?: string
}

const KIND_TITLES: Record<string, string> = {
  new: '今日新词',
  review: '今日复习',
  practice: '专项练习',
}

function sessionTypeOf(kind: string, source: string | null): SessionType {
  if (kind === 'practice') {
    return source === 'favorites' ? 'practice-favorites' : 'practice-mistakes'
  }
  return kind === 'new' ? 'new' : 'review'
}

/**
 * Shared session state machine for the three study modes. `kind` decides
 * the queue source: today's fixed new plan, the due review queue, or an
 * explicit word-ID list for dedicated practice.
 */
export default function StudySessionPage() {
  const params = useParams()
  const kind = params.kind ?? 'review'
  const [searchParams] = useSearchParams()
  const modeOverride = searchParams.get('mode')
  const practiceWords = searchParams.get('words')
  const practiceSource = searchParams.get('source')

  const [status, setStatus] = useState<SessionStatus>('loading')
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<SettingsRecord | null>(null)
  const [queue, setQueue] = useState<WordRecord[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [card, setCard] = useState<CardRecord | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [completed, setCompleted] = useState(0)
  const attemptRef = useRef<Attempt>({})
  const sessionIdRef = useRef<string>('')
  const startedAtRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    void (async () => {
      const db = getDatabase()
      const now = Date.now()
      const today = dateKeyOf(now)
      const loadedSettings = await db.settings.get('default')
      if (!loadedSettings) {
        throw new Error('尚未完成初始化设置')
      }
      const bookId = loadedSettings.currentBookId

      let wordIds: string[]
      if (kind === 'practice' && practiceWords) {
        wordIds = practiceWords.split(',').filter(Boolean)
      } else if (kind === 'new') {
        const plan = await getOrCreateDailyPlan(
          db,
          bookId,
          today,
          loadedSettings.dailyNewLimit,
        )
        wordIds = await remainingPlanWordIds(db, plan)
      } else {
        const cards = await db.cards.where('bookId').equals(bookId).toArray()
        const result = buildReviewQueue(cards, {
          now,
          today,
          dailyReviewLimit: loadedSettings.dailyReviewLimit,
        })
        wordIds = result.due.map((item) => item.wordId)
      }

      const rows = await db.words.bulkGet(wordIds)
      const words = rows.filter((row): row is WordRecord => row !== undefined)
      if (cancelled) {
        return
      }

      setSettings(loadedSettings)
      setQueue(words)
      setIndex(0)
      setCompleted(0)
      if (words.length === 0) {
        setStatus('empty')
        return
      }
      const mode = (modeOverride ?? loadedSettings.defaultMode) as StudyMode
      const sessionId = `session-${now.toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`
      sessionIdRef.current = sessionId
      startedAtRef.current = now
      await db.studySessions.put({
        id: sessionId,
        type: sessionTypeOf(kind, practiceSource),
        mode,
        bookId,
        dateKey: today,
        startedAt: now,
        plannedCount: words.length,
        completedCount: 0,
      })
      setStatus('studying')
    })().catch((cause: unknown) => {
      if (!cancelled) {
        setMessage(cause instanceof Error ? cause.message : '学习队列加载失败')
        setStatus('error')
      }
    })
    return () => {
      cancelled = true
      speechService.cancel()
    }
  }, [kind, practiceWords, practiceSource, modeOverride])

  const current = queue[index]
  const mode = (modeOverride ?? settings?.defaultMode ?? 'recognition') as StudyMode

  // Load per-word state: existing card (or an unsaved empty preview) and
  // the favorite flag.
  useEffect(() => {
    if (!current || !settings) {
      return
    }
    let cancelled = false
    const db = getDatabase()
    void (async () => {
      const existing = await db.cards.get(current.id)
      const fav = await db.favorites.get(current.id)
      if (!cancelled) {
        setCard(
          existing ?? createEmptyCardRecord(current.id, current.bookId, Date.now()),
        )
        setFavorite(fav !== undefined)
      }
    })()
    if (
      settings.autoPlayPronunciation &&
      (mode === 'recognition' || mode === 'listening-spelling')
    ) {
      void speechService.speak(current.word, settings.voiceLocale)
    }
    return () => {
      cancelled = true
    }
  }, [current, settings, mode])

  const speakCurrent = useCallback(() => {
    if (current && settings) {
      void speechService.speak(current.word, settings.voiceLocale)
    }
  }, [current, settings])

  const toggleFavorite = useCallback(async () => {
    if (!current) {
      return
    }
    const db = getDatabase()
    const existing = await db.favorites.get(current.id)
    if (existing) {
      await db.favorites.delete(current.id)
      setFavorite(false)
    } else {
      await db.favorites.put({
        id: current.id,
        wordId: current.id,
        bookId: current.bookId,
        createdAt: Date.now(),
      })
      setFavorite(true)
    }
  }, [current])

  const handleAttempt = useCallback((result: CompareResult, answer: string) => {
    attemptRef.current = {
      answerCorrect: result.correct,
      ...(result.correct ? {} : { wrongAnswer: answer }),
    }
    if (result.correct) {
      setRevealed(true)
    }
  }, [])

  async function rate(rating: RatingValue) {
    if (!current) {
      return
    }
    const db = getDatabase()
    const now = Date.now()
    const existing = await db.cards.get(current.id)
    if (!existing) {
      await db.cards.add(createEmptyCardRecord(current.id, current.bookId, now))
    }
    const attempt = attemptRef.current
    await reviewCard(db, current.id, rating, now, mode, {
      ...(attempt.answerCorrect !== undefined
        ? { answerCorrect: attempt.answerCorrect }
        : {}),
      ...(attempt.wrongAnswer !== undefined
        ? { wrongAnswer: attempt.wrongAnswer }
        : {}),
    })
    const done = completed + 1
    await db.studySessions.update(sessionIdRef.current, {
      completedCount: done,
      ...(index + 1 >= queue.length ? { endedAt: now } : {}),
    })
    speechService.cancel()
    attemptRef.current = {}
    setCompleted(done)
    setRevealed(false)
    if (index + 1 >= queue.length) {
      setStatus('finished')
    } else {
      setIndex(index + 1)
    }
  }

  if (status === 'loading') {
    return <AsyncState status="loading" />
  }
  if (status === 'error') {
    return <AsyncState status="error" message={message} />
  }
  if (status === 'empty') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-ink-soft">
          {kind === 'new' ? '今日新词已全部完成' : '当前没有需要复习的单词'}
        </p>
        <Link
          to="/"
          className="flex min-h-12 items-center rounded-xl bg-accent px-6 font-medium text-white"
        >
          返回首页
        </Link>
      </div>
    )
  }
  if (status === 'finished') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <h2 className="text-xl font-semibold">
          {KIND_TITLES[kind] ?? '学习'}完成
        </h2>
        <p className="text-ink-soft">本次共完成 {completed} 个单词</p>
        <Link
          to="/"
          className="flex min-h-12 items-center rounded-xl bg-accent px-6 font-medium text-white"
        >
          返回首页
        </Link>
      </div>
    )
  }
  if (!current || !settings || !card) {
    return <AsyncState status="loading" />
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between text-sm text-ink-soft">
        <span>{KIND_TITLES[kind] ?? '学习'}</span>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>

      {mode === 'recognition' ? (
        <RecognitionCard
          word={current}
          revealed={revealed}
          showPhonetic={settings.showPhonetic}
          favorite={favorite}
          onReveal={() => setRevealed(true)}
          onSpeak={speakCurrent}
          onToggleFavorite={() => void toggleFavorite()}
        />
      ) : (
        <SpellingCard
          key={current.id}
          word={current}
          mode={mode}
          revealed={revealed}
          showPhonetic={settings.showPhonetic}
          onSpeak={speakCurrent}
          onReveal={() => {
            if (attemptRef.current.answerCorrect === undefined) {
              attemptRef.current = { answerCorrect: false }
            }
            setRevealed(true)
          }}
          onAttempt={handleAttempt}
        />
      )}

      {revealed ? (
        <RatingControls
          card={card}
          now={Date.now()}
          onRate={(rating) => void rate(rating)}
        />
      ) : null}
    </div>
  )
}
