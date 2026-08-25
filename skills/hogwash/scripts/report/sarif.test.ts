import { expect, it } from 'bun:test'
import { ReportSchema } from '../types.js'
import { buildSarif } from './sarif.js'

it('uses report v6 positions and actionability in SARIF', () => {
  const report = ReportSchema.parse({
    version: 6,
    createdAt: 'fixed',
    register: 'technical',
    threshold: 25,
    files: [
      {
        path: 'a.md',
        words: 1,
        density: 1000,
        findings: [
          {
            ruleId: 'test.rule',
            start: 4,
            end: 9,
            match: 'delve',
            category: 'vocabulary',
            severity: 'warning',
            engine: 'lexical',
            message: 'Avoid it.',
            effectiveWeight: 1,
            suggestion: null,
            actionable: true,
            location: { start: { line: 2, column: 1 }, end: { line: 2, column: 6 } },
          },
        ],
      },
    ],
  })
  const result = buildSarif(report, [], []).runs[0].results[0]
  expect(result?.locations[0].physicalLocation.region).toMatchObject({
    startLine: 2,
    startColumn: 1,
    endLine: 2,
    endColumn: 6,
    charOffset: 4,
    charLength: 5,
  })
  expect(result?.properties).toEqual({
    actionable: true,
    engine: 'lexical',
    category: 'vocabulary',
  })
})
