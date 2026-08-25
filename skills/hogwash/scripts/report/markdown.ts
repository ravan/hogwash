import type { Report, ReportFinding } from '../types.js'
import { noteCell } from './render.js'

const cell = (text: string): string => text.replaceAll('|', '\\|')
const quote = (finding: ReportFinding): string =>
  `\`${cell(finding.match.replace(/\s+/g, ' ')).replaceAll('`', '')}\``
const location = (finding: ReportFinding): string =>
  `${finding.location.start.line}:${finding.location.start.column}-${finding.location.end.line}:${finding.location.end.column}`

export function renderMarkdown(report: Report): string {
  const summary = [
    '| file | words | density | threshold | status |',
    '| --- | --- | --- | --- | --- |',
    ...report.files.map(
      (file) =>
        `| ${file.path} | ${file.words} | ${file.density.toFixed(1)} | ${report.threshold} | ${
          file.density > report.threshold ? 'fail' : 'pass'
        } |`,
    ),
  ].join('\n')
  const sections = ['## hogwash', summary]
  const withFindings = report.files.filter((file) => file.findings.length > 0)
  if (withFindings.length === 0) sections.push('No findings.')
  for (const file of withFindings) {
    sections.push(
      [
        `### ${file.path}`,
        '',
        '| location | offsets | rule | quote | severity | state | note |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        ...file.findings.map(
          (finding) =>
            `| ${location(finding)} | ${finding.start}-${finding.end} | \`${finding.ruleId}\` | ${quote(
              finding,
            )} | ${finding.severity} | ${finding.actionable ? 'actionable' : 'advisory'} | ${cell(
              noteCell(finding),
            )} |`,
        ),
      ].join('\n'),
    )
  }
  return sections.join('\n\n')
}
