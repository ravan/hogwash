import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  loadBundledPacks,
  selectRules,
  stylometricRules,
} from '../../../skills/hogwash/scripts/rules/packs.js'
import { scanStylometry } from '../../../skills/hogwash/scripts/scan/stylometry.js'
import type { PackName } from '../../../skills/hogwash/scripts/types.js'

const packs = loadBundledPacks()
const allPackNames: readonly PackName[] = packs.map((pack) => pack.name)
const rules = stylometricRules(
  selectRules(packs, { packs: allPackNames, gates: [], deprecated: false }),
)

const text = readFileSync('tests/hogwash/fixtures/corpus/ai-subtle.md', 'utf8')

describe('scanStylometry', () => {
  it('fires the technical baselines on ai-subtle.md', () => {
    const found = scanStylometry(text, rules, 'technical').map((finding) => [
      String(finding.ruleId),
      finding.start,
      finding.end,
    ])
    expect(found).toEqual([
      ['rhythm.sentence-uniformity', 354, 651],
      ['rhythm.sentence-uniformity', 653, 886],
      ['rhythm.sentence-uniformity', 888, 1135],
    ])
  })

  it('fires the marketing baselines on ai-subtle.md', () => {
    const found = scanStylometry(text, rules, 'marketing').map((finding) => [
      String(finding.ruleId),
      finding.start,
      finding.end,
    ])
    // Marketing shares the prose sentence-uniformity baseline; the HAP-E
    // calibration disabled contraction-rate (no human/AI separation).
    expect(found).toEqual([
      ['rhythm.sentence-uniformity', 354, 651],
      ['rhythm.sentence-uniformity', 653, 886],
      ['rhythm.sentence-uniformity', 888, 1135],
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

  it('fires opener repetition when most sentences start the same way', () => {
    const paragraph = [
      'The scheduler assigns every incoming job to the first idle worker in the shared pool.',
      'The dispatcher then records the assignment in the durable ledger for a later audit.',
      'The supervisor restarts any worker process that misses two heartbeats in a row.',
    ].join(' ')
    const found = scanStylometry(paragraph, rules, 'prose').map((finding) => String(finding.ruleId))
    expect(found).toContain('rhythm.opener-repetition')
  })

  it('keeps opener repetition quiet when openers vary', () => {
    const paragraph = [
      'The scheduler assigns every incoming job to the first idle worker in the shared pool.',
      'A dispatcher then records the assignment in the durable ledger for a later audit.',
      'Every supervisor restarts any worker process that misses two heartbeats in a row.',
    ].join(' ')
    const found = scanStylometry(paragraph, rules, 'prose').map((finding) => String(finding.ruleId))
    expect(found).not.toContain('rhythm.opener-repetition')
  })

  it('fires heading uniformity when every heading shares one shape', () => {
    const document = [
      '## Building the ingestion pipeline',
      'One line.',
      '## Deploying the staging cluster',
      'One line.',
      '## Scaling the worker pool',
      'One line.',
      '## Monitoring the nightly runs',
      'One line.',
    ].join('\n\n')
    const found = scanStylometry(document, rules, 'prose').map((finding) => String(finding.ruleId))
    expect(found).toContain('structure.heading-uniformity')
  })

  it('keeps heading uniformity quiet when heading shapes vary', () => {
    const document = [
      '## Building the ingestion pipeline',
      'One line.',
      '## Rollout of the staging cluster',
      'One line.',
      '## How the worker pool scales',
      'One line.',
      '## Alerts for nightly runs',
      'One line.',
    ].join('\n\n')
    const found = scanStylometry(document, rules, 'prose').map((finding) => String(finding.ruleId))
    expect(found).not.toContain('structure.heading-uniformity')
  })

  it('keeps heading uniformity quiet below four headings', () => {
    const document = [
      '## Building the ingestion pipeline',
      'One line.',
      '## Deploying the staging cluster',
      'One line.',
      '## Scaling the worker pool',
      'One line.',
    ].join('\n\n')
    const found = scanStylometry(document, rules, 'prose').map((finding) => String(finding.ruleId))
    expect(found).not.toContain('structure.heading-uniformity')
  })

  it('finds nothing in a document below every gate', () => {
    expect(scanStylometry('A short line of only nine words here.', rules, 'marketing')).toEqual([])
  })

  it('finds nothing without rules', () => {
    expect(scanStylometry(text, [], 'marketing')).toEqual([])
  })
})
