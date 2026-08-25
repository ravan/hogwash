import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { lexicalRules, loadBundledPacks, selectRules } from '../rules/packs.js'
import type { LexicalRule } from '../rules/schema.js'
import { LexicalRuleSchema } from '../rules/schema.js'
import { scanText } from './lexical.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../tests/fixtures/${name}`, import.meta.url), 'utf8')

const packs = loadBundledPacks()
const rules = lexicalRules(
  selectRules(packs, {
    packs: packs.map((pack) => pack.name),
    gates: [],
    deprecated: false,
  }),
)

const ruleWith = (fields: Record<string, unknown>): LexicalRule =>
  LexicalRuleSchema.parse({
    id: 'test.demo',
    category: 'residue',
    engine: 'lexical',
    severity: 'warning',
    weight: 1,
    era: 'gpt4',
    message: 'x',
    attribution: 'x',
    pattern: 'abc',
    examples: { matching: ['abc'] },
    ...fields,
  })

describe('scanText', () => {
  it('finds the leaked citation once in the residue fixture', () => {
    const text = fixture('oaicite-residue.md')
    const findings = scanText(text, rules, 'technical')
    expect(findings).toHaveLength(1)
    const finding = findings[0]
    if (finding === undefined) throw new Error('no finding')
    expect(finding.match).toBe('contentReference[oaicite:12]')
    expect(finding.ruleId).toBe('residue.oaicite')
    expect(finding.category).toBe('residue')
    expect(finding.severity).toBe('error')
    expect(finding.actionable).toBe(true)
    expect(text.slice(finding.start, finding.end)).toBe(finding.match)
  })

  it('finds both occurrences in the twice fixture', () => {
    const text = fixture('twice-oaicite.md')
    const findings = scanText(text, rules, 'technical')
    expect(findings).toHaveLength(2)
    expect(findings[1]?.start).toBeGreaterThan(findings[0]?.start ?? 0)
    for (const finding of findings) {
      expect(text.slice(finding.start, finding.end)).toBe(finding.match)
      expect(finding.actionable).toBe(true)
    }
  })

  it('finds nothing in empty text', () => {
    expect(scanText('', rules, 'technical')).toHaveLength(0)
  })

  it('terminates on a pattern that can match the empty string', () => {
    const findings = scanText('abc', [ruleWith({ id: 'test.star', pattern: 'x*' })], 'technical')
    for (const finding of findings) {
      expect(finding.end).toBeGreaterThan(finding.start)
    }
  })

  it('ignores tells that sit inside a fenced code block', () => {
    expect(scanText(fixture('corpus/human-plain.md'), rules, 'technical')).toHaveLength(0)
  })

  it('drops a match strictly contained in another rule’s match', () => {
    const findings = scanText(
      'abc',
      [ruleWith({ id: 'test.a', pattern: 'abc' }), ruleWith({ id: 'test.b', pattern: 'b' })],
      'technical',
    )
    expect(findings).toHaveLength(1)
    expect(findings[0]?.ruleId).toBe('test.a')
  })

  it('keeps an actionable inner match over the weightless outer match around it', () => {
    const findings = scanText(
      'abc',
      [
        ruleWith({ id: 'test.outer', pattern: 'abc', registers: { technical: 0 } }),
        ruleWith({ id: 'test.inner', pattern: 'b', weight: 2 }),
      ],
      'technical',
    )
    expect(findings.map((finding) => finding.ruleId)).toEqual(['test.inner'])
    expect(findings[0]?.actionable).toBe(true)
  })

  it('keeps the heavier rule when two matches share a span', () => {
    const findings = scanText(
      'abc',
      [
        ruleWith({ id: 'test.light', pattern: 'abc', weight: 1 }),
        ruleWith({ id: 'test.heavy', pattern: 'abc', weight: 5 }),
      ],
      'technical',
    )
    expect(findings).toHaveLength(1)
    expect(findings[0]?.ruleId).toBe('test.heavy')
  })

  it('stamps the register-adjusted weight on every finding', () => {
    const findings = scanText(
      'abc',
      [ruleWith({ weight: 2, registers: { marketing: 0.5 } })],
      'marketing',
    )
    expect(findings[0]?.effectiveWeight).toBe(1)
  })
})
