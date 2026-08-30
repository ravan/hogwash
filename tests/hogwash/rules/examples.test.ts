import { describe, expect, it } from 'bun:test'
import { loadBundledPacks } from '../../../skills/hogwash/scripts/rules/packs.js'
import { replacementFor } from '../../../skills/hogwash/scripts/rules/replace.js'
import type { LexicalRule, Rule } from '../../../skills/hogwash/scripts/rules/schema.js'
import { compileRule } from '../../../skills/hogwash/scripts/rules/schema.js'

type Case = { readonly id: string; readonly pack: string; readonly rule: Rule }

const cases: readonly Case[] = loadBundledPacks().flatMap((pack) =>
  pack.rules.map((rule) => ({ id: rule.id, pack: pack.name, rule })),
)

describe.each([...cases])('$pack $id', ({ rule }) => {
  if (rule.engine === 'stylometric') {
    it('carries a metric and a baseline for every register', () => {
      expect(rule.metric.length).toBeGreaterThan(0)
      expect(rule.baselines.technical).toBeGreaterThanOrEqual(0)
      expect(rule.baselines.prose).toBeGreaterThanOrEqual(0)
      expect(rule.baselines.marketing).toBeGreaterThanOrEqual(0)
    })
    return
  }

  if (rule.engine === 'lexical') {
    it.each(rule.examples.matching)('matches %j', (example) => {
      expect(compileRule(rule).test(example)).toBe(true)
    })

    if (rule.examples.clean.length > 0) {
      it.each(rule.examples.clean)('leaves %j alone', (example) => {
        expect(compileRule(rule).test(example)).toBe(false)
      })
    }
    return
  }

  it('carries at least one example', () => {
    expect(rule.examples.matching.length).toBeGreaterThan(0)
  })
})

const withTables: readonly LexicalRule[] = cases
  .map(({ rule }) => rule)
  .filter((rule): rule is LexicalRule => rule.engine === 'lexical' && rule.replacements.length > 0)

/** These packs derive a table from an upstream hint, so their ids are not pinned. */
const IMPORTED_TABLE_PACKS: readonly string[] = ['slop-gate']

const authoredWithTables: readonly string[] = cases
  .filter(
    ({ pack, rule }) =>
      !IMPORTED_TABLE_PACKS.includes(pack) &&
      rule.engine === 'lexical' &&
      rule.replacements.length > 0,
  )
  .map(({ id }) => id)

describe('bundled replacement tables', () => {
  it('covers exactly the authored rules that are meant to carry one', () => {
    expect([...authoredWithTables].sort()).toEqual([
      'connective.wordy',
      'deprecated.gpt35.certainly',
      'hedge.stack',
      'residue.chat-turn-token',
      'residue.hidden-unicode',
      'residue.oaicite',
      'residue.prompt-format',
      'residue.utm-source',
      'tic.em-dash',
      'tic.emoji',
      'tic.horizontal-rule',
      'wiki.formatting.curly-quotes',
      'wiki.structure.copula-avoidance',
      'wiki.vocab.delve',
      'wiki.vocab.soft-technical',
      'wiki.vocab.spike-adjectives',
      'wiki.vocab.spike-verbs',
    ])
  })

  it.each([...withTables])('$id fixes at least one of its own examples', (rule) => {
    const matches = rule.examples.matching.flatMap((example) => [
      ...example.matchAll(compileRule(rule)),
    ])
    const texts = matches.map((match) => match[0]).filter((text) => text.length > 0)
    expect(texts.some((text) => replacementFor(rule, text) !== null)).toBe(true)
  })
})

/**
 * What each table promises, matched text by matched text. A `when` entry that
 * stops covering its own words, or a widened pattern that changes what is
 * matched, fails here instead of showing a wrong `to` column to a reader.
 * `''` means the finding is deleted.
 */
const PROMISES: readonly (readonly [string, string, string])[] = [
  ['connective.wordy', 'due to the fact that', 'because'],
  ['connective.wordy', 'in the event that', 'if'],
  ['connective.wordy', 'has the ability to', 'can'],
  ['connective.wordy', 'at this point in time', 'now'],
  ['hedge.stack', 'may potentially', 'may'],
  ['hedge.stack', 'Generally speaking', 'Generally'],
  ['hedge.stack', 'more often than not', 'usually'],
  ['hedge.stack', 'for the most part', 'mostly'],
  ['hedge.stack', 'to some extent', 'partly'],
  ['wiki.vocab.spike-verbs', 'underscores', 'shows'],
  ['wiki.vocab.spike-verbs', 'fostering', 'encouraging'],
  ['wiki.vocab.spike-verbs', 'garnered', 'got'],
  ['wiki.vocab.spike-verbs', 'bolster', 'strengthen'],
  ['wiki.vocab.spike-verbs', 'showcased', 'showed'],
  ['wiki.vocab.spike-verbs', 'elucidate', 'explain'],
  ['wiki.vocab.soft-technical', 'Seamless', 'Smooth'],
  ['wiki.vocab.soft-technical', 'utilizing', 'using'],
  ['wiki.vocab.spike-adjectives', 'meticulously', 'carefully'],
  ['wiki.vocab.spike-adjectives', 'intricate', 'complex'],
  ['deprecated.gpt35.certainly', 'Certainly! ', ''],
  ['residue.oaicite', 'oai_citation', ''],
  ['tic.emoji', ' 🚀', ''],
]

describe.each(PROMISES)('%s replaces %j', (id, matched, expected) => {
  const rule = withTables.find((candidate) => candidate.id === id)

  it('with the promised text', () => {
    expect(rule).toBeDefined()
    if (rule === undefined) return
    expect(replacementFor(rule, matched)).toBe(expected)
  })

  it('for text the rule itself matches whole', () => {
    expect(rule).toBeDefined()
    if (rule === undefined) return
    const found = [...matched.matchAll(compileRule(rule))]
    expect(found.map((match) => match[0])).toEqual([matched])
  })
})
