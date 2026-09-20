export type DiffKind = 'equal' | 'replace' | 'missing' | 'extra'

export interface DiffPart {
  kind: DiffKind
  /** The expected character (for `extra` the typed character). */
  char: string
  /** The typed character for `replace` parts. */
  input?: string
}

export interface CompareResult {
  correct: boolean
  parts: DiffPart[]
}

/** NFKC, trimmed, single-spaced and lowercased for comparison. */
export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').trim().split(/\s+/).join(' ').toLowerCase()
}

/**
 * Independent character diff over Unicode code points using Levenshtein
 * dynamic programming. Emits `equal`, `replace`, `missing` (expected char
 * the user did not type) and `extra` (typed char that does not belong).
 */
export function compareAnswer(expected: string, answer: string): CompareResult {
  const target = Array.from(normalizeAnswer(expected))
  const typed = Array.from(normalizeAnswer(answer))
  const rows = target.length + 1
  const cols = typed.length + 1

  const cost: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  )
  for (let row = 0; row < rows; row += 1) {
    const line = cost[row]
    if (line) {
      line[0] = row
    }
  }
  const firstLine = cost[0]
  if (firstLine) {
    for (let col = 0; col < cols; col += 1) {
      firstLine[col] = col
    }
  }
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const substitution =
        (cost[row - 1]?.[col - 1] ?? 0) +
        (target[row - 1] === typed[col - 1] ? 0 : 1)
      const deletion = (cost[row - 1]?.[col] ?? 0) + 1
      const insertion = (cost[row]?.[col - 1] ?? 0) + 1
      const line = cost[row]
      if (line) {
        line[col] = Math.min(substitution, deletion, insertion)
      }
    }
  }

  const parts: DiffPart[] = []
  let row = rows - 1
  let col = cols - 1
  while (row > 0 || col > 0) {
    const current = cost[row]?.[col] ?? 0
    const diagonal = row > 0 && col > 0 ? (cost[row - 1]?.[col - 1] ?? 0) : Infinity
    const up = row > 0 ? (cost[row - 1]?.[col] ?? 0) : Infinity
    const left = col > 0 ? (cost[row]?.[col - 1] ?? 0) : Infinity
    const expectedChar = target[row - 1] ?? ''
    const typedChar = typed[col - 1] ?? ''

    if (row > 0 && col > 0 && diagonal <= up && diagonal <= left) {
      if (expectedChar === typedChar && current === diagonal) {
        parts.push({ kind: 'equal', char: expectedChar })
      } else {
        parts.push({ kind: 'replace', char: expectedChar, input: typedChar })
      }
      row -= 1
      col -= 1
    } else if (row > 0 && up <= left) {
      parts.push({ kind: 'missing', char: expectedChar })
      row -= 1
    } else {
      parts.push({ kind: 'extra', char: typedChar })
      col -= 1
    }
  }
  parts.reverse()

  const correct = parts.every((part) => part.kind === 'equal')
  return { correct, parts }
}
