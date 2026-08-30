import type { LexicalRule, StructuralRule } from '../rules/schema.js'
import type { Density, Finding, Register, Threshold, WordCount } from '../types.js'
import { DensitySchema, ThresholdSchema } from '../types.js'

/** Calibrated against tests/hogwash/fixtures/corpus in plan S1 Step 12. */
export const DEFAULT_THRESHOLD: Threshold = ThresholdSchema.parse(25)

export function effectiveWeight(rule: LexicalRule | StructuralRule, register: Register): number {
  if (rule.advisory) return 0
  return rule.weight * rule.registers[register]
}

/** Weighted findings per thousand prose words (spec §2.5.1). */
export function density(findings: readonly Finding[], words: WordCount): Density {
  if (words === 0) return DensitySchema.parse(0)
  const total = findings.reduce((sum, finding) => sum + finding.effectiveWeight, 0)
  return DensitySchema.parse((total * 1000) / words)
}
