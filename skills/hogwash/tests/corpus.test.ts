import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ConfigSchema } from '../scripts/config.js'
import type { ScanRules } from '../scripts/report/build.js'
import { buildReport } from '../scripts/report/build.js'
import {
  lexicalRules,
  loadBundledPacks,
  selectRules,
  stylometricRules,
} from '../scripts/rules/packs.js'
import { DEFAULT_THRESHOLD, density } from '../scripts/scan/density.js'
import type { FileReport, Finding, Register } from '../scripts/types.js'

const REGISTERS: readonly Register[] = ['technical', 'prose', 'marketing']

const HUMAN_FIXTURES = ['human-plain.md', 'human-formal.md', 'non-native-formal.md'] as const
const AI_FIXTURES = ['ai-dense.md', 'ai-subtle.md'] as const

const selected = selectRules(loadBundledPacks(), {
  packs: ConfigSchema.parse({}).packs,
  gates: [],
  deprecated: false,
})

const rules: ScanRules = {
  lexical: lexicalRules(selected),
  stylometric: stylometricRules(selected),
  structural: [],
}

const engineIs =
  (engine: Finding['engine']) =>
  (finding: Finding): boolean =>
    finding.engine === engine

const measure = (name: string, register: Register): FileReport => {
  const text = readFileSync(new URL(`./fixtures/corpus/${name}`, import.meta.url), 'utf8')
  const config = ConfigSchema.parse({ register })
  const file = buildReport([{ path: name, text }], rules, config, 'fixed').files[0]
  if (file === undefined) throw new Error(`no file report for ${name}`)
  return file
}

describe.each([...REGISTERS])('register %s', (register) => {
  it.each([...HUMAN_FIXTURES])('keeps %s under the threshold', (name) => {
    expect(measure(name, register).density).toBeLessThan(DEFAULT_THRESHOLD)
  })

  it.each([...AI_FIXTURES])('pushes %s over the threshold', (name) => {
    expect(measure(name, register).density).toBeGreaterThan(DEFAULT_THRESHOLD)
  })

  it('finds nothing in human-plain.md', () => {
    expect(measure('human-plain.md', register).findings.filter(engineIs('lexical'))).toHaveLength(0)
  })

  it.each([...HUMAN_FIXTURES, ...AI_FIXTURES])(
    'keeps stylometry out of the density of %s',
    (name) => {
      const file = measure(name, register)
      expect(file.density).toBe(density(file.findings.filter(engineIs('lexical')), file.words))
    },
  )

  it.each([...HUMAN_FIXTURES, ...AI_FIXTURES])('keeps stylometry advisory in %s', (name) => {
    for (const finding of measure(name, register).findings.filter(engineIs('stylometric'))) {
      expect(finding.effectiveWeight).toBe(0)
      expect(finding.severity).toBe('info')
    }
  })

  it.each([...HUMAN_FIXTURES, ...AI_FIXTURES])('de-duplicates spans in %s', (name) => {
    const findings = measure(name, register).findings.filter(engineIs('lexical'))
    for (const [index, finding] of findings.entries()) {
      for (const other of findings.slice(index + 1)) {
        expect(`${other.start}-${other.end}`).not.toBe(`${finding.start}-${finding.end}`)
        const contains =
          (finding.start <= other.start &&
            other.end <= finding.end &&
            (finding.start < other.start || other.end < finding.end)) ||
          (other.start <= finding.start &&
            finding.end <= other.end &&
            (other.start < finding.start || finding.end < other.end))
        expect(contains, `${finding.ruleId} vs ${other.ruleId} in ${name}`).toBe(false)
      }
    }
  })
})

describe('stylometry in the technical register', () => {
  it.each([...HUMAN_FIXTURES])('leaves %s free of rhythm findings', (name) => {
    expect(measure(name, 'technical').findings.filter(engineIs('stylometric'))).toHaveLength(0)
  })

  it('reads ai-subtle.md differently under technical and marketing', () => {
    const spansOf = (register: Register): readonly string[] =>
      measure('ai-subtle.md', register)
        .findings.filter(engineIs('stylometric'))
        .map((finding) => `${finding.ruleId}:${finding.start}-${finding.end}`)
    const technical = spansOf('technical')
    const marketing = spansOf('marketing')
    expect(technical.length).toBeGreaterThan(0)
    expect(marketing.length).toBeGreaterThan(0)
    expect(new Set(technical)).not.toEqual(new Set(marketing))
  })
})

describe('ai-dense.md in the technical register', () => {
  const findings = measure('ai-dense.md', 'technical').findings

  it('spans at least three categories', () => {
    expect(new Set(findings.map((finding) => finding.category)).size).toBeGreaterThanOrEqual(3)
  })

  it('trips at least ten distinct rules', () => {
    expect(new Set(findings.map((finding) => finding.ruleId)).size).toBeGreaterThanOrEqual(10)
  })
})
