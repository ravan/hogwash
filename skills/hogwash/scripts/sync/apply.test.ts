import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { loadPack, type Rule, RuleSchema } from '../rules/schema.js'
import { RuleIdSchema } from '../types.js'
import { applyEdits } from './apply.js'
import type { AcceptedEdit } from './review.js'

const origin = 'rules/claudisms.json'
const current = readFileSync(
  new URL('../../tests/fixtures/sync/pack-apply.json', import.meta.url),
  'utf8',
)
const before: { readonly rules: readonly Record<string, unknown>[] } = JSON.parse(current)

const richRule = (extra: Record<string, unknown> = {}): Rule =>
  RuleSchema.parse({
    id: 'cl.vocab.rich',
    category: 'vocabulary',
    engine: 'lexical',
    pattern: '\\brich tapestry\\b',
    flags: ['i'],
    severity: 'warning',
    weight: 1,
    era: 'gpt4',
    message: "'rich tapestry' is a stock phrase.",
    attribution: 'claudisms.ai § Confirmed Claudisms (free to copy and adapt)',
    examples: { matching: ['a rich tapestry'], clean: ['a plain rug'] },
    ...extra,
  })

const add = (rule: Rule): AcceptedEdit => ({ kind: 'add', rule })
const deprecate = (id: string): AcceptedEdit => ({
  kind: 'deprecate',
  id: RuleIdSchema.parse(id),
  reason: 'the upstream removed it',
})

const applied = (edits: readonly AcceptedEdit[]) => {
  const outcome = applyEdits(current, edits, origin)
  if (outcome.kind !== 'applied') throw new Error(`expected applied, got ${outcome.reason}`)
  return {
    counts: outcome.counts,
    text: outcome.text,
    rules: (JSON.parse(outcome.text) as { rules: Record<string, unknown>[] }).rules,
  }
}

const invalid = (edits: readonly AcceptedEdit[], text = current): string => {
  const outcome = applyEdits(text, edits, origin)
  if (outcome.kind !== 'invalid') throw new Error('expected invalid')
  return outcome.reason
}

describe('applyEdits', () => {
  it('returns the file untouched when there is nothing to apply', () => {
    const result = applied([])
    expect(result.text).toBe(current)
    expect(result.counts).toEqual({ added: 0, deprecated: 0, retimed: 0 })
  })

  it('appends an added rule and leaves its neighbours byte-identical', () => {
    const result = applied([add(richRule())])
    expect(result.rules).toHaveLength(3)
    expect(result.rules[2]?.id).toBe('cl.vocab.rich')
    expect(Object.keys(result.rules[2] ?? {})).toEqual([
      'id',
      'category',
      'engine',
      'pattern',
      'flags',
      'severity',
      'weight',
      'era',
      'reliable',
      'message',
      'examples',
      'attribution',
    ])
    expect(JSON.stringify(result.rules[0])).toBe(JSON.stringify(before.rules[0]))
    expect(result.counts.added).toBe(1)
  })

  it('emits non-default register weights between weight and era', () => {
    const result = applied([add(richRule({ registers: { technical: 2, prose: 1, marketing: 1 } }))])
    expect(Object.keys(result.rules[2] ?? {})).toEqual([
      'id',
      'category',
      'engine',
      'pattern',
      'flags',
      'severity',
      'weight',
      'registers',
      'era',
      'reliable',
      'message',
      'examples',
      'attribution',
    ])
  })

  it('inserts a missing deprecated key directly after era', () => {
    const result = applied([deprecate('cl.vocab.sit-with')])
    expect(result.rules[0]?.deprecated).toBe(true)
    expect(Object.keys(result.rules[0] ?? {})).toEqual([
      'id',
      'category',
      'engine',
      'pattern',
      'flags',
      'severity',
      'weight',
      'era',
      'deprecated',
      'reliable',
      'message',
      'examples',
      'attribution',
    ])
    expect(result.counts.deprecated).toBe(1)
  })

  it('flips an existing deprecated key in place', () => {
    const result = applied([deprecate('cl.vocab.tapestry')])
    expect(result.rules[1]?.deprecated).toBe(true)
    expect(Object.keys(result.rules[1] ?? {})).toEqual(Object.keys(before.rules[1] ?? {}))
  })

  it('re-times a rule in place', () => {
    const result = applied([
      { kind: 'era', id: RuleIdSchema.parse('cl.vocab.tapestry'), era: 'gpt5' },
    ])
    expect(result.rules[1]?.era).toBe('gpt5')
    expect(Object.keys(result.rules[1] ?? {})).toEqual(Object.keys(before.rules[1] ?? {}))
    expect(result.counts.retimed).toBe(1)
  })

  it('refuses to add a rule whose id is already in the pack', () => {
    expect(invalid([add(richRule({ id: 'cl.vocab.sit-with' }))])).toContain('cl.vocab.sit-with')
  })

  it('refuses to edit a rule the pack does not carry', () => {
    expect(invalid([deprecate('cl.vocab.absent')])).toContain('cl.vocab.absent')
  })

  it('names the origin when the file is not json', () => {
    expect(invalid([], 'not json')).toContain(origin)
  })

  it('produces the same bytes twice', () => {
    expect(applied([add(richRule())]).text).toBe(applied([add(richRule())]).text)
  })

  it('writes a pack the schema loader still accepts', () => {
    const pack = loadPack(JSON.parse(applied([add(richRule())]).text), origin)
    expect(pack.rules).toHaveLength(3)
  })

  it('refuses a stylometric rule, which the sync never drafts', () => {
    const stylometric = RuleSchema.parse({
      id: 'cl.rhythm.uniform',
      category: 'rhythm',
      engine: 'stylometric',
      severity: 'info',
      metric: 'sentence-uniformity',
      baselines: { technical: 1, prose: 1, marketing: 1 },
      era: 'gpt4',
      message: 'sentences are uniform.',
      attribution: 'claudisms.ai § Confirmed Claudisms (free to copy and adapt)',
    })
    expect(invalid([add(stylometric)])).toContain('stylometric')
  })
})
