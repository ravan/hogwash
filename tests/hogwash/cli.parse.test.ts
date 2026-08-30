import { describe, expect, it } from 'bun:test'
import { parseArgs } from '../../skills/hogwash/scripts/cli.js'
import { HogwashError } from '../../skills/hogwash/scripts/errors.js'
import { ThresholdSchema } from '../../skills/hogwash/scripts/types.js'

const rejects = (argv: readonly string[]): void => {
  expect(() => parseArgs(argv)).toThrow(HogwashError)
}

describe('parseArgs', () => {
  it('parses scan and its scan-only overrides', () => {
    expect(
      parseArgs(['scan', '--output', 'json', '--register', 'prose', '--threshold', '12', 'a.md']),
    ).toEqual({
      kind: 'scan',
      files: ['a.md'],
      format: 'json',
      verbose: false,
      overrides: { register: 'prose', threshold: ThresholdSchema.parse(12) },
    })
  })

  it('parses consultation, diff, acceptance, and initialization', () => {
    expect(parseArgs(['consult', '--family', 'claude', 'draft-hogwash.md'])).toEqual({
      kind: 'consult',
      family: 'claude',
      candidate: 'draft-hogwash.md',
    })
    expect(parseArgs(['diff', 'draft.md'])).toEqual({ kind: 'diff', original: 'draft.md' })
    expect(parseArgs(['accept', '--approved', 'draft.md'])).toEqual({
      kind: 'accept',
      original: 'draft.md',
      approved: true,
    })
    expect(parseArgs(['init'])).toEqual({ kind: 'init' })
    rejects(['init', '--skill'])
  })

  it('requires the explicit acceptance flag', () => {
    rejects(['accept', 'draft.md'])
    rejects(['accept', '--yes', 'draft.md'])
  })

  it('rejects fix and every retired flag', () => {
    rejects(['fix', 'draft.md'])
    for (const flag of [
      '--polish',
      '--fixer',
      '--voice',
      '--source-model',
      '--agents',
      '--model',
      '--effort',
      '--diff',
      '--from-report',
    ])
      rejects(['scan', flag, 'draft.md'])
  })

  it('rejects malformed commands', () => {
    rejects(['scan'])
    rejects(['consult', '--family', 'grok', 'draft.md'])
    rejects(['consult', 'draft.md'])
    rejects(['diff'])
    rejects(['init', '--force'])
  })
})
