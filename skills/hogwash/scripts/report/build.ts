import type { Config } from '../config.js'
import type { LexicalRule, StructuralRule, StylometricRule } from '../rules/schema.js'
import { density } from '../scan/density.js'
import { scanText } from '../scan/lexical.js'
import { scanStructure } from '../scan/structural.js'
import { scanStylometry } from '../scan/stylometry.js'
import { countProseWords, segment } from '../segment/markdown.js'
import type { Finding, Register, Report } from '../types.js'
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

export function buildReport(
  documents: readonly Document[],
  rules: ScanRules,
  config: Config,
  createdAt: string,
): Report {
  return {
    version: 6,
    createdAt,
    register: config.register,
    threshold: config.threshold,
    files: documents.map((document) => {
      const findings = scanFindings(document.text, rules, config.register)
      const lineIndex = buildLineIndex(document.text)
      const words = countProseWords(document.text, segment(document.text))
      return {
        path: document.path,
        words,
        density: density(findings, words),
        findings: findings.map((finding) => ({
          ...finding,
          location: {
            start: lineColumnAt(lineIndex, finding.start),
            end: lineColumnAt(lineIndex, finding.end),
          },
        })),
      }
    }),
  }
}

export function exitCodeForReport(report: Report): 0 | 1 {
  return report.files.some((file) => file.density > report.threshold) ? 1 : 0
}
