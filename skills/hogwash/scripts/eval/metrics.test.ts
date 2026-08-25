import { expect, it } from 'bun:test'
import { DensitySchema, FindingSchema, RuleIdSchema, WordCountSchema } from '../types.js'
import { adjudicate, scoreClass } from './metrics.js'

const finding = FindingSchema.parse({
  ruleId: 'test.rule',
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
})

it('scores deterministic scanner findings', () => {
  const adjudicated = adjudicate([finding], {
    note: 'known false positive',
    falsePositives: [{ ruleId: RuleIdSchema.parse('test.rule'), quote: 'delve' }],
    missed: [],
  })
  const scored = scoreClass('controls' as Parameters<typeof scoreClass>[0], 'control', [
    {
      path: 'a.md',
      words: WordCountSchema.parse(100),
      density: DensitySchema.parse(10),
      adjudicated,
      missed: [],
    },
  ])
  expect(scored.falsePositiveRate).toBe(10)
  expect(scored.rules[0]?.falsePositives).toBe(1)
})
