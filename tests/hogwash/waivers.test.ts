import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HogwashError } from '../../skills/hogwash/scripts/errors.js'
import type { ReportFinding } from '../../skills/hogwash/scripts/types.js'
import {
  addWaiver,
  applyWaivers,
  normaliseMatch,
  readWaivers,
  waiversFor,
} from '../../skills/hogwash/scripts/waivers.js'

const finding = (ruleId: string, match: string, line: number): ReportFinding => ({
  ruleId: ruleId as ReportFinding['ruleId'],
  start: 0 as ReportFinding['start'],
  end: match.length as ReportFinding['end'],
  match,
  category: 'vocabulary',
  severity: 'warning',
  engine: 'lexical',
  message: 'Avoid it.',
  effectiveWeight: 2,
  suggestion: null,
  actionable: true,
  waived: false,
  location: { start: { line, column: 1 }, end: { line, column: match.length + 1 } },
})

const waiver = (rule: string, match: string, line: number | null = null) => ({
  file: 'docs/post.md',
  rule,
  match,
  reason: 'Verbatim quotation.',
  line,
})

describe('normaliseMatch', () => {
  it('trims, collapses whitespace, and lower-cases', () => {
    expect(normaliseMatch('  A   handful\nof ')).toBe('a handful of')
  })
})

describe('waiversFor', () => {
  const list = [waiver('r', 'x'), { ...waiver('r', 'y'), file: 'other.md' }]

  it('selects the waivers of the document and of the original it is a candidate for', () => {
    const cwd = '/repo'
    expect(waiversFor(list, 'docs/post.md', cwd)).toEqual([list[0]])
    expect(waiversFor(list, 'docs/post-hogwash.md', cwd)).toEqual([list[0]])
    expect(waiversFor(list, '/repo/docs/post-hogwash.md', cwd)).toEqual([list[0]])
    expect(waiversFor(list, 'docs/other.md', cwd)).toEqual([])
  })
})

describe('applyWaivers', () => {
  it('waives one occurrence per entry, preferring the recorded line', () => {
    const findings = [finding('r', 'a handful', 3), finding('r', 'A  handful', 9)]
    const applied = applyWaivers(findings, [waiver('r', 'a handful', 9)])
    expect(applied.map((entry) => entry.waived)).toEqual([false, true])
    expect(applied[1]).toMatchObject({ actionable: false, effectiveWeight: 0 })
    expect(applied[0]).toMatchObject({ actionable: true, effectiveWeight: 2 })
  })

  it('falls back to document order when no line is recorded or the line moved', () => {
    const findings = [finding('r', 'a handful', 3), finding('r', 'a handful', 9)]
    expect(applyWaivers(findings, [waiver('r', 'a handful')]).map((f) => f.waived)).toEqual([
      true,
      false,
    ])
    expect(applyWaivers(findings, [waiver('r', 'a handful', 40)]).map((f) => f.waived)).toEqual([
      true,
      false,
    ])
    expect(
      applyWaivers(findings, [waiver('r', 'a handful'), waiver('r', 'a handful')]).map(
        (f) => f.waived,
      ),
    ).toEqual([true, true])
  })

  it('ignores a waiver for another rule or another wording', () => {
    const findings = [finding('r', 'a handful', 3)]
    expect(applyWaivers(findings, [waiver('other', 'a handful')])[0]?.waived).toBe(false)
    expect(applyWaivers(findings, [waiver('r', 'a few')])[0]?.waived).toBe(false)
  })
})

describe('waivers file', () => {
  it('reads a missing file as no waivers and appends through addWaiver', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hogwash-waivers-'))
    expect(await readWaivers(cwd)).toEqual([])
    const first = await addWaiver(cwd, waiver('r', 'x', 4))
    expect(first).toEqual({ path: join(cwd, '.hogwash', 'waivers.json'), total: 1 })
    const second = await addWaiver(cwd, waiver('r', 'y'))
    expect(second.total).toBe(2)
    expect(await readWaivers(cwd)).toEqual([waiver('r', 'x', 4), waiver('r', 'y')])
  })

  it('rejects a malformed file', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hogwash-waivers-'))
    mkdirSync(join(cwd, '.hogwash'))
    writeFileSync(join(cwd, '.hogwash', 'waivers.json'), '{"version":2,"waivers":[]}', 'utf8')
    await expect(readWaivers(cwd)).rejects.toBeInstanceOf(HogwashError)
  })
})
