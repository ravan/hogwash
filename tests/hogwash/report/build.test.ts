import { describe, expect, it } from 'bun:test'
import { ConfigSchema } from '../../../skills/hogwash/scripts/config.js'
import { buildReport, exitCodeForReport } from '../../../skills/hogwash/scripts/report/build.js'
import type { LexicalRule } from '../../../skills/hogwash/scripts/rules/schema.js'

const rule: LexicalRule = {
  id: 'test.delve' as LexicalRule['id'],
  category: 'vocabulary',
  era: 'mixed',
  deprecated: false,
  gated: null,
  message: 'Avoid delve.',
  attribution: 'test',
  severity: 'warning',
  weight: 1,
  registers: { technical: 1, prose: 1, marketing: 1 },
  reliable: true,
  advisory: false,
  examples: { matching: ['delve'], clean: [] },
  engine: 'lexical',
  pattern: '\\bdelve\\b',
  flags: ['i'],
  replacements: [],
}

describe('buildReport', () => {
  it('builds scanner-only v6 findings with end-exclusive locations', () => {
    const report = buildReport(
      [{ path: 'a.md', text: 'First line.\nThen delve.\n' }],
      { lexical: [rule], stylometric: [], structural: [] },
      ConfigSchema.parse({}),
      'fixed',
    )
    expect(report.version).toBe(6)
    expect(report.files[0]?.findings[0]).toMatchObject({
      start: 17,
      end: 22,
      actionable: true,
      location: { start: { line: 2, column: 6 }, end: { line: 2, column: 11 } },
    })
  })
})

describe('exitCodeForReport', () => {
  // One warning in a long document: far under the density threshold, so the
  // density alone passes it. The gate is what makes a house rule a house rule.
  const report = buildReport(
    [{ path: 'a.md', text: `Then delve.\n${'word '.repeat(400)}` }],
    { lexical: [rule], stylometric: [], structural: [] },
    ConfigSchema.parse({}),
    'fixed',
  )

  it('passes a document under the density threshold', () => {
    expect(exitCodeForReport(report)).toBe(0)
  })

  it('fails on a finding at the gate severity', () => {
    expect(exitCodeForReport(report, 'warning')).toBe(1)
  })

  it('lets a finding below the gate through', () => {
    expect(exitCodeForReport(report, 'error')).toBe(0)
  })

  it('fails on density whatever the gate says', () => {
    const dense = buildReport(
      [{ path: 'a.md', text: 'Delve, delve, delve.' }],
      { lexical: [rule], stylometric: [], structural: [] },
      ConfigSchema.parse({}),
      'fixed',
    )
    expect(exitCodeForReport(dense, 'error')).toBe(1)
  })
})
