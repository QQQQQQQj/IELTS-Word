import type { IELTSWordDatabase } from '../../db/database'
import type {
  CardRecord,
  FavoriteRecord,
  MistakeRecord,
  WordRecord,
} from '../../db/types'
import { createEmptyCardRecord } from '../../domain/fsrs/adapter'

export interface MistakeListItem {
  mistake: MistakeRecord
  word: WordRecord
  card?: CardRecord
}

/** Mistakes sorted by error count, optionally filtered by book. */
export async function listMistakes(
  db: IELTSWordDatabase,
  bookId?: string,
): Promise<MistakeListItem[]> {
  let mistakes = await db.mistakes.toArray()
  if (bookId) {
    mistakes = mistakes.filter((mistake) => mistake.bookId === bookId)
  }
  mistakes.sort(
    (first, second) =>
      second.errorCount - first.errorCount ||
      second.lastErrorAt - first.lastErrorAt,
  )
  const words = await db.words.bulkGet(mistakes.map((entry) => entry.wordId))
  const cards = await db.cards.bulkGet(mistakes.map((entry) => entry.wordId))
  return mistakes.flatMap((mistake, index) => {
    const word = words[index]
    if (!word) {
      return []
    }
    const card = cards[index]
    return [{ mistake, word, ...(card ? { card } : {}) }]
  })
}

/** Deletes only the mistake aggregate; card and history stay intact. */
export async function removeMistake(
  db: IELTSWordDatabase,
  wordId: string,
): Promise<void> {
  await db.mistakes.delete(wordId)
}

export interface FavoriteListItem {
  favorite: FavoriteRecord
  word: WordRecord
}

export async function listFavorites(
  db: IELTSWordDatabase,
  options: { bookId?: string; search?: string } = {},
): Promise<FavoriteListItem[]> {
  let favorites = await db.favorites.toArray()
  if (options.bookId) {
    favorites = favorites.filter((entry) => entry.bookId === options.bookId)
  }
  favorites.sort((first, second) => second.createdAt - first.createdAt)
  const words = await db.words.bulkGet(favorites.map((entry) => entry.wordId))
  let items = favorites.flatMap((favorite, index) => {
    const word = words[index]
    return word ? [{ favorite, word }] : []
  })
  if (options.search) {
    const needle = options.search.trim().toLowerCase()
    items = items.filter(
      (item) =>
        item.word.normalizedWord.includes(needle) ||
        item.word.meanings.some((meaning) => meaning.includes(needle)),
    )
  }
  return items
}

/** Adds or removes a favorite; returns the new state. */
export async function toggleFavorite(
  db: IELTSWordDatabase,
  wordId: string,
  bookId: string,
): Promise<boolean> {
  return db.transaction('rw', db.favorites, async () => {
    const existing = await db.favorites.get(wordId)
    if (existing) {
      await db.favorites.delete(wordId)
      return false
    }
    await db.favorites.put({
      id: wordId,
      wordId,
      bookId,
      createdAt: Date.now(),
    })
    return true
  })
}

export interface MasteredListItem {
  card: CardRecord
  word: WordRecord
}

export async function listMastered(
  db: IELTSWordDatabase,
  bookId?: string,
): Promise<MasteredListItem[]> {
  let cards = (await db.cards.toArray()).filter((card) => card.mastered)
  if (bookId) {
    cards = cards.filter((card) => card.bookId === bookId)
  }
  cards.sort((first, second) => second.updatedAt - first.updatedAt)
  const words = await db.words.bulkGet(cards.map((card) => card.wordId))
  return cards.flatMap((card, index) => {
    const word = words[index]
    return word ? [{ card, word }] : []
  })
}

/**
 * Marks or restores mastery. Review history is never deleted; restoring
 * simply lets the card re-enter the normal review queue.
 */
export async function setMastered(
  db: IELTSWordDatabase,
  wordId: string,
  bookId: string,
  mastered: boolean,
): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    const existing = await db.cards.get(wordId)
    const now = Date.now()
    if (existing) {
      await db.cards.update(wordId, { mastered, updatedAt: now })
    } else if (mastered) {
      await db.cards.put({
        ...createEmptyCardRecord(wordId, bookId, now),
        mastered: true,
      })
    }
  })
}
