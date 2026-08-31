import type { Models } from './adapters/tuning.js'
import type { AgentQuery } from './adapters/types.js'
import type { ModelFamily } from './types.js'

export type ScanFormat = 'terminal' | 'json' | 'sarif'
export type ReportFormat = 'terminal' | 'md'
export type HookAction = 'print' | 'install'

/** Every host-owned side effect used by the CLI core. */
export type Shell = {
  readonly cwd: string
  /** Home directory override; os.homedir() when absent. */
  readonly home?: string
  readonly now: () => string
  readonly stdout: (line: string) => void
  readonly stderr: (line: string) => void
  readonly color?: boolean
  readonly readStdin: () => Promise<string>
  readonly queryFor: (family: ModelFamily, models: Models) => AgentQuery | null
  readonly runProcess: (command: string, args: readonly string[], wait: boolean) => Promise<void>
}
