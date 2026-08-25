import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { loadBundledPacks, selectRules, stylometricRules } from '../rules/packs.js'
import type { PackName } from '../types.js'
import { scanStylometry } from './stylometry.js'

const packs = loadBundledPacks()
const allPackNames: readonly PackName[] = packs.map((pack) => pack.name)
const rules = stylometricRules(
  selectRules(packs, { packs: allPackNames, gates: [], deprecated: false }),
)

const text = readFileSync('tests/fixtures/corpus/ai-subtle.md', 'utf8')

describe('scanStylometry', () => {
  it('fires the technical baselines on ai-subtle.md', () => {
    const found = scanStylometry(text, rules, 'technical').map((finding) => [
      String(finding.ruleId),
      finding.start,
      finding.end,
    ])
    expect(found).toEqual([
      ['rhythm.punctuation-density', 354, 651],
      ['rhythm.sentence-uniformity', 354, 651],
      ['rhythm.sentence-uniformity', 653, 886],
    ])
  })

  it('fires the marketing baselines on ai-subtle.md', () => {
    const found = scanStylometry(text, rules, 'marketing').map((finding) => [
      String(finding.ruleId),
      finding.start,
      finding.end,
    ])
    expect(found).toEqual([
      ['rhythm.contraction-rate', 43, 352],
      ['rhythm.contraction-rate', 354, 651],
      ['rhythm.sentence-uniformity', 354, 651],
      ['rhythm.contraction-rate', 653, 886],
      ['rhythm.sentence-uniformity', 653, 886],
      ['rhythm.contraction-rate', 888, 1135],
    ])
  })

  it('marks every finding advisory and scanner-voted', () => {
    const found = [
      ...scanStylometry(text, rules, 'technical'),
      ...scanStylometry(text, rules, 'marketing'),
    ]
    expect(found.length).toBeGreaterThan(0)
    for (const finding of found) {
      expect(finding.engine).toBe('stylometric')
      expect(finding.severity).toBe('info')
      expect(finding.effectiveWeight).toBe(0)
      expect(finding.actionable).toBe(false)
      expect(finding.match).toBe(text.slice(finding.start, finding.end))
    }
  })

  it('finds nothing in a document below every gate', () => {
    expect(scanStylometry('A short line of only nine words here.', rules, 'marketing')).toEqual([])
  })

  it('finds nothing without rules', () => {
    expect(scanStylometry(text, [], 'marketing')).toEqual([])
  })
})
