import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { DraftedRuleSchema } from '../draft.js'
import { LIANG_WEIGHT_FLOOR, LIANG_WEIGHT_TOP, liangWeight, mapLiangTables } from './liang.js'

const sample = readFileSync(
  new URL('../../../tests/fixtures/sync/liang-sample.tsv', import.meta.url),
  'utf8',
)
const tables = readFileSync(new URL('../../../data/liang-2024-tables.tsv', import.meta.url), 'utf8')

describe('liangWeight', () => {
  it('falls linearly from the top weight to the floor', () => {
    expect(liangWeight(1)).toBe(1.5)
    expect(liangWeight(2)).toBe(1.4)
    expect(liangWeight(3)).toBe(1.3)
    expect(liangWeight(6)).toBe(0.9)
    expect(liangWeight(10)).toBe(0.5)
  })
})

describe('mapLiangTables', () => {
  const outcome = mapLiangTables(sample.split('\n'))

  it('drops a rank over the ceiling and a word that is not a bare word', () => {
    expect(outcome.kind).toBe('mapped')
    if (outcome.kind !== 'mapped') return
    expect(outcome.dropped).toBe(2)
    expect(outcome.edits).toHaveLength(3)
    expect(outcome.edits.map((edit) => (edit.kind === 'add' ? edit.rule.id : ''))).toEqual([
      'xv.liang.commendable',
      'xv.liang.versatile',
      'xv.liang.reportedly',
    ])
  })

  it('emits every field of a rule from the rank and the part of speech', () => {
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    expect(outcome.edits[1]).toEqual({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: 'xv.liang.versatile',
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight: 0.9,
        section: 'top 100 adjectives',
        pattern: '\\bversatile\\b',
        replacements: [],
        message:
          '"versatile" is ranked 6 of the top 100 adjectives that grew most disproportionately in ICLR 2024 peer reviews.',
        examples: { matching: ['versatile'], clean: [] },
      },
    })
  })

  it('names the adverb table for an adverb row', () => {
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    const edit = outcome.edits[2]
    if (edit?.kind !== 'add') throw new Error('expected an add edit')
    expect(edit.rule.section).toBe('top 100 adverbs')
    expect(edit.rule.message).toContain('top 100 adverbs')
  })

  it('skips comments, the header and blank lines without counting them', () => {
    const bare = mapLiangTables(['1\tadjective\tcommendable'])
    if (bare.kind !== 'mapped') throw new Error('expected a mapped outcome')
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    expect(bare.dropped).toBe(0)
    expect(outcome.dropped).toBe(2)
  })

  it('refuses a rank that is not a positive integer', () => {
    const bad = mapLiangTables(['zero\tadjective\tthing'])
    expect(bad.kind).toBe('invalid')
    expect(bad.kind === 'invalid' && bad.reason).toContain('zero\tadjective\tthing')
  })

  it('refuses a row with two fields instead of three', () => {
    const bad = mapLiangTables(['1\tadjective'])
    expect(bad.kind).toBe('invalid')
    expect(bad.kind === 'invalid' && bad.reason).toContain('1\tadjective')
  })

  it('refuses a part of speech it does not know', () => {
    expect(mapLiangTables(['1\tnoun\tthing']).kind).toBe('invalid')
  })

  it('gives a deeply equal outcome for the same input twice', () => {
    expect(mapLiangTables(sample.split('\n'))).toEqual(mapLiangTables(sample.split('\n')))
  })

  it('emits rules that parse under DraftedRuleSchema', () => {
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    for (const edit of outcome.edits) {
      if (edit.kind !== 'add') throw new Error('expected an add edit')
      expect(DraftedRuleSchema.safeParse(edit.rule).success).toBe(true)
    }
  })

  it('keeps the ranks under the ceiling from the transcribed tables', () => {
    const all = mapLiangTables(tables.split('\n'))
    expect(all.kind).toBe('mapped')
    if (all.kind !== 'mapped') return
    expect(all.edits).toHaveLength(20)
    expect(all.dropped).toBe(180)
  })

  it('keeps every emitted weight between the floor and the top', () => {
    const all = mapLiangTables(tables.split('\n'))
    if (all.kind !== 'mapped') throw new Error('expected a mapped outcome')
    for (const edit of all.edits) {
      if (edit.kind !== 'add') throw new Error('expected an add edit')
      expect(edit.rule.weight).toBeGreaterThanOrEqual(LIANG_WEIGHT_FLOOR)
      expect(edit.rule.weight).toBeLessThanOrEqual(LIANG_WEIGHT_TOP)
    }
  })
})
