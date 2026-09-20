import { z } from 'zod'

const MAX_RECORDS = 200_000

const epochMs = z.number().finite().int().nonnegative()
const nonEmptyString = z.string().min(1).max(200)
const studyMode = z.enum(['recognition', 'zh-to-en', 'listening-spelling'])
const rating = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])

const cardSchema = z.strictObject({
  id: nonEmptyString,
  wordId: nonEmptyString,
  bookId: nonEmptyString,
  state: z.number().int().min(0).max(3),
  dueAt: epochMs,
  stability: z.number().finite().nonnegative(),
  difficulty: z.number().finite().nonnegative(),
  elapsedDays: z.number().finite(),
  scheduledDays: z.number().finite(),
  learningSteps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  lastReviewAt: epochMs.optional(),
  introducedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  firstLearnedAt: epochMs.optional(),
  firstNextDayReviewAt: epochMs.optional(),
  lastMode: studyMode.optional(),
  suspended: z.boolean(),
  mastered: z.boolean(),
  createdAt: epochMs,
  updatedAt: epochMs,
  version: z.number().int().positive(),
})

const reviewLogSchema = z.strictObject({
  id: nonEmptyString,
  cardId: nonEmptyString,
  wordId: nonEmptyString,
  bookId: nonEmptyString,
  mode: studyMode,
  rating,
  reviewedAt: epochMs,
  studyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  previousDueAt: epochMs.optional(),
  nextDueAt: epochMs,
  elapsedDays: z.number().finite(),
  scheduledDays: z.number().finite(),
  stateBefore: z.number().int().min(0).max(3),
  stateAfter: z.number().int().min(0).max(3),
  stability: z.number().finite().nonnegative(),
  difficulty: z.number().finite().nonnegative(),
  durationMs: z.number().finite().nonnegative().optional(),
  answerCorrect: z.boolean().optional(),
  timezoneOffsetMinutes: z.number().finite().int(),
  isNewIntroduction: z.boolean(),
})

const dailyPlanSchema = z.strictObject({
  id: nonEmptyString,
  bookId: nonEmptyString,
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wordIds: z.array(nonEmptyString).max(MAX_RECORDS),
  createdAt: epochMs,
})

const dailyProgressSchema = z.strictObject({
  id: nonEmptyString,
  bookId: nonEmptyString,
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newCompletedIds: z.array(nonEmptyString).max(MAX_RECORDS),
  reviewCompletedCount: z.number().int().nonnegative(),
  updatedAt: epochMs,
})

const settingsSchema = z.strictObject({
  id: z.literal('default'),
  currentBookId: nonEmptyString,
  dailyNewLimit: z.number().int().min(1).max(500),
  dailyReviewLimit: z.number().int().min(1).max(5000),
  defaultMode: studyMode,
  autoPlayPronunciation: z.boolean(),
  voiceLocale: z.enum(['en-GB', 'en-US']),
  showPhonetic: z.boolean(),
  reviewFirst: z.boolean(),
  theme: z.enum(['light', 'dark', 'system']),
  schemaVersion: z.number().int().positive(),
  lastExportedAt: epochMs.optional(),
  installPromptDismissed: z.boolean(),
})

const favoriteSchema = z.strictObject({
  id: nonEmptyString,
  wordId: nonEmptyString,
  bookId: nonEmptyString,
  createdAt: epochMs,
})

const mistakeSchema = z.strictObject({
  id: nonEmptyString,
  wordId: nonEmptyString,
  bookId: nonEmptyString,
  errorCount: z.number().int().nonnegative(),
  lastErrorAt: epochMs,
  lastAnswer: z.string().max(200).optional(),
  createdAt: epochMs,
  updatedAt: epochMs,
})

const studySessionSchema = z.strictObject({
  id: nonEmptyString,
  type: z.enum([
    'new',
    'review',
    'practice-mistakes',
    'practice-favorites',
  ]),
  mode: studyMode,
  bookId: nonEmptyString,
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: epochMs,
  endedAt: epochMs.optional(),
  plannedCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
})

/** Supported backup schema versions. */
export const SUPPORTED_BACKUP_VERSIONS = [1] as const

export const backupSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .refine(
      (value) =>
        (SUPPORTED_BACKUP_VERSIONS as readonly number[]).includes(value),
      { message: '备份文件版本不受支持' },
    ),
  appVersion: nonEmptyString,
  dbSchemaVersion: z.number().int().positive(),
  exportedAt: epochMs,
  settings: settingsSchema.nullable(),
  cards: z.array(cardSchema).max(MAX_RECORDS),
  reviewLogs: z.array(reviewLogSchema).max(MAX_RECORDS),
  dailyPlans: z.array(dailyPlanSchema).max(MAX_RECORDS),
  dailyProgress: z.array(dailyProgressSchema).max(MAX_RECORDS),
  favorites: z.array(favoriteSchema).max(MAX_RECORDS),
  mistakes: z.array(mistakeSchema).max(MAX_RECORDS),
  studySessions: z.array(studySessionSchema).max(MAX_RECORDS),
})

export type ParsedBackup = z.infer<typeof backupSchema>

/** Strictly validates untrusted JSON; throws with the first clear error. */
export function parseBackup(value: unknown): ParsedBackup {
  const result = backupSchema.safeParse(value)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path.join('.') ?? ''
    throw new Error(
      `备份文件无效：${path ? `${path} ` : ''}${first?.message ?? '格式不正确'}`,
    )
  }
  return result.data
}
