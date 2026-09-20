import type { BookRecord, WordRecord } from '../../db/types'

export const VOCABULARY_VERSION = 1

export interface BookManifestEntry {
  id: string
  name: string
  description: string
  url: URL
}

export const BOOK_MANIFEST: BookManifestEntry[] = [
  {
    id: 'ielts-toefl-basic',
    name: '雅思·托福基础词汇',
    description: '一叶留学教育基础词汇，20 个 Day，1997 词条',
    url: new URL('./ielts-toefl-basic.json', import.meta.url),
  },
  {
    id: 'ielts-listening-spelling',
    name: '雅思听力拼写词汇',
    description: '一叶留学教育听力拼写词汇，主表与增补共 2497 词条',
    url: new URL('./ielts-listening-spelling.json', import.meta.url),
  },
]

async function loadBookWords(entry: BookManifestEntry): Promise<WordRecord[]> {
  const response = await fetch(entry.url)
  if (!response.ok) {
    throw new Error(`词库加载失败：${entry.id} (HTTP ${response.status})`)
  }
  const rows = (await response.json()) as WordRecord[]
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`词库内容为空：${entry.id}`)
  }
  return rows
}

export interface LoadedVocabulary {
  version: number
  books: BookRecord[]
  words: WordRecord[]
}

/** Fetches both bundled vocabulary JSON assets and builds seed records. */
export async function loadVocabulary(now: number): Promise<LoadedVocabulary> {
  const books: BookRecord[] = []
  const words: WordRecord[] = []
  for (const entry of BOOK_MANIFEST) {
    const rows = await loadBookWords(entry)
    books.push({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      totalWords: rows.length,
      enabled: true,
      version: VOCABULARY_VERSION,
      createdAt: now,
    })
    words.push(...rows)
  }
  return { version: VOCABULARY_VERSION, books, words }
}
