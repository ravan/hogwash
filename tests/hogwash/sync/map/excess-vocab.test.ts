import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { HogwashError } from '../../../../skills/hogwash/scripts/errors.js'
import { DraftedRuleSchema } from '../../../../skills/hogwash/scripts/sync/draft.js'
import {
  mapExcessVocab,
  parseExcessVocab,
} from '../../../../skills/hogwash/scripts/sync/map/excess-vocab.js'
import { contentRevision } from '../../../../skills/hogwash/scripts/sync/source.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/sync/${name}`, import.meta.url), 'utf8')

const words = fixture('excess-words.csv')
const counts = fixture('yearly-counts.csv')

const SNAPSHOT = 'delves\t10.0000\nduring\t1.0000\ninsights\t4.0000\n'

describe('parseExcessVocab', () => {
  it('keeps only style words that have a 2022 and a 2024 count', () => {
    expect(parseExcessVocab([words, counts]).snapshot).toBe(SNAPSHOT)
  })

  it('derives the revision from the snapshot content', () => {
    expect(parseExcessVocab([words, counts]).revision).toBe(contentRevision(SNAPSHOT))
  })

  it('gives the same snapshot every run', () => {
    expect(parseExcessVocab([words, counts]).snapshot).toBe(
      parseExcessVocab([words, counts]).snapshot,
    )
  })

  it('refuses a single body', () => {
    expect(() => parseExcessVocab([words])).toThrow(HogwashError)
  })

  it('refuses a counts body with no totals row', () => {
    const lines = counts.trimEnd().split('\n')
    expect(() => parseExcessVocab([words, `${lines.slice(0, -1).join('\n')}\n`])).toThrow(
      HogwashError,
    )
  })
})

describe('mapExcessVocab', () => {
  const added = ['delves\t10.0000', 'during\t1.0000', 'insights\t4.0000']

  it('drops a word below the ratio floor and keeps the input order', () => {
    const outcome = mapExcessVocab(added)
    expect(outcome.kind).toBe('mapped')
    if (outcome.kind !== 'mapped') return
    expect(outcome.dropped).toBe(1)
    expect(outcome.edits).toHaveLength(2)
    expect(outcome.edits[0]).toMatchObject({ rule: { id: 'xv.vocab.delves' } })
    expect(outcome.edits[1]).toMatchObject({ rule: { id: 'xv.vocab.insights' } })
  })

  it('emits every field of a rule from the ratio alone', () => {
    const outcome = mapExcessVocab(added)
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    expect(outcome.edits[1]).toEqual({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: 'xv.vocab.insights',
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight: 1,
        section: 'excess vocabulary',
        pattern: '\\binsights\\b',
        replacements: [],
        message: '"insights" appears 4.0 times more often in 2024 academic abstracts than in 2022.',
        examples: { matching: ['insights'], clean: [] },
      },
    })
  })

  it('derives the weight from the ratio', () => {
    const outcome = mapExcessVocab(added)
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    expect(outcome.edits[0]).toMatchObject({ rule: { id: 'xv.vocab.delves', weight: 2.5 } })
  })

  it('maps an empty snapshot to nothing at all', () => {
    expect(mapExcessVocab([])).toEqual({ kind: 'mapped', edits: [], dropped: 0 })
  })

  it('refuses a line that is not word and ratio', () => {
    const outcome = mapExcessVocab(['justoneword'])
    expect(outcome.kind).toBe('invalid')
    expect(outcome.kind === 'invalid' && outcome.reason).toContain('justoneword')
  })

  it('refuses a ratio that is not a number', () => {
    const outcome = mapExcessVocab(['word\tnotanumber'])
    expect(outcome.kind).toBe('invalid')
    expect(outcome.kind === 'invalid' && outcome.reason).toContain('word\tnotanumber')
  })

  it('drops anything that is not a safe bare word', () => {
    expect(mapExcessVocab(['Ex-Ample\t9.0000'])).toEqual({
      kind: 'mapped',
      edits: [],
      dropped: 1,
    })
  })

  it('gives a deeply equal outcome for the same input twice', () => {
    expect(mapExcessVocab(added)).toEqual(mapExcessVocab(added))
  })

  it('emits rules that parse under DraftedRuleSchema', () => {
    const outcome = mapExcessVocab(added)
    if (outcome.kind !== 'mapped') throw new Error('expected a mapped outcome')
    for (const edit of outcome.edits) {
      if (edit.kind !== 'add') throw new Error('expected an add edit')
      expect(DraftedRuleSchema.safeParse(edit.rule).success).toBe(true)
    }
  })
})
