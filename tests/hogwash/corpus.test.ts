import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ConfigSchema } from '../../skills/hogwash/scripts/config.js'
import type { ScanRules } from '../../skills/hogwash/scripts/report/build.js'
import { buildReport } from '../../skills/hogwash/scripts/report/build.js'
import {
  lexicalRules,
  loadBundledPacks,
  selectRules,
  stylometricRules,
} from '../../skills/hogwash/scripts/rules/packs.js'
import { DEFAULT_THRESHOLD, density } from '../../skills/hogwash/scripts/scan/density.js'
import type { FileReport, Finding, Register } from '../../skills/hogwash/scripts/types.js'

const REGISTERS: readonly Register[] = ['technical', 'prose', 'marketing']

// Claude-written imitations of human prose — negative controls for the
// lexical rules, NOT genuine human text. Genuine human text lives in
// tests/hogwash/fixtures/eval/hape-human/.
const PASTICHE_FIXTURES = [
  'pastiche-plain.md',
  'pastiche-formal.md',
  'pastiche-non-native.md',
] as const
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
  it.each([...PASTICHE_FIXTURES])('keeps %s under the threshold', (name) => {
    expect(measure(name, register).density).toBeLessThan(DEFAULT_THRESHOLD)
  })

  it.each([...AI_FIXTURES])('pushes %s over the threshold', (name) => {
    expect(measure(name, register).density).toBeGreaterThan(DEFAULT_THRESHOLD)
  })

  it('finds nothing in pastiche-plain.md', () => {
    expect(
      measure('pastiche-plain.md', register).findings.filter(engineIs('lexical')),
    ).toHaveLength(0)
  })

  it.each([...PASTICHE_FIXTURES, ...AI_FIXTURES])(
    'keeps stylometry out of the density of %s',
    (name) => {
      const file = measure(name, register)
      expect(file.density).toBe(density(file.findings.filter(engineIs('lexical')), file.words))
    },
  )

  it.each([...PASTICHE_FIXTURES, ...AI_FIXTURES])('keeps stylometry advisory in %s', (name) => {
    for (const finding of measure(name, register).findings.filter(engineIs('stylometric'))) {
      expect(finding.effectiveWeight).toBe(0)
      expect(finding.severity).toBe('info')
    }
  })

  it.each([...PASTICHE_FIXTURES, ...AI_FIXTURES])('de-duplicates spans in %s', (name) => {
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

const measureEval = (name: string, register: Register): FileReport => {
  const text = readFileSync(new URL(`./fixtures/eval/${name}`, import.meta.url), 'utf8')
  const config = ConfigSchema.parse({ register })
  const file = buildReport([{ path: name, text }], rules, config, 'fixed').files[0]
  if (file === undefined) throw new Error(`no file report for ${name}`)
  return file
}

const HAPE_HUMAN = [
  ['hape-human/acad-0005.md', 'technical'],
  ['hape-human/blog-0016.md', 'prose'],
  ['hape-human/fic-0002.md', 'prose'],
  ['hape-human/news-0002.md', 'prose'],
] as const

const HAPE_AI = [
  ['hape-gpt4o/acad-0005.md', 'technical'],
  ['hape-gpt4o/blog-0016.md', 'prose'],
  ['hape-gpt4o/fic-0009.md', 'prose'],
  ['hape-gpt4o/news-0002.md', 'prose'],
  ['hape-llama3/acad-0031.md', 'technical'],
  ['hape-llama3/blog-0016.md', 'prose'],
  ['hape-llama3/fic-0009.md', 'prose'],
  ['hape-llama3/news-0011.md', 'prose'],
] as const

describe('stylometry against the HAP-E baselines', () => {
  it.each([...HAPE_HUMAN])(
    'leaves genuinely human %s free of rhythm findings',
    (name, register) => {
      expect(measureEval(name, register).findings.filter(engineIs('stylometric'))).toHaveLength(0)
    },
  )

  it.each([...HAPE_AI])('fires at least one rhythm finding on %s', (name, register) => {
    expect(
      measureEval(name, register).findings.filter(engineIs('stylometric')).length,
    ).toBeGreaterThan(0)
  })

  // The pastiche fixtures were written by Claude when the skill was built
  // (they were once named human-*). Under baselines calibrated on genuinely
  // human text, two of them now trip rhythm rules — the detector working.
  it('keeps pastiche-plain.md quiet but flags the Claude-written pastiche-formal.md', () => {
    const rhythm = (name: string): readonly string[] =>
      measure(name, 'technical')
        .findings.filter(engineIs('stylometric'))
        .map((finding) => String(finding.ruleId))
    expect(rhythm('pastiche-plain.md')).toHaveLength(0)
    expect(rhythm('pastiche-formal.md')).toEqual([
      'rhythm.sentence-uniformity',
      'rhythm.sentence-uniformity',
    ])
    // Known false-positive shape: lower lexical turnover is common in
    // non-native writing; the rule stays info-severity and weight zero.
    expect(rhythm('pastiche-non-native.md')).toEqual([
      'rhythm.lexical-diversity',
      'rhythm.lexical-diversity',
    ])
  })

  it('reads hape-gpt4o/news-0002.md differently under technical and prose', () => {
    const spansOf = (register: Register): readonly string[] =>
      measureEval('hape-gpt4o/news-0002.md', register)
        .findings.filter(engineIs('stylometric'))
        .map((finding) => `${finding.ruleId}:${finding.start}-${finding.end}`)
    const technical = spansOf('technical')
    const prose = spansOf('prose')
    expect(technical.length).toBeGreaterThan(0)
    expect(prose.length).toBeGreaterThan(0)
    expect(new Set(technical)).not.toEqual(new Set(prose))
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
