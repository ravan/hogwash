import { describe, expect, it } from 'bun:test'
import { replacementFor } from '../../../skills/hogwash/scripts/rules/replace.js'
import { LexicalRuleSchema } from '../../../skills/hogwash/scripts/rules/schema.js'

const ruleWith = (replacements: readonly unknown[]) =>
  LexicalRuleSchema.parse({
    id: 'test.demo',
    category: 'residue',
    engine: 'lexical',
    severity: 'warning',
    weight: 2,
    era: 'gpt4',
    message: 'x',
    attribution: 'x',
    pattern: 'abc',
    examples: { matching: ['abc'] },
    replacements,
  })

const delve = ruleWith([
  { when: 'delve', text: 'look' },
  { when: 'delving', text: 'looking' },
])

describe('replacementFor', () => {
  it('returns the entry text for an exact match', () => {
    expect(replacementFor(delve, 'delve')).toBe('look')
  })

  it('anchors each entry so a shorter one does not win a prefix match', () => {
    expect(replacementFor(delve, 'delving')).toBe('looking')
  })

  it('carries the leading case over', () => {
    expect(replacementFor(delve, 'Delve')).toBe('Look')
  })

  it('carries only the first character of the case', () => {
    expect(replacementFor(delve, 'DELVE')).toBe('Look')
  })

  it('returns null when no entry covers the match', () => {
    expect(replacementFor(delve, 'delved')).toBe(null)
  })

  it('returns null for a rule with no table', () => {
    expect(replacementFor(ruleWith([]), 'delve')).toBe(null)
  })

  it('treats an empty replacement as a deletion, not as no replacement', () => {
    expect(replacementFor(ruleWith([{ when: '[\\u00AD]', text: '' }]), '­')).toBe('')
  })
})
