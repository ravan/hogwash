import { describe, expect, it } from 'bun:test'
import {
  countProseWords,
  isInsideCode,
  proseSlice,
  segment,
} from '../../../skills/hogwash/scripts/segment/markdown.js'
import { RawOffsetSchema } from '../../../skills/hogwash/scripts/types.js'

const document = '# Title\n\nSome prose with `inline` code.\n\n```py\ndelve\n```\n\nTail.\n'

const span = (start: number, end: number) => ({
  start: RawOffsetSchema.parse(start),
  end: RawOffsetSchema.parse(end),
})

const slices = (text: string, spans: readonly { start: number; end: number }[]): string[] =>
  spans.map((entry) => text.slice(entry.start, entry.end))

describe('segment', () => {
  const structure = segment(document)

  it('finds the inline span and the fenced span', () => {
    expect(structure.codeSpans).toHaveLength(2)
    const [inline, fenced] = structure.codeSpans
    if (inline === undefined || fenced === undefined) throw new Error('missing code span')
    expect(document.slice(inline.start, inline.end)).toBe('`inline`')
    expect(fenced.start).toBe(document.indexOf('```py'))
    const fencedText = document.slice(fenced.start, fenced.end)
    expect(fencedText).toContain('delve')
    expect(fencedText.startsWith('```py')).toBe(true)
    expect(fencedText.trimEnd().endsWith('```')).toBe(true)
  })

  it('finds the heading and the prose paragraphs', () => {
    const headings = structure.blocks.filter((block) => block.kind === 'heading')
    const paragraphs = structure.blocks.filter((block) => block.kind === 'paragraph')
    expect(slices(document, headings)).toEqual(['# Title'])
    expect(slices(document, paragraphs)).toEqual(['Some prose with `inline` code.', 'Tail.'])
  })

  it('runs an unterminated fence to the end of the text', () => {
    const text = '```\nx\n'
    const spans = segment(text).codeSpans
    expect(spans).toHaveLength(1)
    expect(spans[0]?.start).toBe(0)
    expect(spans[0]?.end).toBe(text.length)
  })

  it('finds one block per list item', () => {
    const blocks = segment('- one\n- two\n').blocks
    expect(blocks.map((block) => block.kind)).toEqual(['listItem', 'listItem'])
  })

  it('does not add a span for inline code inside a fence', () => {
    expect(segment('```\na `b` c\n```\n').codeSpans).toHaveLength(1)
  })
})

describe('countProseWords', () => {
  it('counts words outside code spans', () => {
    // Title, Some, prose, with, code, Tail — `inline` and py/delve are code.
    expect(countProseWords(document, segment(document))).toBe(6)
  })
})

describe('isInsideCode', () => {
  const text = 'pre\n```\ndelve\n```\npost\n'
  const structure = segment(text)
  const fenceStart = text.indexOf('```')

  it('is true for a span wholly inside a fence', () => {
    const start = text.indexOf('delve')
    expect(isInsideCode(structure, span(start, start + 5))).toBe(true)
  })

  it('is true for a span that overlaps a fence edge', () => {
    expect(isInsideCode(structure, span(fenceStart - 2, fenceStart + 2))).toBe(true)
  })

  it('is false for a span in prose', () => {
    expect(isInsideCode(structure, span(0, 3))).toBe(false)
  })
})

describe('proseSlice', () => {
  it('blanks an inline code span and keeps the length', () => {
    const text = 'Use `x` now'
    const slice = proseSlice(text, segment(text), {
      start: RawOffsetSchema.parse(0),
      end: RawOffsetSchema.parse(11),
    })
    expect(slice).toHaveLength(11)
    expect(slice).toBe(`Use${' '.repeat(5)}now`)
  })

  it('blanks a fenced block entirely', () => {
    const text = '```\nconst x = 1\n```\n'
    const structure = segment(text)
    const fence = structure.codeSpans[0]
    if (fence === undefined) throw new Error('expected a fenced code span')
    const slice = proseSlice(text, structure, fence)
    expect(slice).toHaveLength(fence.end - fence.start)
    expect(slice.trim()).toBe('')
  })

  it('returns the raw slice when there is no code', () => {
    const text = 'One two three.\n\nFour five six.\n'
    const target = { start: RawOffsetSchema.parse(3), end: RawOffsetSchema.parse(20) }
    expect(proseSlice(text, segment(text), target)).toBe(text.slice(target.start, target.end))
  })
})
