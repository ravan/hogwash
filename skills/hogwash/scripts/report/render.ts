import type { FileReport, Report, ReportFinding, Severity } from '../types.js'
import { palette } from './color.js'

export type TerminalOptions = {
  readonly color?: boolean
  readonly snippet?: number
  readonly detail?: boolean
}

const MARKS: Record<Severity, string> = { error: 'x', warning: '!', info: 'i' }
const oneLine = (text: string, limit: number): string => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length <= limit ? flat : `${flat.slice(0, limit - 1)}…`
}

export const stateOf = (finding: ReportFinding): 'actionable' | 'advisory' | 'waived' =>
  finding.waived ? 'waived' : finding.actionable ? 'actionable' : 'advisory'

export const noteCell = (finding: ReportFinding): string =>
  `${finding.message}${finding.actionable ? '' : finding.waived ? ' (waived)' : ' (advisory)'}`

const locationOf = (finding: ReportFinding): string => {
  const start = finding.location.start
  const end = finding.location.end
  return `${start.line}:${start.column}-${end.line}:${end.column}`
}

const verdict = (file: FileReport, threshold: number): string =>
  file.density > threshold ? 'FAIL' : 'PASS'

const summary = (report: Report): string => {
  const findings = report.files.flatMap((file) => file.findings)
  const actionable = findings.filter((finding) => finding.actionable).length
  const waived = findings.filter((finding) => finding.waived).length
  const advisory = findings.length - actionable - waived
  return `${findings.length} finding${findings.length === 1 ? '' : 's'} in ${report.files.length} file${
    report.files.length === 1 ? '' : 's'
  } · ${actionable} actionable · ${advisory} advisory${waived === 0 ? '' : ` · ${waived} waived`}`
}

export function renderTerminal(report: Report, options: TerminalOptions = {}): string {
  const paints = palette(options.color === true)
  const limit = options.snippet ?? (options.detail === true ? 120 : 56)
  const sections: string[] = []
  for (const file of report.files) {
    sections.push(
      `${paints.bold(file.path)}  ${file.words} words · density ${file.density.toFixed(1)}/${
        report.threshold
      } · ${verdict(file, report.threshold)}`,
    )
    if (file.findings.length === 0) continue
    for (const finding of file.findings) {
      const state = stateOf(finding)
      if (options.detail === true) {
        sections.push(
          `  ${MARKS[finding.severity]} ${finding.ruleId}  ${locationOf(finding)}  ${state}`,
          `      ${finding.message}`,
          `      | ${oneLine(finding.match, limit)}`,
        )
      } else {
        const suggestion =
          finding.suggestion === undefined || finding.suggestion === null
            ? '-'
            : finding.suggestion === ''
              ? '(delete)'
              : `"${oneLine(finding.suggestion, limit)}"`
        sections.push(
          `  ${MARKS[finding.severity]}  ${finding.ruleId}  ${locationOf(finding)}  ${state}  "${oneLine(
            finding.match,
            limit,
          )}"  ${suggestion}`,
        )
      }
    }
  }
  sections.push(summary(report))
  return sections.join('\n')
}
