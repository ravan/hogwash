import { describe, expect, it } from 'bun:test'
import { fingerprintOf } from '../../../skills/hogwash/scripts/report/fingerprint.js'
import type { ReportFinding } from '../../../skills/hogwash/scripts/types.js'

const finding = (
  ruleId: string,
  match: string,
  line: number,
  actionable = true,
): ReportFinding => ({
  ruleId: ruleId as ReportFinding['ruleId'],
  start: 0 as ReportFinding['start'],
  end: match.length as ReportFinding['end'],
  match,
  category: 'vocabulary',
  severity: 'warning',
  engine: 'lexical',
  message: 'Avoid it.',
  effectiveWeight: actionable ? 1 : 0,
  suggestion: null,
  actionable,
  waived: false,
  location: { start: { line, column: 1 }, end: { line, column: match.length + 1 } },
})

describe('fingerprintOf', () => {
  it('is a 16-character hex digest', () => {
    expect(fingerprintOf([])).toMatch(/^[0-9a-f]{16}$/)
  })

  it('ignores position, order, case and spacing but keeps multiplicity', () => {
    const a = [finding('r', 'Delve', 2), finding('s', 'a  handful', 9)]
    const b = [finding('s', 'A handful', 40), finding('r', 'delve', 70)]
    expect(fingerprintOf(a)).toBe(fingerprintOf(b))
    expect(fingerprintOf([...a, finding('r', 'delve', 99)])).not.toBe(fingerprintOf(a))
  })

  it('counts only actionable findings', () => {
    const base = [finding('r', 'delve', 2)]
    expect(fingerprintOf([...base, finding('s', 'even', 5, false)])).toBe(fingerprintOf(base))
  })
})
