import { HogwashError } from './errors.js'
import { exitCodeForReport } from './report/build.js'
import { renderMarkdown } from './report/markdown.js'
import { renderTerminal } from './report/render.js'
import { readReport } from './report/store.js'
import type { ReportFormat, Shell } from './shell.js'
import type { ExitCode } from './types.js'

/** Replay the stored report in a human-readable format. */
export async function runReport(format: ReportFormat, shell: Shell): Promise<ExitCode> {
  const report = await readReport(shell.cwd)
  shell.stdout(
    format === 'md'
      ? renderMarkdown(report)
      : renderTerminal(report, { color: shell.color === true }),
  )
  return exitCodeForReport(report)
}

/** Map a typed command failure onto its stderr line and process exit code. */
export function reportFailure(error: unknown, stderr: (line: string) => void): ExitCode {
  if (error instanceof HogwashError) {
    const failure = error.failure
    switch (failure.kind) {
      case 'usage':
      case 'config':
        stderr(failure.message)
        return 2
      case 'io':
        stderr(`${failure.path}: ${failure.message}`)
        return 2
      case 'adapter':
        stderr(`${failure.family}: ${failure.message}`)
        return 2
    }
  }
  stderr(error instanceof Error ? error.message : String(error))
  return 2
}
