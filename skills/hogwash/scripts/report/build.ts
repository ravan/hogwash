import type { Config } from '../config.js'
import type { LexicalRule, StructuralRule, StylometricRule } from '../rules/schema.js'
import { density } from '../scan/density.js'
import { scanText } from '../scan/lexical.js'
import { scanStructure } from '../scan/structural.js'
import { scanStylometry } from '../scan/stylometry.js'
import { countProseWords, segment } from '../segment/markdown.js'
import type { Finding, Register, Report, Severity } from '../types.js'
import type { Waiver } from '../waivers.js'
import { applyWaivers, waiversFor } from '../waivers.js'
import { fingerprintOf } from './fingerprint.js'
import { buildLineIndex, lineColumnAt } from './position.js'

export type Document = { readonly path: string; readonly text: string }

export type ScanRules = {
  readonly lexical: readonly LexicalRule[]
  readonly stylometric: readonly StylometricRule[]
  readonly structural: readonly StructuralRule[]
}

const byOffset = (left: Finding, right: Finding): number =>
  left.start - right.start ||
  left.end - right.end ||
  (left.ruleId < right.ruleId ? -1 : left.ruleId > right.ruleId ? 1 : 0)

/** One document through every scanner, merged and ordered — the scan itself. */
export function scanFindings(text: string, rules: ScanRules, register: Register): Finding[] {
  return [
    ...scanText(text, rules.lexical, register),
    ...scanStylometry(text, rules.stylometric, register),
    ...scanStructure(text, rules.structural, register),
  ].sort(byOffset)
}

/** Owner waivers to honour, resolved against `cwd` (see waivers.ts). */
export type WaiverContext = { readonly waivers: readonly Waiver[]; readonly cwd: string }

export function buildReport(
  documents: readonly Document[],
  rules: ScanRules,
  config: Config,
  createdAt: string,
  waiverContext: WaiverContext = { waivers: [], cwd: '.' },
): Report {
  return {
    version: 7,
    createdAt,
    register: config.register,
    threshold: config.threshold,
    files: documents.map((document) => {
      const lineIndex = buildLineIndex(document.text)
      const words = countProseWords(document.text, segment(document.text))
      const located = scanFindings(document.text, rules, config.register).map((finding) => ({
        ...finding,
        waived: false,
        location: {
          start: lineColumnAt(lineIndex, finding.start),
          end: lineColumnAt(lineIndex, finding.end),
        },
      }))
      const findings = applyWaivers(
        located,
        waiversFor(waiverContext.waivers, document.path, waiverContext.cwd),
      )
      return {
        path: document.path,
        words,
        density: density(findings, words),
        fingerprint: fingerprintOf(findings),
        findings: [...findings],
      }
    }),
  }
}

/** True when any file still has an actionable finding — the loop's exit gate. */
export const hasActionable = (report: Report): boolean =>
  report.files.some((file) => file.findings.some((finding) => finding.actionable))

const SEVERITY_ORDER: Record<Severity, number> = { info: 0, warning: 1, error: 2 }

/**
 * The exit code. Density answers whether the document as a whole reads as
 * machine writing. `failOn` answers a different question — whether any single
 * rule at that severity fired at all — and a house rule is the sort of rule one
 * breach of already fails. Either one is enough to fail the run.
 */
export function exitCodeForReport(report: Report, failOn: Severity | null = null): 0 | 1 {
  if (report.files.some((file) => file.density > report.threshold)) return 1
  if (failOn === null) return 0
  const floor = SEVERITY_ORDER[failOn]
  return report.files.some((file) =>
    file.findings.some((finding) => !finding.waived && SEVERITY_ORDER[finding.severity] >= floor),
  )
    ? 1
    : 0
}
