import { describe, expect, it } from 'bun:test'
import type { PackName } from '../types.js'
import { PackNameSchema } from '../types.js'
import type { LoadedRule } from './packs.js'
import { lexicalRules, loadBundledPacks, selectRules, stylometricRules } from './packs.js'
import { LexicalRuleSchema, StructuralRuleSchema, StylometricRuleSchema } from './schema.js'

const packs = loadBundledPacks()
const allPackNames: readonly PackName[] = packs.map((pack) => pack.name)

const idsOf = (selection: {
  readonly packs: readonly PackName[]
  readonly gates: readonly ('gpt' | 'claude' | 'gemini')[]
  readonly deprecated: boolean
}): readonly string[] => selectRules(packs, selection).map((loaded) => loaded.rule.id)

describe('loadBundledPacks', () => {
  it('returns every shipped pack, each attributed', () => {
    expect(allPackNames).toEqual([
      'wikipedia-signs',
      'claudisms',
      'humanizer',
      'stylometry',
      'excess-vocab',
      'vale-ai-tells',
      'slop-gate',
      'unslop',
    ])
    for (const pack of packs) {
      expect(pack.attribution.length).toBeGreaterThan(0)
    }
  })

  it('gives every rule across every pack a unique id', () => {
    const ids = packs.flatMap((pack) => pack.rules.map((rule) => rule.id))
    expect(ids).toHaveLength(new Set(ids).size)
  })
})

describe('selectRules', () => {
  it('drops deprecated and gated rules by default', () => {
    const selected = selectRules(packs, {
      packs: allPackNames,
      gates: [],
      deprecated: false,
    })
    for (const loaded of selected) {
      expect(loaded.rule.deprecated).toBe(false)
      expect(loaded.rule.gated).toBe(null)
    }
    expect(selected.map((loaded) => loaded.rule.id)).toContain('residue.oaicite')
  })

  it('admits only the gates that were asked for', () => {
    const ids = idsOf({ packs: allPackNames, gates: ['gpt'], deprecated: false })
    expect(ids).toContain('gated.gpt.tics')
    expect(ids).not.toContain('gated.claude.tics')
  })

  it('admits deprecated rules when asked', () => {
    const ids = idsOf({ packs: allPackNames, gates: [], deprecated: true })
    expect(ids).toContain('deprecated.gpt35.certainly')
  })

  it('keeps only the requested packs', () => {
    const selected = selectRules(packs, {
      packs: [PackNameSchema.parse('claudisms')],
      gates: [],
      deprecated: false,
    })
    expect(selected.length).toBeGreaterThan(0)
    for (const loaded of selected) {
      expect(loaded.pack).toBe('claudisms')
    }
  })
})

describe('lexicalRules', () => {
  it('drops every judge rule', () => {
    const selected = selectRules(packs, {
      packs: allPackNames,
      gates: [],
      deprecated: false,
    })
    const lexical = lexicalRules(selected)
    expect(lexical.length).toBeGreaterThan(0)
    for (const rule of lexical) {
      expect(rule.engine).toBe('lexical')
      expect(rule.engine).not.toBe('structural')
    }
  })
})

describe('stylometricRules', () => {
  it('returns the seven shipped stylometric rules, all advisory', () => {
    const rules = stylometricRules(
      selectRules(packs, { packs: allPackNames, gates: [], deprecated: false }),
    )
    expect(rules.map((rule) => rule.id)).toEqual([
      'rhythm.sentence-uniformity',
      'rhythm.opener-repetition',
      'rhythm.paragraph-uniformity',
      'structure.heading-uniformity',
      'rhythm.lexical-diversity',
      'rhythm.contraction-rate',
      'rhythm.punctuation-density',
    ])
    for (const rule of rules) {
      expect(rule.severity).toBe('info')
    }
  })

  it('keeps only the stylometric rules', () => {
    const selected: readonly LoadedRule[] = [
      {
        pack: PackNameSchema.parse('claudisms'),
        packAttribution: 'x',
        rule: LexicalRuleSchema.parse({
          id: 'test.lexical',
          category: 'residue',
          engine: 'lexical',
          severity: 'error',
          weight: 1,
          era: 'gpt4',
          message: 'x',
          attribution: 'x',
          pattern: 'abc',
          examples: { matching: ['abc'] },
        }),
      },
      {
        pack: PackNameSchema.parse('wikipedia-signs'),
        packAttribution: 'x',
        rule: StructuralRuleSchema.parse({
          id: 'test.structural',
          category: 'formatting',
          engine: 'structural',
          check: 'title-case-heading',
          severity: 'info',
          weight: 1,
          era: 'gpt4',
          message: 'x',
          attribution: 'x',
          examples: { matching: ['## Abc Def'] },
        }),
      },
      {
        pack: PackNameSchema.parse('stylometry'),
        packAttribution: 'x',
        rule: StylometricRuleSchema.parse({
          id: 'test.stylometric',
          category: 'rhythm',
          engine: 'stylometric',
          severity: 'info',
          metric: 'contraction-rate',
          era: 'mixed',
          message: 'x',
          attribution: 'x',
          baselines: { technical: 0, prose: 1, marketing: 1.5 },
        }),
      },
    ]
    expect(stylometricRules(selected).map((rule) => rule.id)).toEqual(['test.stylometric'])
  })
})
