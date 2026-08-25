import { describe, expect, it } from 'bun:test'
import { ConfigSchema } from '../config.js'
import type { LexicalRule } from '../rules/schema.js'
import { buildReport } from './build.js'

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
