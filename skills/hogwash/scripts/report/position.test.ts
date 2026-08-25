import { describe, expect, it } from 'bun:test'
import { buildLineIndex, lineColumnAt } from './position.js'

describe('buildLineIndex', () => {
  it('indexes an empty text', () => {
    expect(buildLineIndex('')).toEqual({ starts: [0] })
  })

  it('indexes every line start', () => {
    expect(buildLineIndex('ab\ncd\n')).toEqual({ starts: [0, 3, 6] })
  })

  it('keeps a carriage return on the line it ends', () => {
    expect(buildLineIndex('a\r\nb')).toEqual({ starts: [0, 3] })
  })
})

describe('lineColumnAt', () => {
  const index = buildLineIndex('ab\ncd\n')

  it('reports the first character as line 1 column 1', () => {
    expect(lineColumnAt(index, 0)).toEqual({ line: 1, column: 1 })
  })

  it('reports the first character of the second line', () => {
    expect(lineColumnAt(index, 3)).toEqual({ line: 2, column: 1 })
  })

  it('counts columns from the line start', () => {
    expect(lineColumnAt(index, 5)).toEqual({ line: 2, column: 3 })
  })

  it('puts the position after a trailing newline on a new line', () => {
    expect(lineColumnAt(index, 6)).toEqual({ line: 3, column: 1 })
  })

  it('clamps an offset past the end to the last line', () => {
    expect(lineColumnAt(index, 99)).toEqual({ line: 3, column: 94 })
  })

  it('counts an astral character as two columns', () => {
    expect(lineColumnAt(buildLineIndex('a😀b'), 3)).toEqual({ line: 1, column: 4 })
  })
})
