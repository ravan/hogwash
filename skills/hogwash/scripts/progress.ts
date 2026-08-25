import { palette } from './report/color.js'
import type { Shell } from './shell.js'

export type ProgressCommand = 'scan' | 'fix'
export type ProgressStatus = 'info' | 'success' | 'warning'

export type ProgressLine = {
  readonly at: string
  readonly command: ProgressCommand
  readonly message: string
  readonly status: ProgressStatus
}

const timeOf = (instant: string): string => {
  const parsed = new Date(instant)
  if (Number.isNaN(parsed.getTime())) return instant
  return [parsed.getHours(), parsed.getMinutes(), parsed.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

/** Render one stable log line; the shell supplies the clock value. */
export function renderProgressLine(line: ProgressLine, color: boolean): string {
  const paints = palette(color)
  const message =
    line.status === 'success'
      ? paints.green(line.message)
      : line.status === 'warning'
        ? paints.yellow(line.message)
        : line.message
  return `${paints.dim(timeOf(line.at))} ${paints.cyan(`[${line.command}]`)} ${message}`
}

/** Write an immediate command milestone without touching stdout. */
export function reportProgress(
  shell: Shell,
  command: ProgressCommand,
  message: string,
  status: ProgressStatus,
): void {
  shell.stderr(
    renderProgressLine({ at: shell.now(), command, message, status }, shell.color === true),
  )
}
