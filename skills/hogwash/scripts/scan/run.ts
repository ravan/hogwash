import type { ScanCommand } from '../commands.js'
import type { Config } from '../config.js'
import { applyOverrides } from '../config.js'
import { readDocuments } from '../io.js'
import { reportProgress } from '../progress.js'
import { buildReport, exitCodeForReport } from '../report/build.js'
import { renderTerminal } from '../report/render.js'
import { buildSarif, renderSarif } from '../report/sarif.js'
import { writeBaseline, writeReport } from '../report/store.js'
import type { LoadedRule } from '../rules/packs.js'
import { lexicalRules, structuralRules, stylometricRules } from '../rules/packs.js'
import type { Shell } from '../shell.js'
import type { ExitCode } from '../types.js'
import { readWaivers } from '../waivers.js'

const count = (value: number, singular: string, plural: string): string =>
  `${value} ${value === 1 ? singular : plural}`

/** Run a deterministic scanner pass and render its requested result format. */
export async function runScan(input: {
  readonly command: ScanCommand
  readonly config: Config
  readonly selected: readonly LoadedRule[]
  readonly shell: Shell
}): Promise<ExitCode> {
  const { command, selected, shell } = input
  const config = applyOverrides(input.config, command.overrides)
  reportProgress(shell, 'scan', `reading ${count(command.files.length, 'file', 'files')}`, 'info')
  const documents = await readDocuments(command.files)
  reportProgress(
    shell,
    'scan',
    `scanning ${count(documents.length, 'file', 'files')} with ${selected.length} active rules`,
    'info',
  )
  const report = buildReport(
    documents,
    {
      lexical: lexicalRules(selected),
      stylometric: stylometricRules(selected),
      structural: structuralRules(selected),
    },
    config,
    shell.now(),
    { waivers: await readWaivers(shell.cwd), cwd: shell.cwd },
  )
  reportProgress(shell, 'scan', 'writing the report', 'info')
  await writeReport(shell.cwd, report)
  if (command.baseline) {
    for (const file of report.files) {
      const frozen = await writeBaseline(shell.cwd, { ...report, files: [file] })
      reportProgress(
        shell,
        'scan',
        frozen.created
          ? `baseline frozen at ${frozen.path}`
          : `baseline already exists at ${frozen.path}; kept as is`,
        frozen.created ? 'success' : 'warning',
      )
    }
  }
  switch (command.format) {
    case 'terminal':
      shell.stdout(renderTerminal(report, { color: shell.color === true, detail: command.verbose }))
      break
    case 'json':
      shell.stdout(JSON.stringify(report, null, 2))
      break
    case 'sarif':
      shell.stdout(renderSarif(buildSarif(report, documents, selected)))
      break
  }
  const findings = report.files.reduce((total, file) => total + file.findings.length, 0)
  reportProgress(
    shell,
    'scan',
    `complete: ${count(findings, 'finding', 'findings')} in ${count(
      report.files.length,
      'file',
      'files',
    )}`,
    'success',
  )
  return exitCodeForReport(report, command.failOn)
}
