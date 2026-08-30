import { describe, expect, it } from 'bun:test'
import { loadBundledPacks } from '../../../skills/hogwash/scripts/rules/packs.js'
import { loadPack, type RulePack } from '../../../skills/hogwash/scripts/rules/schema.js'
import type { DraftedRule, RuleEdit } from '../../../skills/hogwash/scripts/sync/draft.js'
import { materialize, reviewEdits } from '../../../skills/hogwash/scripts/sync/review.js'
import { sourceOf } from '../../../skills/hogwash/scripts/sync/source.js'
import { RuleIdSchema } from '../../../skills/hogwash/scripts/types.js'

const packs = loadBundledPacks()
const wiki = sourceOf('wikipedia-signs')

type DraftedLexical = Extract<DraftedRule, { engine: 'lexical' }>

const drafted = (overrides: Partial<DraftedLexical> = {}): DraftedLexical => ({
  engine: 'lexical',
  id: RuleIdSchema.parse('wiki.vocab.moonlighting'),
  category: 'vocabulary',
  era: 'gpt4',
  severity: 'warning',
  weight: 1,
  message: 'moonlighting is over-used',
  section: 'Language and grammar',
  pattern: '\\bmoonlighting\\b',
  replacements: [],
  examples: { matching: ['a spot of moonlighting'], clean: ['the quarterly ledger'] },
  ...overrides,
})

const addOf = (rule: DraftedRule): RuleEdit => ({ kind: 'add', rule })

describe('materialize', () => {
  it('fills the fixed fields of a drafted lexical rule', () => {
    const outcome = materialize(drafted(), wiki)
    expect(outcome.kind).toBe('rule')
    if (outcome.kind !== 'rule') return
    const rule = outcome.rule
    expect(rule.engine).toBe('lexical')
    if (rule.engine !== 'lexical') return
    expect(rule.flags).toEqual(['i'])
    expect(rule.replacements).toEqual([])
    expect(rule.weight).toBe(1)
    expect(materialize(drafted({ weight: 2.1 }), wiki)).toMatchObject({
      kind: 'rule',
      rule: { weight: 2.1 },
    })
    expect(rule.reliable).toBe(false)
    expect(rule.deprecated).toBe(false)
    expect(rule.gated).toBeNull()
    expect(rule.registers).toEqual({ technical: 1, prose: 1, marketing: 1 })
    expect(rule.attribution).toBe(
      'Wikipedia:Signs of AI writing § Language and grammar (CC BY-SA 4.0)',
    )
  })

  it('carries a drafted replacement table onto the materialized rule', () => {
    const table = [{ when: 'embark on', text: 'start' }]
    const outcome = materialize(
      drafted({ pattern: '\\bembark(ing)? on\\b', replacements: table }),
      wiki,
    )
    expect(outcome.kind).toBe('rule')
    if (outcome.kind !== 'rule' || outcome.rule.engine !== 'lexical') return expect.unreachable()
    expect(outcome.rule.replacements).toEqual(table)

    const bare = materialize(drafted({ pattern: '\\bembark(ing)? on\\b' }), wiki)
    if (bare.kind !== 'rule' || bare.rule.engine !== 'lexical') return expect.unreachable()
    expect(bare.rule.replacements).toEqual([])
  })

  it('reports an invalid pattern', () => {
    const outcome = materialize(drafted({ pattern: '(' }), wiki)
    expect(outcome.kind).toBe('invalid')
    expect(outcome.kind === 'invalid' && outcome.reason).toContain('pattern')
  })
})

describe('reviewEdits', () => {
  it('rejects an add whose id already exists', () => {
    const result = reviewEdits(
      [addOf(drafted({ id: RuleIdSchema.parse('wiki.vocab.delve') }))],
      packs,
      wiki,
    )
    expect(result.accepted).toEqual([])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.reason).toContain('already exists')
    expect(result.duplicates).toBe(0)
  })

  it('refuses a drafted id outside the source prefix', () => {
    const result = reviewEdits(
      [addOf(drafted({ id: RuleIdSchema.parse('bogus.vocab.moonlighting') }))],
      packs,
      wiki,
    )
    expect(result.accepted).toHaveLength(0)
    expect(result.duplicates).toBe(0)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.reason).toBe(
      'the rule id bogus.vocab.moonlighting does not start with wiki.',
    )
  })

  it('accepts the same rule under a free id policy', () => {
    const result = reviewEdits(
      [addOf(drafted({ id: RuleIdSchema.parse('bogus.vocab.moonlighting') }))],
      packs,
      sourceOf('claudisms-ai'),
    )
    expect(result.accepted).toHaveLength(1)
  })

  it('stamps the source register weights onto a materialized rule', () => {
    const weighted = {
      ...sourceOf('wikipedia-signs'),
      registers: { technical: 1.2, prose: 1, marketing: 0.6 },
    }
    const result = reviewEdits([addOf(drafted())], packs, weighted)
    expect(result.accepted).toHaveLength(1)
    const first = result.accepted[0]
    if (first?.kind !== 'add' || first.rule.engine === 'stylometric') {
      expect.unreachable()
    }
    expect(first.rule.registers).toEqual({ technical: 1.2, prose: 1, marketing: 0.6 })
  })

  it('rejects an add every phrase of which an enabled pack already matches', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({
            id: RuleIdSchema.parse('wiki.vocab.woven'),
            pattern: '\\btapestry\\b',
            examples: { matching: ['a rich tapestry'], clean: ['a plain rug'] },
          }),
        ),
      ],
      packs,
      wiki,
    )
    expect(result.accepted).toEqual([])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]?.reason).toContain('duplicate')
    expect(result.duplicates).toBe(1)
  })

  const tapestryOnly = (): RulePack => {
    const outcome = materialize(
      drafted({
        id: RuleIdSchema.parse('wiki.vocab.tapestry'),
        pattern: '\\btapestry\\b',
        examples: { matching: ['a rich tapestry'], clean: [] },
      }),
      wiki,
    )
    if (outcome.kind !== 'rule') expect.unreachable()
    return loadPack(
      {
        name: 'wikipedia-signs',
        version: '0.1.0',
        attribution: 'Hand-built for this test. Not shipped.',
        rules: [outcome.rule],
      },
      'hand-built',
    )
  }

  it('rejects a phrase a shipped rule already matches inside', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({
            id: RuleIdSchema.parse('wiki.vocab.rich-tapestry'),
            pattern: '\\brich tapestry\\b',
            examples: { matching: ['rich tapestry'], clean: [] },
          }),
        ),
      ],
      [tapestryOnly()],
      wiki,
    )
    expect(result.accepted).toEqual([])
    expect(result.duplicates).toBe(1)
    expect(result.rejected[0]?.reason).toBe(
      'duplicate: an enabled pack already matches every phrase this rule does',
    )
  })

  it('accepts a phrase no shipped rule matches inside', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({
            id: RuleIdSchema.parse('wiki.vocab.double-edged-sword'),
            pattern: '\\bdouble-edged sword\\b',
            examples: { matching: ['double-edged sword'], clean: [] },
          }),
        ),
      ],
      [tapestryOnly()],
      wiki,
    )
    expect(result.accepted).toHaveLength(1)
    expect(result.duplicates).toBe(0)
  })

  it('accepts a phrase no single shipped rule covers on its own', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({
            pattern: '\\bmoonlighting ledger\\b',
            examples: { matching: ['a moonlighting ledger'], clean: ['a plain rug'] },
          }),
        ),
      ],
      packs,
      wiki,
    )
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toEqual([])
    expect(result.duplicates).toBe(0)
  })

  it('rejects an add whose matching example does not match', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({ examples: { matching: ['no match here'], clean: ['the quarterly ledger'] } }),
        ),
      ],
      packs,
      wiki,
    )
    expect(result.accepted).toEqual([])
    expect(result.rejected[0]?.reason).toContain('no match here')
    expect(result.duplicates).toBe(0)
  })

  it('rejects an add whose clean example matches', () => {
    const result = reviewEdits(
      [
        addOf(
          drafted({
            examples: { matching: ['a spot of moonlighting'], clean: ['a spot of moonlighting'] },
          }),
        ),
      ],
      packs,
      wiki,
    )
    expect(result.accepted).toEqual([])
    expect(result.rejected[0]?.reason).toContain('a spot of moonlighting')
    expect(result.duplicates).toBe(0)
  })

  it('accepts a valid add', () => {
    const result = reviewEdits([addOf(drafted())], packs, wiki)
    expect(result.accepted).toHaveLength(1)
    expect(result.rejected).toEqual([])
    expect(result.duplicates).toBe(0)
  })

  it('accepts a deprecate of a known rule and rejects an unknown one', () => {
    const known = reviewEdits(
      [{ kind: 'deprecate', id: RuleIdSchema.parse('wiki.vocab.delve'), reason: 'r' }],
      packs,
      wiki,
    )
    expect(known.accepted).toHaveLength(1)
    expect(known.rejected).toEqual([])
    expect(known.duplicates).toBe(0)

    const unknown = reviewEdits(
      [{ kind: 'deprecate', id: RuleIdSchema.parse('nope.nope'), reason: 'r' }],
      packs,
      wiki,
    )
    expect(unknown.accepted).toEqual([])
    expect(unknown.rejected[0]?.reason).toContain('nope.nope')
  })

  it('accepts an era change inside the synced pack only', () => {
    const inside = reviewEdits(
      [{ kind: 'era', id: RuleIdSchema.parse('wiki.vocab.delve'), era: 'gpt5' }],
      packs,
      wiki,
    )
    expect(inside.accepted).toHaveLength(1)
    expect(inside.rejected).toEqual([])
    expect(inside.duplicates).toBe(0)

    const outside = reviewEdits(
      [{ kind: 'era', id: RuleIdSchema.parse('phrase.stands-as'), era: 'gpt5' }],
      packs,
      wiki,
    )
    expect(outside.accepted).toEqual([])
    expect(outside.rejected).toHaveLength(1)
  })
})
