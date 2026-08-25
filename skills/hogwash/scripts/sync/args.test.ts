import { describe, expect, it } from 'bun:test'
import { HogwashError } from '../errors.js'
import { parseSyncArgs } from './args.js'

const usageFrom = (argv: readonly string[]): HogwashError => {
  try {
    parseSyncArgs(argv)
  } catch (error) {
    if (error instanceof HogwashError) return error
    throw error
  }
  throw new Error('expected a HogwashError')
}

describe('parseSyncArgs', () => {
  it('defaults to the claude family and the wikipedia source', () => {
    expect(parseSyncArgs([])).toEqual({
      family: 'claude',
      selection: { kind: 'one', source: 'wikipedia-signs' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads an explicit family', () => {
    expect(parseSyncArgs(['--family', 'codex'])).toEqual({
      family: 'codex',
      selection: { kind: 'one', source: 'wikipedia-signs' },
      familyGiven: true,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads an explicit source', () => {
    expect(parseSyncArgs(['--source', 'claudisms-ai'])).toEqual({
      family: 'claude',
      selection: { kind: 'one', source: 'claudisms-ai' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads a structured source without claiming a family was given', () => {
    expect(parseSyncArgs(['--source', 'excess-vocab-csv'])).toEqual({
      family: 'claude',
      selection: { kind: 'one', source: 'excess-vocab-csv' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads the slop-gate source', () => {
    expect(parseSyncArgs(['--source', 'slop-gate'])).toEqual({
      family: 'claude',
      selection: { kind: 'one', source: 'slop-gate' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads a family and a source together', () => {
    expect(parseSyncArgs(['--source', 'claudisms-ai', '--family', 'codex'])).toEqual({
      family: 'codex',
      selection: { kind: 'one', source: 'claudisms-ai' },
      familyGiven: true,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads --all', () => {
    expect(parseSyncArgs(['--all'])).toEqual({
      family: 'claude',
      selection: { kind: 'all' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: null,
    })
  })

  it('reads --all with --detect-only', () => {
    expect(parseSyncArgs(['--all', '--detect-only'])).toEqual({
      family: 'claude',
      selection: { kind: 'all' },
      familyGiven: false,
      detectOnly: true,
      prBodyPath: null,
    })
  })

  it('reads --all with --pr-body', () => {
    expect(parseSyncArgs(['--all', '--pr-body', '/tmp/body.md'])).toEqual({
      family: 'claude',
      selection: { kind: 'all' },
      familyGiven: false,
      detectOnly: false,
      prBodyPath: '/tmp/body.md',
    })
  })

  it('reads --detect-only before a source', () => {
    expect(parseSyncArgs(['--detect-only', '--source', 'claudisms-ai'])).toEqual({
      family: 'claude',
      selection: { kind: 'one', source: 'claudisms-ai' },
      familyGiven: false,
      detectOnly: true,
      prBodyPath: null,
    })
  })

  it('refuses --all together with --source, in either order', () => {
    for (const argv of [
      ['--all', '--source', 'slop-gate'],
      ['--source', 'slop-gate', '--all'],
    ]) {
      const error = usageFrom(argv)
      expect(error.failure.kind).toBe('usage')
      expect(error.message).toContain('--all')
      expect(error.message).toContain('--source')
    }
  })

  it('rejects a pr-body flag with no value', () => {
    expect(usageFrom(['--pr-body']).failure.kind).toBe('usage')
  })

  it('rejects an empty pr-body value', () => {
    const error = usageFrom(['--pr-body', ''])
    expect(error.failure.kind).toBe('usage')
    expect(error.message).toContain('--pr-body')
  })

  it('accepts --all twice', () => {
    expect(parseSyncArgs(['--all', '--all'])).toEqual(parseSyncArgs(['--all']))
  })

  it('rejects a source it does not know', () => {
    const error = usageFrom(['--source', 'substack'])
    expect(error.failure.kind).toBe('usage')
    expect(error.message).toContain('substack')
  })

  it('rejects a source flag with no value', () => {
    expect(usageFrom(['--source']).failure.kind).toBe('usage')
  })

  it('rejects a family it cannot drive', () => {
    const error = usageFrom(['--family', 'gemini'])
    expect(error.failure.kind).toBe('usage')
    expect(error.message).toContain('gemini')
  })

  it('rejects a family flag with no value', () => {
    expect(usageFrom(['--family']).failure.kind).toBe('usage')
  })

  it('rejects an unknown flag', () => {
    const error = usageFrom(['--wat'])
    expect(error.failure.kind).toBe('usage')
    expect(error.message).toContain('--wat')
  })
})
