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
      failOn: null,
      baseline: false,
      overrides: { register: 'prose', threshold: ThresholdSchema.parse(12), short: false },
    })
    const frozen = parseArgs(['scan', '--baseline', 'a.md'])
    expect(frozen.kind === 'scan' && frozen.baseline).toBe(true)
  })

  it('parses a waiver with its required fields and optional line', () => {
    expect(
      parseArgs(['waive', '--rule', 'r.x', '--match', 'a handful', '--reason', 'Quote.', 'a.md']),
    ).toEqual({
      kind: 'waive',
      original: 'a.md',
      rule: 'r.x',
      match: 'a handful',
      reason: 'Quote.',
      line: null,
    })
    const lined = parseArgs([
      'waive',
      '--line',
      '54',
      '--rule',
      'r.x',
      '--match',
      'x',
      '--reason',
      'y',
      'a.md',
    ])
    expect(lined.kind === 'waive' && lined.line).toBe(54)
    rejects(['waive', '--rule', 'r.x', '--match', 'x', 'a.md'])
    rejects(['waive', '--rule', 'r.x', '--match', 'x', '--reason', 'y', '--line', '0', 'a.md'])
    rejects(['waive', '--rule', 'r.x', '--match', 'x', '--reason', 'y'])
  })

  it('parses the severity gate, and refuses a severity it does not know', () => {
    const command = parseArgs(['scan', '--fail-on', 'error', 'a.md'])
    expect(command.kind === 'scan' && command.failOn).toBe('error')
    expect(() => parseArgs(['scan', '--fail-on', 'fatal', 'a.md'])).toThrow()
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
      register: null,
    })
    expect(parseArgs(['accept', '--register', 'prose', '--approved', 'draft.md'])).toMatchObject({
      kind: 'accept',
      register: 'prose',
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
