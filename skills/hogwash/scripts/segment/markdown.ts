import type { RawOffset, WordCount } from '../types.js'
import { RawOffsetSchema, WordCountSchema } from '../types.js'

/** A pair of raw UTF-16 offsets into the decoded file text (spec §2.1.2). */
export type Span = { readonly start: RawOffset; readonly end: RawOffset }

export type BlockKind = 'heading' | 'paragraph' | 'listItem'
export type Block = Span & { readonly kind: BlockKind }

export type DocumentStructure = {
  readonly codeSpans: readonly Span[]
  readonly blocks: readonly Block[]
}

export const WORD_PATTERN = /[A-Za-z0-9'’]+/g

const FENCE_PATTERN = /^ {0,3}(`{3,}|~{3,})/
const HEADING_PATTERN = /^ {0,3}#{1,6}\s/
const LIST_ITEM_PATTERN = /^ {0,3}([-*+]|\d+\.)\s/
const INLINE_CODE_PATTERN = /`[^`\n]+`/g

type Line = { readonly text: string; readonly start: number; readonly end: number }

const toLines = (text: string): readonly Line[] => {
  const lines: Line[] = []
  let start = 0
  while (start <= text.length) {
    const newline = text.indexOf('\n', start)
    const end = newline === -1 ? text.length : newline + 1
    lines.push({ text: text.slice(start, newline === -1 ? text.length : newline), start, end })
    if (newline === -1) break
    start = end
  }
  return lines
}

const span = (start: number, end: number): Span => ({
  start: RawOffsetSchema.parse(start),
  end: RawOffsetSchema.parse(end),
})

export function segment(text: string): DocumentStructure {
  const lines = toLines(text)
  const codeSpans: Span[] = []
  const blocks: Block[] = []
  let fence: { readonly marker: string; readonly start: number } | null = null
  let paragraph: { start: number; end: number } | null = null

  const closeParagraph = (): void => {
    if (paragraph === null) return
    blocks.push({ ...span(paragraph.start, paragraph.end), kind: 'paragraph' })
    paragraph = null
  }

  for (const line of lines) {
    const fenceMatch = FENCE_PATTERN.exec(line.text)
    if (fence !== null) {
      if (fenceMatch !== null && (fenceMatch[1] ?? '').startsWith(fence.marker[0] ?? '')) {
        if ((fenceMatch[1] ?? '').length >= fence.marker.length) {
          codeSpans.push(span(fence.start, line.end))
          fence = null
        }
      }
      continue
    }
    if (fenceMatch !== null) {
      closeParagraph()
      fence = { marker: fenceMatch[1] ?? '', start: line.start }
      continue
    }
    if (line.text.trim() === '') {
      closeParagraph()
      continue
    }
    if (HEADING_PATTERN.test(line.text)) {
      closeParagraph()
      blocks.push({ ...span(line.start, line.start + line.text.length), kind: 'heading' })
      continue
    }
    if (LIST_ITEM_PATTERN.test(line.text)) {
      closeParagraph()
      blocks.push({ ...span(line.start, line.start + line.text.length), kind: 'listItem' })
      continue
    }
    if (paragraph === null) {
      paragraph = { start: line.start, end: line.start + line.text.length }
    } else {
      paragraph.end = line.start + line.text.length
    }
  }
  if (fence !== null) codeSpans.push(span(fence.start, text.length))
  closeParagraph()

  const fencedSpans = [...codeSpans]
  INLINE_CODE_PATTERN.lastIndex = 0
  let inline = INLINE_CODE_PATTERN.exec(text)
  while (inline !== null) {
    const start = inline.index
    const insideFence = fencedSpans.some((fenced) => start >= fenced.start && start < fenced.end)
    if (!insideFence) codeSpans.push(span(start, start + inline[0].length))
    inline = INLINE_CODE_PATTERN.exec(text)
  }
  codeSpans.sort((left, right) => left.start - right.start)

  return { codeSpans, blocks }
}

export function isInsideCode(structure: DocumentStructure, target: Span): boolean {
  return structure.codeSpans.some((code) => target.start < code.end && code.start < target.end)
}

/** The slice, with every code-span character replaced by a space so raw
 *  offsets survive (spec §2.1.2). */
export function proseSlice(text: string, structure: DocumentStructure, target: Span): string {
  const characters = text.slice(target.start, target.end).split('')
  for (const code of structure.codeSpans) {
    const from = Math.max(code.start, target.start)
    const to = Math.min(code.end, target.end)
    for (let index = from; index < to; index += 1) characters[index - target.start] = ' '
  }
  return characters.join('')
}

export function countProseWords(text: string, structure: DocumentStructure): WordCount {
  let count = 0
  let cursor = 0
  const countIn = (fragment: string): void => {
    WORD_PATTERN.lastIndex = 0
    while (WORD_PATTERN.exec(fragment) !== null) count += 1
  }
  for (const code of structure.codeSpans) {
    if (code.start > cursor) countIn(text.slice(cursor, code.start))
    cursor = Math.max(cursor, code.end)
  }
  countIn(text.slice(cursor))
  return WordCountSchema.parse(count)
}
