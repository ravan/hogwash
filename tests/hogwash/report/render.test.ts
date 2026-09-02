import { describe, expect, it } from 'bun:test'
import { noteCell, renderTerminal } from '../../../skills/hogwash/scripts/report/render.js'
import { ReportSchema } from '../../../skills/hogwash/scripts/types.js'

const report = ReportSchema.parse({
  version: 7,
  createdAt: 'fixed',
  register: 'technical',
  threshold: 25,
  files: [
    {
      path: 'a.md',
      words: 10,
      density: 100,
      fingerprint: 'e3b0c44298fc1c14',
      findings: [
        {
          ruleId: 'test.rule',
          start: 0,
          end: 5,
          match: 'delve',
          category: 'vocabulary',
          severity: 'warning',
          engine: 'lexical',
          message: 'Avoid it.',
          effectiveWeight: 1,
          suggestion: 'inspect',
          actionable: true,
          location: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } },
        },
        {
          ruleId: 'test.advice',
          start: 6,
          end: 10,
          match: 'even',
          category: 'rhythm',
          severity: 'info',
          engine: 'stylometric',
          message: 'Review rhythm.',
          effectiveWeight: 0,
          suggestion: null,
          actionable: false,
          location: { start: { line: 1, column: 7 }, end: { line: 1, column: 11 } },
        },
      ],
    },
  ],
})

describe('renderTerminal', () => {
  it('shows location and actionable state without judge metadata', () => {
    const text = renderTerminal(report)
    expect(text).toContain('1:1-1:6  actionable')
    expect(text).toContain('1:7-1:11  advisory')
    expect(text).not.toContain('votes')
    expect(text).not.toContain('tier')
  })

  it('marks advisory notes', () => {
    const advisory = report.files[0]?.findings[1]
    if (advisory === undefined) throw new Error('missing advisory fixture')
    expect(noteCell(advisory)).toBe('Review rhythm. (advisory)')
  })
})
