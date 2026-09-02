import type { ConfigOverrides } from './config.js'
import type { HookAction, ReportFormat, ScanFormat } from './shell.js'
import type { ModelFamily, Register, Severity } from './types.js'

export type ScanCommand = {
  readonly kind: 'scan'
  readonly files: readonly string[]
  readonly format: ScanFormat
  readonly verbose: boolean
  readonly overrides: ConfigOverrides
  /**
   * Fail on any finding at or above this severity, whatever the density says.
   * Density answers "does this read as machine writing"; a house rule answers
   * "is this mine", and one breach of it is one too many. Null leaves the exit
   * code to the density alone.
   */
  readonly failOn: Severity | null
  /** Also freeze each file's report as `.hogwash/<stem>-baseline.json` when none exists. */
  readonly baseline: boolean
}

/** Record one owner waiver in `.hogwash/waivers.json`. */
export type WaiveCommand = {
  readonly kind: 'waive'
  readonly original: string
  readonly rule: string
  readonly match: string
  readonly reason: string
  readonly line: number | null
}

/**
 * Replace the original with its candidate — after a final scan of the
 * candidate finds nothing actionable beyond owner-waived rows.
 */
export type AcceptCommand = {
  readonly kind: 'accept'
  readonly original: string
  readonly approved: true
  readonly register: Register | null
}

export type RedlineCommand = {
  readonly kind: 'redline'
  readonly original: string
  readonly notes: string | null
  readonly out: string | null
  readonly register: Register | null
  /** Launch the written report in the system's default browser. */
  readonly open: boolean
}

export type Command =
  | ScanCommand
  | RedlineCommand
  | WaiveCommand
  | AcceptCommand
  | { readonly kind: 'consult'; readonly family: ModelFamily; readonly candidate: string }
  | { readonly kind: 'diff'; readonly original: string }
  | { readonly kind: 'rules'; readonly explain: string | null }
  | { readonly kind: 'report'; readonly format: ReportFormat }
  | { readonly kind: 'hook'; readonly action: HookAction }
  | { readonly kind: 'init' }
