import { describe, expect, it } from 'bun:test'
import { HogwashError } from '../errors.js'
import { PackNameSchema } from '../types.js'
import { renderRuleExplanation, renderRuleList } from './explain.js'
import type { LoadedRule } from './packs.js'
import { LexicalRuleSchema, StructuralRuleSchema } from './schema.js'

const lexical: LoadedRule = {
  pack: PackNameSchema.parse('claudisms'),
  packAttribution: 'claudism-pass reference files, CC0 1.0',
  rule: LexicalRuleSchema.parse({
    id: 'residue.demo',
    category: 'residue',
    engine: 'lexical',
    severity: 'error',
    weight: 6,
    registers: { marketing: 0.5 },
    era: 'gpt4',
    reliable: true,
    message: 'Leaked scaffolding.',
    attribution: 'artifacts.txt, CC0 1.0',
    pattern: 'oaicite',
    replacements: [{ when: 'x', text: '' }],
    examples: { matching: ['see oaicite'], clean: ['no token here'] },
  }),
}

const structural: LoadedRule = {
  pack: PackNameSchema.parse('wikipedia-signs'),
  packAttribution: 'Wikipedia:Signs of AI writing, CC BY-SA 4.0',
  rule: StructuralRuleSchema.parse({
    id: 'wiki.structure.demo',
    category: 'formatting',
    engine: 'structural',
    check: 'title-case-heading',
    severity: 'info',
    weight: 1,
    era: 'gpt4',
    message: 'Heading in Title Case.',
    attribution: 'Wikipedia § Style, CC BY-SA 4.0',
    examples: { matching: ['## Challenges And Future Directions'] },
  }),
}

const selection: readonly LoadedRule[] = [lexical, structural]

describe('renderRuleList', () => {
  it('describes each rule on one line, in selection order', () => {
    const lines = renderRuleList(selection).split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('residue.demo claudisms lexical residue')
    expect(lines[1]).toBe('wiki.structure.demo wikipedia-signs structural formatting')
  })
})

describe('renderRuleExplanation', () => {
  it('explains a lexical rule in full', () => {
    const lines = renderRuleExplanation(selection, 'residue.demo').split('\n')
    const contains = (needle: string): boolean => lines.some((line) => line.includes(needle))
    for (const needle of [
      'residue.demo',
      'claudisms',
      'residue',
      'lexical',
      'error',
      '6',
      'technical 1',
      'prose 1',
      'marketing 0.5',
      'gpt4',
      'reliable',
      'none',
      'Leaked scaffolding.',
      'oaicite',
      'replacement: x -> ""',
      'see oaicite',
      'no token here',
      'artifacts.txt, CC0 1.0',
      'claudism-pass reference files, CC0 1.0',
    ]) {
      expect(contains(needle), needle).toBe(true)
    }
  })

  it('explains a structural rule with its check', () => {
    const text = renderRuleExplanation(selection, 'wiki.structure.demo')
    expect(text).toContain('check: title-case-heading')
    expect(text).toContain('Wikipedia:Signs of AI writing, CC BY-SA 4.0')
  })

  it('rejects an unknown rule id', () => {
    try {
      renderRuleExplanation(selection, 'no.such.rule')
    } catch (error) {
      if (!(error instanceof HogwashError)) throw error
      // `error` is now HogwashError; no cast needed below.
      const failure = error.failure
      expect(failure.kind).toBe('usage')
      expect(failure.message).toContain('no.such.rule')
      return
    }
    throw new Error('renderRuleExplanation did not throw')
  })
})
