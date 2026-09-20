export type StudyMode = 'recognition' | 'zh-to-en' | 'listening-spelling'
export type ThemePreference = 'light' | 'dark' | 'system'
export type VoiceLocale = 'en-GB' | 'en-US'
export type RatingValue = 1 | 2 | 3 | 4
export type SessionType =
  | 'new'
  | 'review'
  | 'practice-mistakes'
  | 'practice-favorites'

export interface BookRecord {
  id: string
  name: string
  description: string
  totalWords: number
  enabled: boolean
  version: number
  createdAt: number
}

export interface WordRecord {
  id: string
  bookId: string
  sourceOrder: number
  sourceGroup: string
  word: string
  normalizedWord: string
  phonetic?: string
  partOfSpeech?: string
  meanings: string[]
  note?: string
  tags?: string[]
}

export interface CardRecord {
  id: string
  wordId: string
  bookId: string
  state: number
  dueAt: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  lastReviewAt?: number
  /** Local date key (YYYY-MM-DD) of the first time this word was studied. */
  introducedOn?: string
  firstLearnedAt?: number
  /** Set once the mandatory next-day formal review has been completed. */
  firstNextDayReviewAt?: number
  lastMode?: StudyMode
  suspended: boolean
  mastered: boolean
  createdAt: number
  updatedAt: number
  version: number
}

export interface ReviewLogRecord {
  id: string
  cardId: string
  wordId: string
  bookId: string
  mode: StudyMode
  rating: RatingValue
  reviewedAt: number
  /** Local date key (YYYY-MM-DD) of the review moment. */
  studyDate: string
  previousDueAt?: number
  nextDueAt: number
  elapsedDays: number
  scheduledDays: number
  stateBefore: number
  stateAfter: number
  stability: number
  difficulty: number
  durationMs?: number
  answerCorrect?: boolean
  timezoneOffsetMinutes: number
  isNewIntroduction: boolean
}

export interface DailyPlanRecord {
  /** `${bookId}:${dateKey}` */
  id: string
  bookId: string
  dateKey: string
  wordIds: string[]
  createdAt: number
}

export interface DailyProgressRecord {
  /** `${bookId}:${dateKey}` */
  id: string
  bookId: string
  dateKey: string
  newCompletedIds: string[]
  reviewCompletedCount: number
  updatedAt: number
}

export interface SettingsRecord {
  id: 'default'
  currentBookId: string
  dailyNewLimit: number
  dailyReviewLimit: number
  defaultMode: StudyMode
  autoPlayPronunciation: boolean
  voiceLocale: VoiceLocale
  showPhonetic: boolean
  reviewFirst: boolean
  theme: ThemePreference
  schemaVersion: number
  lastExportedAt?: number
  installPromptDismissed: boolean
}

export interface FavoriteRecord {
  /** Same as wordId; one favorite per word. */
  id: string
  wordId: string
  bookId: string
  createdAt: number
}

export interface MistakeRecord {
  /** Same as wordId; one aggregate per word. */
  id: string
  wordId: string
  bookId: string
  errorCount: number
  lastErrorAt: number
  lastAnswer?: string
  createdAt: number
  updatedAt: number
}

export interface StudySessionRecord {
  id: string
  type: SessionType
  mode: StudyMode
  bookId: string
  dateKey: string
  startedAt: number
  endedAt?: number
  plannedCount: number
  completedCount: number
}

export interface AppMetaRecord {
  id: 'app'
  schemaVersion: number
  appVersion: string
  vocabularyVersion: number
  onboardingCompleted: boolean
}
