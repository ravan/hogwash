import { describe, expect, it } from 'bun:test'
import { density } from '../../../skills/hogwash/scripts/scan/density.js'
import { FindingSchema, WordCountSchema } from '../../../skills/hogwash/scripts/types.js'

const finding = (weight: number) =>
  FindingSchema.parse({
    ruleId: 'test.rule',
    start: 0,
    end: 1,
    match: 'x',
    category: 'vocabulary',
    severity: 'warning',
    engine: 'lexical',
    message: 'test',
    effectiveWeight: weight,
    suggestion: null,
    actionable: weight > 0,
  })

describe('density', () => {
  it('uses effective weights per thousand words', () => {
    expect(density([finding(2), finding(0)], WordCountSchema.parse(100))).toBe(20)
  })

  it('is zero for an empty document', () => {
    expect(density([finding(2)], WordCountSchema.parse(0))).toBe(0)
  })
})
