import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { HogwashError } from '../../../../skills/hogwash/scripts/errors.js'
import {
  expandValeIndex,
  mapVale,
  parseVale,
  VALE_RAW_BASE,
  VALE_WEIGHT,
} from '../../../../skills/hogwash/scripts/sync/map/vale.js'
import { contentRevision } from '../../../../skills/hogwash/scripts/sync/source.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/sync/${name}`, import.meta.url), 'utf8')

const index = fixture('vale-index.json')
const styleBodies = [
  'Cliches.yml',
  'Density.yml',
  'Headings.yml',
  'Pairs.yml',
  'Punctuation.yml',
  'Swaps.yml',
].map((name) => fixture(`vale/${name}`))

const failureKind = (run: () => unknown): string => {
  try {
    run()
  } catch (error) {
    return error instanceof HogwashError ? error.failure.kind : 'not-a-hogwash-error'
  }
  return 'no-error'
}

describe('expandValeIndex', () => {
  it('keeps the style files, sorted, and builds each URL from the frozen base', () => {
    const parts = expandValeIndex(index)
    expect(parts.map((part) => part.url)).toEqual(
      [
        'Cliches.yml',
        'Density.yml',
        'Headings.yml',
        'Pairs.yml',
        'Punctuation.yml',
        'Swaps.yml',
      ].map((name) => `${VALE_RAW_BASE}${name}`),
    )
    expect(parts.every((part) => !part.gzip)).toBe(true)
  })

  it('refuses an index it cannot use', () => {
    expect(failureKind(() => expandValeIndex('[]'))).toBe('config')
    expect(failureKind(() => expandValeIndex('not json'))).toBe('config')
    expect(failureKind(() => expandValeIndex('[{"type":"file"}]'))).toBe('config')
  })
})

describe('parseVale', () => {
  const parsed = parseVale([index, ...styleBodies])
  const lines = parsed.snapshot.trimEnd().split('\n')

  it('writes one line per token and one for a style with no tokens', () => {
    expect(lines).toHaveLength(16)
    expect(lines.filter((line) => line.startsWith('Cliches\t'))).toHaveLength(8)
    expect(lines.filter((line) => line.startsWith('Punctuation\t'))).toHaveLength(2)
    expect(lines.filter((line) => line.startsWith('Headings\t'))).toHaveLength(2)
    expect(lines.filter((line) => line.startsWith('Pairs\t'))).toHaveLength(2)
    expect(lines.filter((line) => line.startsWith('Swaps\t'))).toHaveLength(1)
    expect(lines.filter((line) => line.startsWith('Density\t'))).toHaveLength(1)
  })

  it('writes the five tab-separated fields', () => {
    expect(lines).toContain(
      "Cliches\texistence\t-\tdouble-edged sword\tAI cliché: '%s'. Say the plain thing instead.",
    )
    expect(lines).toContain(
      "Headings\texistence\tscope\tthe future of work\tAI heading: '%s'. Title the section after its content.",
    )
    expect(lines).toContain("Swaps\tsubstitution\t-\t\tAI compound: use %s instead of '%s'.")
  })

  it('sorts the lines and ends the text in one newline', () => {
    expect([...lines].sort()).toEqual(lines)
    expect(parsed.snapshot.endsWith('\n')).toBe(true)
    expect(parsed.snapshot.endsWith('\n\n')).toBe(false)
  })

  it('derives the revision from the snapshot content', () => {
    expect(parsed.revision).toBe(contentRevision(parsed.snapshot))
  })

  it('refuses a body count that does not match the index', () => {
    expect(failureKind(() => parseVale([index, ...styleBodies.slice(1)]))).toBe('config')
  })
})

describe('mapVale', () => {
  const lines = parseVale([index, ...styleBodies])
    .snapshot.trimEnd()
    .split('\n')

  it('keeps only the literal multi-word phrases of an unscoped existence style', () => {
    const outcome = mapVale(lines)
    expect(outcome.kind).toBe('mapped')
    if (outcome.kind !== 'mapped') return
    expect(outcome.dropped).toBe(11)
    expect(
      outcome.edits.map((edit) => (edit.kind === 'add' ? edit.rule.examples.matching[0] : '')),
    ).toEqual([
      'and honestly',
      'double-edged sword',
      'rich tapestry',
      'tip of the iceberg',
      'to be honest,',
    ])
  })

  it('builds the whole rule from the style and the token', () => {
    const outcome = mapVale(lines)
    if (outcome.kind !== 'mapped') return expect.unreachable()
    const edit = outcome.edits[1]
    if (edit?.kind !== 'add') return expect.unreachable()
    expect(edit.rule).toEqual({
      engine: 'lexical',
      id: 'vale.cliches.double-edged-sword',
      category: 'vocabulary',
      era: 'mixed',
      severity: 'warning',
      weight: VALE_WEIGHT,
      section: 'Cliches',
      pattern: '\\bdouble-edged sword\\b',
      replacements: [],
      message: "AI cliché: 'double-edged sword'. Say the plain thing instead.",
      examples: { matching: ['double-edged sword'], clean: [] },
    })
  })

  it('leaves off a word boundary a comma would never match', () => {
    const outcome = mapVale(lines)
    if (outcome.kind !== 'mapped') return expect.unreachable()
    const edit = outcome.edits[4]
    expect(edit?.kind === 'add' && edit.rule.engine === 'lexical' && edit.rule.pattern).toBe(
      '\\bto be honest,',
    )
  })

  it('slugs an acronym style name', () => {
    const outcome = mapVale([
      'AICompoundPhrases\texistence\t-\tsurface area\tAI compound: %s.',
      'EmDashUsage\texistence\t-\tdash it all\tAI dash: %s.',
    ])
    if (outcome.kind !== 'mapped') return expect.unreachable()
    expect(outcome.edits.map((edit) => (edit.kind === 'add' ? edit.rule.id : ''))).toEqual([
      'vale.ai-compound-phrases.surface-area',
      'vale.em-dash-usage.dash-it-all',
    ])
  })

  it('refuses a line that is not five fields', () => {
    expect(mapVale(['Cliches\texistence\t-\tdouble-edged sword']).kind).toBe('invalid')
  })
})
