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

export function proseWords(prose: string): readonly string[] {
  WORD_PATTERN.lastIndex = 0
  return prose.match(WORD_PATTERN) ?? []
}
