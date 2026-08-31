import { buildLineIndex, lineColumnAt } from '../report/position.js'
import { segment } from '../segment/markdown.js'

export type DiffSegmentKind = 'same' | 'removed' | 'added'
export type DiffSegment = { readonly kind: DiffSegmentKind; readonly text: string }

/** One changed passage: the original block beside its revision, word-diffed. */
export type Hunk = {
  /** 1-based line range of the passage in the original document. */
  readonly lineStart: number
  readonly lineEnd: number
  /** Nearest heading above the passage in the original document. */
  readonly section: string | null
  readonly original: readonly DiffSegment[]
  readonly revised: readonly DiffSegment[]
}

const tokenize = (text: string): string[] => text.split(/(\s+)/).filter((token) => token !== '')

const isWhitespace = (token: string): boolean => /^\s+$/.test(token)

/** LCS lengths for every suffix pair, row-major over (a.length+1)×(b.length+1). */
const lcsTable = (a: readonly string[], b: readonly string[]): Uint32Array => {
  const cols = b.length + 1
  const table = new Uint32Array((a.length + 1) * cols)
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * cols + j] =
        a[i] === b[j]
          ? (table[(i + 1) * cols + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * cols + j] ?? 0, table[i * cols + j + 1] ?? 0)
    }
  }
  return table
}

const MAX_CELLS = 1_000_000

/** Word-level diff of one passage pair; whitespace tokens keep their exact text. */
export function diffTokens(
  original: string,
  revised: string,
): { original: DiffSegment[]; revised: DiffSegment[] } {
  const a = tokenize(original)
  const b = tokenize(revised)
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) {
    return {
      original: [{ kind: 'removed', text: original }],
      revised: [{ kind: 'added', text: revised }],
    }
  }
  const cols = b.length + 1
  const table = lcsTable(a, b)
  const originalSegments: DiffSegment[] = []
  const revisedSegments: DiffSegment[] = []
  const push = (list: DiffSegment[], kind: DiffSegmentKind, text: string): void => {
    const last = list[list.length - 1]
    if (last === undefined || last.kind !== kind) {
      list.push({ kind, text })
    } else {
      list[list.length - 1] = { kind, text: last.text + text }
    }
  }
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const left = a[i] ?? ''
    const right = b[j] ?? ''
    if (left === right) {
      push(originalSegments, 'same', left)
      push(revisedSegments, 'same', right)
      i += 1
      j += 1
    } else if ((table[(i + 1) * cols + j] ?? 0) >= (table[i * cols + j + 1] ?? 0)) {
      push(originalSegments, 'removed', left)
      i += 1
    } else {
      push(revisedSegments, 'added', right)
      j += 1
    }
  }
  for (; i < a.length; i += 1) push(originalSegments, 'removed', a[i] ?? '')
  for (; j < b.length; j += 1) push(revisedSegments, 'added', b[j] ?? '')
  const wordCount = (tokens: readonly string[]): number =>
    tokens.filter((token) => !isWhitespace(token)).length
  const sameWords = originalSegments
    .filter((part) => part.kind === 'same')
    .reduce((total, part) => total + wordCount(tokenize(part.text)), 0)
  const most = Math.max(wordCount(a), wordCount(b))
  const least = Math.max(1, Math.min(wordCount(a), wordCount(b)))
  if (most > 8 && sameWords / least < 0.4) {
    return {
      original: [{ kind: 'removed', text: original }],
      revised: [{ kind: 'added', text: revised }],
    }
  }
  return {
    original: absorbWhitespace(originalSegments, 'removed'),
    revised: absorbWhitespace(revisedSegments, 'added'),
  }
}

/** Fold whitespace runs between two changed segments into one continuous mark. */
const absorbWhitespace = (
  segments: readonly DiffSegment[],
  kind: DiffSegmentKind,
): DiffSegment[] => {
  const output: DiffSegment[] = []
  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index]
    if (current === undefined) continue
    const previous = output[output.length - 1]
    const next = segments[index + 1]
    if (
      current.kind === 'same' &&
      isWhitespace(current.text) &&
      previous !== undefined &&
      previous.kind === kind &&
      next !== undefined &&
      next.kind === kind
    ) {
      output[output.length - 1] = { kind, text: previous.text + current.text + next.text }
      index += 1
    } else if (previous !== undefined && previous.kind === current.kind) {
      output[output.length - 1] = { kind: current.kind, text: previous.text + current.text }
    } else {
      output.push(current)
    }
  }
  return output
}

type RawBlock = {
  readonly start: number
  readonly end: number
  readonly kind: 'heading' | 'paragraph' | 'listItem' | 'code'
  readonly text: string
}

/** Every prose block plus each top-level code fence, in document order. */
const blocksOf = (text: string): RawBlock[] => {
  const structure = segment(text)
  const fences = structure.codeSpans.filter(
    (code) => !structure.blocks.some((block) => code.start >= block.start && code.end <= block.end),
  )
  return [
    ...structure.blocks.map((block) => ({
      start: block.start,
      end: block.end,
      kind: block.kind,
      text: text.slice(block.start, block.end),
    })),
    ...fences.map((code) => ({
      start: code.start,
      end: code.end,
      kind: 'code' as const,
      text: text.slice(code.start, code.end),
    })),
  ].sort((left, right) => left.start - right.start)
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Prose blocks flow as one line; code fences keep their line structure. */
const displayText = (block: RawBlock): string =>
  block.kind === 'code' ? block.text : normalize(block.text)

const HEADING_MARKUP = /^ {0,3}#{1,6}\s+/

const headingText = (raw: string): string =>
  raw
    .replace(HEADING_MARKUP, '')
    .replace(/\s*#+\s*$/, '')
    .trim()

/** Index pairs of one longest common subsequence, in order. */
const lcsPairs = (a: readonly string[], b: readonly string[]): [number, number][] => {
  const cols = b.length + 1
  const table = lcsTable(a, b)
  const pairs: [number, number][] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j])
      i += 1
      j += 1
    } else if ((table[(i + 1) * cols + j] ?? 0) >= (table[i * cols + j + 1] ?? 0)) {
      i += 1
    } else {
      j += 1
    }
  }
  return pairs
}

/** Align original and revised blocks on unchanged anchors, word-diff each changed pair. */
export function computeHunks(originalText: string, revisedText: string): Hunk[] {
  const a = blocksOf(originalText)
  const b = blocksOf(revisedText)
  const lines = buildLineIndex(originalText)
  const anchors = lcsPairs(
    a.map((block) => normalize(block.text)),
    b.map((block) => normalize(block.text)),
  )
  const hunks: Hunk[] = []
  let section: string | null = null
  let lastLine = 1
  const lineRange = (block: RawBlock): { lineStart: number; lineEnd: number } => ({
    lineStart: lineColumnAt(lines, block.start).line,
    lineEnd: lineColumnAt(lines, Math.max(block.start, block.end - 1)).line,
  })
  const consume = (block: RawBlock): void => {
    if (block.kind === 'heading') section = headingText(block.text)
    lastLine = lineRange(block).lineEnd
  }
  let nextA = 0
  let nextB = 0
  for (const [anchorA, anchorB] of [...anchors, [a.length, b.length] as [number, number]]) {
    const removed = a.slice(nextA, anchorA)
    const added = b.slice(nextB, anchorB)
    for (let k = 0; k < removed.length || k < added.length; k += 1) {
      const oldBlock = removed[k]
      const newBlock = added[k]
      if (oldBlock !== undefined && newBlock !== undefined) {
        const diff = diffTokens(displayText(oldBlock), displayText(newBlock))
        hunks.push({
          ...lineRange(oldBlock),
          section,
          original: diff.original,
          revised: diff.revised,
        })
        consume(oldBlock)
      } else if (oldBlock !== undefined) {
        hunks.push({
          ...lineRange(oldBlock),
          section,
          original: [{ kind: 'removed', text: displayText(oldBlock) }],
          revised: [],
        })
        consume(oldBlock)
      } else if (newBlock !== undefined) {
        hunks.push({
          lineStart: lastLine,
          lineEnd: lastLine,
          section,
          original: [],
          revised: [{ kind: 'added', text: displayText(newBlock) }],
        })
      }
    }
    const anchorBlock = a[anchorA]
    if (anchorBlock !== undefined) consume(anchorBlock)
    nextA = anchorA + 1
    nextB = anchorB + 1
  }
  return hunks
}
