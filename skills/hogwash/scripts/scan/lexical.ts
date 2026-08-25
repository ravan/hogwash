import { replacementFor } from '../rules/replace.js'
import type { LexicalRule } from '../rules/schema.js'
import { compileRule } from '../rules/schema.js'
import { isInsideCode, segment } from '../segment/markdown.js'
import type { Finding, Register } from '../types.js'
import { FindingSchema } from '../types.js'
import { effectiveWeight } from './density.js'

const contains = (outer: Finding, inner: Finding): boolean =>
  outer.start <= inner.start &&
  inner.end <= outer.end &&
  (outer.start < inner.start || inner.end < outer.end)

const beats = (candidate: Finding, incumbent: Finding): boolean =>
  candidate.effectiveWeight > incumbent.effectiveWeight ||
  (candidate.effectiveWeight === incumbent.effectiveWeight && candidate.ruleId < incumbent.ruleId)

export function scanText(
  text: string,
  rules: readonly LexicalRule[],
  register: Register,
): readonly Finding[] {
  const structure = segment(text)
  const raw: Finding[] = []
  for (const rule of rules) {
    const regex = compileRule(rule)
    let match = regex.exec(text)
    while (match !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1
      } else {
        const weight = effectiveWeight(rule, register)
        const finding = FindingSchema.parse({
          ruleId: rule.id,
          start: match.index,
          end: match.index + match[0].length,
          match: match[0],
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          engine: 'lexical',
          effectiveWeight: weight,
          suggestion: replacementFor(rule, match[0]),
          actionable: weight > 0,
        })
        if (!isInsideCode(structure, finding)) raw.push(finding)
      }
      match = regex.exec(text)
    }
  }

  const kept: Finding[] = []
  for (const finding of raw) {
    // Nested matches keep the one that matters more: a wider match suppresses
    // an inner one only at equal or higher weight, and a weightless span
    // yields to an actionable ban inside it.
    if (
      raw.some(
        (other) =>
          (contains(other, finding) && other.effectiveWeight >= finding.effectiveWeight) ||
          (contains(finding, other) && other.effectiveWeight > finding.effectiveWeight),
      )
    )
      continue
    const twin = kept.findIndex(
      (other) => other.start === finding.start && other.end === finding.end,
    )
    if (twin === -1) {
      kept.push(finding)
      continue
    }
    const incumbent = kept[twin]
    if (incumbent !== undefined && beats(finding, incumbent)) kept[twin] = finding
  }

  return kept.sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end ||
      (left.ruleId < right.ruleId ? -1 : left.ruleId > right.ruleId ? 1 : 0),
  )
}
