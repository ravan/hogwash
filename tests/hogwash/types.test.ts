import { describe, expect, it } from 'bun:test'
import { FindingSchema, ReportSchema } from '../../skills/hogwash/scripts/types.js'

const finding = {
  ruleId: 'rule.one',
  start: 0,
  end: 5,
  match: 'delve',
  category: 'vocabulary',
  severity: 'warning',
  engine: 'lexical',
  message: 'Avoid it.',
  effectiveWeight: 1,
  suggestion: null,
  actionable: true,
}

describe('report v6', () => {
  it('requires locations and actionability without judge fields', () => {
    const report = ReportSchema.parse({
      version: 6,
      createdAt: '2026-01-01T00:00:00.000Z',
      register: 'technical',
      threshold: 25,
      files: [
        {
          path: 'a.md',
          words: 1,
          density: 1000,
          findings: [
            {
              ...finding,
              location: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
            },
          ],
        },
      ],
    })
    expect(report.files[0]?.findings[0]?.actionable).toBe(true)
    for (const retired of [{ sourceModel: 'unknown' }, { agents: [] }])
      expect(ReportSchema.safeParse({ ...report, ...retired }).success).toBe(false)
    for (const retired of [{ tier: 'confirmed' }, { votes: ['scanner'] }, { selfReport: false }]) {
      expect(FindingSchema.safeParse({ ...finding, ...retired }).success).toBe(false)
    }
  })

  it('rejects old report versions', () => {
    expect(ReportSchema.safeParse({ version: 5 }).success).toBe(false)
  })
})
