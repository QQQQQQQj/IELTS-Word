import Dexie, { type Table } from 'dexie'
import { defineSchema } from './migrations'
import type {
  AppMetaRecord,
  BookRecord,
  CardRecord,
  DailyPlanRecord,
  DailyProgressRecord,
  FavoriteRecord,
  MistakeRecord,
  ReviewLogRecord,
  SettingsRecord,
  StudySessionRecord,
  WordRecord,
} from './types'

export const DATABASE_NAME = 'ielts-word-local'

export class IELTSWordDatabase extends Dexie {
  books!: Table<BookRecord, string>
  words!: Table<WordRecord, string>
  cards!: Table<CardRecord, string>
  reviewLogs!: Table<ReviewLogRecord, string>
  dailyPlans!: Table<DailyPlanRecord, string>
  dailyProgress!: Table<DailyProgressRecord, string>
  settings!: Table<SettingsRecord, string>
  favorites!: Table<FavoriteRecord, string>
  mistakes!: Table<MistakeRecord, string>
  studySessions!: Table<StudySessionRecord, string>
  appMeta!: Table<AppMetaRecord, string>

  constructor(name: string = DATABASE_NAME) {
    super(name)
    defineSchema(this)
  }
}

let sharedDatabase: IELTSWordDatabase | undefined

/** Application-wide singleton database instance. */
export function getDatabase(): IELTSWordDatabase {
  sharedDatabase ??= new IELTSWordDatabase()
  return sharedDatabase
}
