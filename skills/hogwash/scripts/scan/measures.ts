import { WORD_PATTERN } from '../segment/markdown.js'

const CONTRACTION_PATTERN = /[A-Za-z][’'][A-Za-z]/

export function coefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

export function typeTokenRatio(words: readonly string[], window: number): number {
  if (words.length === 0) return 0
  const width = Math.min(window, words.length)
  let total = 0
  let windows = 0
  for (let index = 0; index + width <= words.length; index += 1) {
    const distinct = new Set(words.slice(index, index + width).map((word) => word.toLowerCase()))
    total += distinct.size / width
    windows += 1
  }
  return total / windows
}

export function contractionRate(words: readonly string[]): number {
  if (words.length === 0) return 0
  const hits = words.filter((word) => CONTRACTION_PATTERN.test(word)).length
  return (hits * 100) / words.length
}

export function punctuationDensity(prose: string, wordCount: number): number {
  if (wordCount === 0) return 0
  let hits = 0
  for (const character of prose) {
    if (character === '—' || character === ';') hits += 1
  }
  return (hits * 100) / wordCount
}

/** Share of sentence openers that repeat an earlier opener in the same
 *  paragraph: 1 - distinct/total, case-insensitive. 0 when every sentence
 *  starts differently; approaches 1 as one opener takes over. */
export function repeatedOpenerShare(openers: readonly string[]): number {
  if (openers.length === 0) return 0
  const distinct = new Set(openers.map((opener) => opener.toLowerCase())).size
  return (openers.length - distinct) / openers.length
}

/** Grammatical shape of a heading for parallelism checks: '?' for questions,
 *  'ing' when the opener is an -ing form, otherwise the opener itself,
 *  case-insensitive. Null when the heading has no words. */
export function headingShape(prose: string): string | null {
  const first = proseWords(prose)[0]
  if (first === undefined) return null
  if (prose.trimEnd().endsWith('?')) return '?'
  const opener = first.toLowerCase()
  return opener.length > 4 && opener.endsWith('ing') ? 'ing' : opener
}

export function proseWords(prose: string): readonly string[] {
  WORD_PATTERN.lastIndex = 0
  return prose.match(WORD_PATTERN) ?? []
}
