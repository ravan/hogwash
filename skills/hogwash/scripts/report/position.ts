import type { RawOffset } from '../types.js'

/** 1-based line, 1-based column counted in UTF-16 code units from the line start. */
export type LineColumn = {
  readonly line: number
  readonly column: number
}

/** Offsets of each line start in the raw text, ascending; always begins with 0. */
export type LineIndex = {
  readonly starts: readonly number[]
}

export function buildLineIndex(text: string): LineIndex {
  const starts = [0]
  for (let offset = 0; offset < text.length; offset += 1) {
    if (text[offset] === '\n') starts.push(offset + 1)
  }
  return { starts }
}

export function lineColumnAt(index: LineIndex, offset: RawOffset | number): LineColumn {
  const target = offset < 0 ? 0 : offset
  let low = 0
  let high = index.starts.length - 1
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const start = index.starts[middle]
    if (start !== undefined && start <= target) {
      low = middle
    } else {
      high = middle - 1
    }
  }
  const start = index.starts[low] ?? 0
  return { line: low + 1, column: target - start + 1 }
}
