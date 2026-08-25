import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { HogwashError } from '../../errors.js'
import { contentRevision } from '../source.js'
import {
  mapSlopGate,
  parseSlopGate,
  replacementsFromHint,
  SLOP_GATE_WEIGHT,
  witnessFor,
} from './slop-gate.js'

const WITNESSES: readonly (readonly [string, string | null])[] = [
  ['\\bdelve\\b', 'delve'],
  ['\\bnavigat(e|ing) the complexit(y|ies)\\b', 'navigate the complexity'],
  ['\\belevate(s|d)?\\b', 'elevate'],
  ['\\b(rich )?tapestry\\b', 'tapestry'],
  ['\\bcutting[- ]edge\\b', 'cutting-edge'],
  ["\\bin today['’]?s (fast-paced|digital) (world|age)\\b", "in today's fast-paced world"],
  ['—', '—'],
  ['\\bzorp+\\b', null],
  ["\\b(feel free to|don['’]?t hesitate to)\\b", null],
  ['\\bany.thing\\b', null],
]

describe('witnessFor', () => {
  it('derives a witness only from the supported subset', () => {
    for (const [pattern, expected] of WITNESSES) {
      expect(witnessFor(pattern), pattern).toBe(expected)
    }
  })

  it('every witness matches its own pattern', () => {
    for (const [pattern, expected] of WITNESSES) {
      if (expected === null) continue
      expect(new RegExp(pattern, 'i').test(expected), pattern).toBe(true)
    }
  })
})

describe('replacementsFromHint', () => {
  it('reads the first quoted phrase a hint offers', () => {
    expect(replacementsFromHint("Use 'look at', 'go into', or 'cover'.", 'delve')).toEqual([
      { when: 'delve', text: 'look at' },
    ])
    expect(replacementsFromHint("Use 'start'.", 'embark on')).toEqual([
      { when: 'embark on', text: 'start' },
    ])
    expect(replacementsFromHint('Say what gets faster or simpler.', 'streamline')).toEqual([])
    expect(
      replacementsFromHint('A classic AI tell. Be literal about what is there.', 'tapestry'),
    ).toEqual([])
    expect(replacementsFromHint('Use one paragraph mark.', '¶¶')).toEqual([])
  })

  it('escapes every regex metacharacter in the witness', () => {
    expect(replacementsFromHint("Use 'zap'.", 'a+b')).toEqual([{ when: 'a\\+b', text: 'zap' }])
  })
})

const fixture = (name: string): string =>
  readFileSync(new URL(`../../../tests/fixtures/sync/${name}`, import.meta.url), 'utf8')

const bodies = (): readonly string[] => [
  fixture('slop-gate-vocabulary.json'),
  fixture('slop-gate-punctuation.json'),
]

const configKind = (run: () => unknown): string => {
  try {
    run()
  } catch (error) {
    return error instanceof HogwashError ? error.failure.kind : 'not-a-hogwash-error'
  }
  return 'no-throw'
}

describe('parseSlopGate', () => {
  it('normalizes both upstream files into one sorted snapshot', () => {
    const parsed = parseSlopGate(bodies())
    const lines = parsed.snapshot.split('\n')
    expect(lines).toHaveLength(8)
    expect(lines[7]).toBe('')
    expect(lines[0]).toBe(
      ['punctuation', 'double-pilcrow', '¶¶', 'Use one paragraph mark.'].join('\t'),
    )
    expect(lines.slice(1, 7)).toEqual([
      ['vocabulary', 'blatherskite', '\\bblatherskite\\b', ''].join('\t'),
      ['vocabulary', 'flumping', '\\bflump[- ]ing\\b', "Use 'falling'."].join('\t'),
      ['vocabulary', 'gizmoish', '\\bgizmoish\\b', "Use 'plain'."].join('\t'),
      ['vocabulary', 'sprocket-hub', '\\b(rusty )?sprocket hub\\b', 'Name the part.'].join('\t'),
      ['vocabulary', 'widgetise', '\\bwidgetis(e|es|ed|ing)\\b', 'Say what it does.'].join('\t'),
      ['vocabulary', 'zorpy', '\\bzorp+\\b', "Use 'zap'."].join('\t'),
    ])
    expect(parsed.revision).toBe(contentRevision(parsed.snapshot))
  })

  it('refuses a body count other than the fetch order', () => {
    expect(configKind(() => parseSlopGate([fixture('slop-gate-vocabulary.json')]))).toBe('config')
  })

  it('refuses a section the fetch order does not place there', () => {
    const [vocabulary, punctuation] = bodies()
    expect(configKind(() => parseSlopGate([punctuation ?? '', vocabulary ?? '']))).toBe('config')
  })

  it('refuses a field holding a tab', () => {
    const tabbed = JSON.stringify({
      id: 'punctuation',
      rules: [{ id: 'double-pilcrow', match: '¶¶', hint: 'Use\tone paragraph mark.' }],
    })
    expect(configKind(() => parseSlopGate([fixture('slop-gate-vocabulary.json'), tabbed]))).toBe(
      'config',
    )
  })
})

describe('mapSlopGate', () => {
  const added = (): readonly string[] =>
    parseSlopGate(bodies())
      .snapshot.split('\n')
      .filter((line) => line !== '')

  it('maps the fixture snapshot to five rules and drops two', () => {
    const outcome = mapSlopGate(added())
    if (outcome.kind !== 'mapped') return expect.unreachable()
    expect(outcome.edits).toHaveLength(5)
    expect(outcome.dropped).toBe(2)

    const flumping = outcome.edits.find(
      (edit) => edit.kind === 'add' && edit.rule.id === 'slop.vocabulary.flumping',
    )
    expect(flumping).toEqual({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: 'slop.vocabulary.flumping',
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight: SLOP_GATE_WEIGHT,
        section: 'vocabulary',
        pattern: '\\bflump[- ]ing\\b',
        message: "Use 'falling'.",
        replacements: [{ when: 'flump-ing', text: 'falling' }],
        examples: { matching: ['flump-ing'], clean: [] },
      },
    })

    const pilcrow = outcome.edits.find(
      (edit) => edit.kind === 'add' && edit.rule.id === 'slop.punctuation.double-pilcrow',
    )
    expect(pilcrow).toMatchObject({
      rule: { category: 'formatting', replacements: [] },
    })
  })

  it('refuses a batch holding a line that is not four fields', () => {
    const outcome = mapSlopGate([['vocabulary', 'gizmoish', '\\bgizmoish\\b'].join('\t')])
    expect(outcome.kind).toBe('invalid')
  })

  it('drops a line whose composed id was already emitted', () => {
    const outcome = mapSlopGate([
      ['vocabulary', 'gizmoish', '\\bgizmoish\\b', "Use 'plain'."].join('\t'),
      ['vocabulary', 'gizmoish', '\\bgizmoisher\\b', "Use 'plainer'."].join('\t'),
    ])
    if (outcome.kind !== 'mapped') return expect.unreachable()
    expect(outcome.edits).toHaveLength(1)
    expect(outcome.dropped).toBe(1)
  })
})
