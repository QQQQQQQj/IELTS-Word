import { describe, expect, it } from 'vitest'
import {
  compareAnswer,
  normalizeAnswer,
} from '../../src/domain/spelling/compare'

describe('normalizeAnswer', () => {
  it('applies NFKC, trims and lowercases', () => {
    expect(normalizeAnswer('  AcCommodation  ')).toBe('accommodation')
    expect(normalizeAnswer('ｃａｆé')).toBe('café')
    expect(normalizeAnswer('Zoom  Lens')).toBe('zoom lens')
  })
})

describe('compareAnswer', () => {
  it('accepts case and whitespace differences only', () => {
    expect(compareAnswer('apple', ' Apple ').correct).toBe(true)
    expect(compareAnswer('zoom lens', 'zoom lens').correct).toBe(true)
  })

  it('rejects a different spelling variant', () => {
    expect(compareAnswer('colour', 'color').correct).toBe(false)
  })

  it('marks a missing character', () => {
    const result = compareAnswer('apple', 'appl')
    expect(result.correct).toBe(false)
    expect(result.parts).toContainEqual(
      expect.objectContaining({ kind: 'missing', char: 'e' }),
    )
  })

  it('marks an extra character', () => {
    const result = compareAnswer('apple', 'appole')
    expect(result.correct).toBe(false)
    expect(result.parts).toContainEqual(
      expect.objectContaining({ kind: 'extra', char: 'o' }),
    )
  })

  it('marks a replaced character with the expected value', () => {
    const result = compareAnswer('apple', 'appla')
    expect(result.correct).toBe(false)
    expect(result.parts).toContainEqual(
      expect.objectContaining({ kind: 'replace', char: 'e', input: 'a' }),
    )
  })

  it('keeps equal characters in order', () => {
    const result = compareAnswer('cat', 'cat')
    expect(result.parts).toEqual([
      { kind: 'equal', char: 'c' },
      { kind: 'equal', char: 'a' },
      { kind: 'equal', char: 't' },
    ])
  })
})
