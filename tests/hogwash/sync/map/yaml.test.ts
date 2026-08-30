import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { HogwashError } from '../../../../skills/hogwash/scripts/errors.js'
import { readValeStyle } from '../../../../skills/hogwash/scripts/sync/map/yaml.js'

const style = (name: string): string =>
  readFileSync(new URL(`../../fixtures/sync/vale/${name}`, import.meta.url), 'utf8')

const failureKind = (body: string): string => {
  try {
    readValeStyle(body)
  } catch (error) {
    return error instanceof HogwashError ? error.failure.kind : 'not-a-hogwash-error'
  }
  return 'no-error'
}

describe('readValeStyle', () => {
  it('reads an existence style with comments, a blank line and both quote styles', () => {
    const read = readValeStyle(style('Cliches.yml'))
    expect(read.extends).toBe('existence')
    expect(read.scoped).toBe(false)
    expect(read.exceptions).toBe(false)
    expect(read.message).toBe("AI cliché: '%s'. Say the plain thing instead.")
    expect(read.tokens).toEqual([
      'double-edged sword',
      'tip of the iceberg',
      'delve',
      '\\bpaints? a picture\\b',
      'rich tapestry',
      'to be honest,',
      'and honestly',
      'and, honestly',
    ])
  })

  it('keeps one backslash from a double-quoted token', () => {
    expect(readValeStyle(style('Punctuation.yml')).tokens).toEqual(['—', '\\s--\\s'])
  })

  it('sees a block-sequence scope', () => {
    const read = readValeStyle(style('Headings.yml'))
    expect(read.scoped).toBe(true)
    expect(read.tokens).toHaveLength(2)
  })

  it('sees a scalar scope and does not read a token: key as tokens:', () => {
    const read = readValeStyle(style('Density.yml'))
    expect(read.scoped).toBe(true)
    expect(read.extends).toBe('occurrence')
    expect(read.tokens).toEqual([])
  })

  it('consumes a substitution style without reading its swap block', () => {
    const read = readValeStyle(style('Swaps.yml'))
    expect(read.extends).toBe('substitution')
    expect(read.tokens).toEqual([])
  })

  it('reads a sequence style tokens block verbatim', () => {
    const read = readValeStyle(style('Pairs.yml'))
    expect(read.extends).toBe('sequence')
    expect(read.tokens).toEqual(['tag: JJ', 'pattern: comprehensive'])
  })

  it('refuses a body with no extends', () => {
    expect(failureKind('---\nmessage: "no extends here"\n')).toBe('config')
  })

  it('refuses a body with no message', () => {
    expect(failureKind('---\nextends: existence\ntokens:\n  - one two\n')).toBe('config')
  })

  it('refuses a token holding a tab', () => {
    expect(failureKind('---\nextends: existence\nmessage: "x"\ntokens:\n  - one\ttwo\n')).toBe(
      'config',
    )
  })
})
