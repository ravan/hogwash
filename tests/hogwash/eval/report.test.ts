import { describe, expect, it } from 'bun:test'
import type { EvaluationReport } from '../../../skills/hogwash/scripts/eval/report.js'
import { gateFailures, renderEvaluation } from '../../../skills/hogwash/scripts/eval/report.js'
import { PackNameSchema, ThresholdSchema } from '../../../skills/hogwash/scripts/types.js'

const report = (control = 10, positive = 40): EvaluationReport => ({
  createdAt: 'fixed',
  threshold: ThresholdSchema.parse(25),
  notCollected: [],
  packs: [
    {
      pack: PackNameSchema.parse('test'),
      rulesRaised: 0,
      truePositives: 0,
      falsePositives: 0,
      precision: null,
    },
  ],
  classes: [
    {
      name: 'controls' as EvaluationReport['classes'][number]['name'],
      kind: 'control',
      documents: 1,
      words: 100,
      falsePositiveRate: 0,
      densities: [{ path: 'control.md', density: control as never }],
      rules: [],
    },
    {
      name: 'positives' as EvaluationReport['classes'][number]['name'],
      kind: 'positive',
      documents: 1,
      words: 100,
      falsePositiveRate: 0,
      densities: [{ path: 'positive.md', density: positive as never }],
      rules: [],
    },
  ],
})

describe('scanner evaluation report', () => {
  it('gates both sides of the threshold band', () => {
    expect(gateFailures(report())).toEqual([])
    expect(gateFailures(report(30, 20)).map((failure) => failure.kind)).toEqual([
      'control-over-threshold',
      'positive-under-threshold',
    ])
  })

  it('contains no fixer evaluation section', () => {
    const text = renderEvaluation(report())
    expect(text).toContain('# hogwash scanner evaluation')
    expect(text).not.toContain('Fix effect')
    expect(text).not.toContain('Document pass')
  })
})
