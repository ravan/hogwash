import { describe, expect, it } from 'bun:test'
import { RawOffsetSchema } from '../types.js'
import { sentenceSpans } from './sentences.js'

type Case = {
  readonly name: string
  readonly prose: string
  readonly start: number
  readonly expected: readonly (readonly [number, number])[]
}

const cases: readonly Case[] = [
  {
    name: 'three terminated sentences at the document start',
    prose: 'One two. Three! Four?',
    start: 0,
    expected: [
      [0, 8],
      [9, 15],
      [16, 21],
    ],
  },
  {
    name: 'the same sentences offset into the raw text',
    prose: 'One two. Three! Four?',
    start: 100,
    expected: [
      [100, 108],
      [109, 115],
      [116, 121],
    ],
  },
  {
    name: 'a run of terminators is one boundary',
    prose: 'Really?! Yes.',
    start: 0,
    expected: [
      [0, 8],
      [9, 13],
    ],
  },
  {
    name: 'a period between digits is not a boundary',
    prose: '1.2 percent rose.',
    start: 0,
    expected: [[0, 17]],
  },
  {
    name: 'an unterminated tail is a sentence',
    prose: 'No terminator here',
    start: 0,
    expected: [[0, 18]],
  },
  { name: 'blank prose has no sentences', prose: '   ', start: 0, expected: [] },
  { name: 'empty prose has no sentences', prose: '', start: 0, expected: [] },
]

describe('sentenceSpans', () => {
  it.each([...cases])('$name', ({ prose, start, expected }) => {
    expect(sentenceSpans(prose, RawOffsetSchema.parse(start))).toEqual(
      expected.map(([spanStart, spanEnd]) => ({
        start: RawOffsetSchema.parse(spanStart),
        end: RawOffsetSchema.parse(spanEnd),
      })),
    )
  })
})
