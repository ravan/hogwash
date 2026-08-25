import type { ConfigOverrides } from './config.js'
import type { HookAction, ReportFormat, ScanFormat } from './shell.js'
import type { ModelFamily } from './types.js'

export type ScanCommand = {
  readonly kind: 'scan'
  readonly files: readonly string[]
  readonly format: ScanFormat
  readonly verbose: boolean
  readonly overrides: ConfigOverrides
}

export type Command =
  | ScanCommand
  | { readonly kind: 'consult'; readonly family: ModelFamily; readonly candidate: string }
  | { readonly kind: 'diff'; readonly original: string }
  | { readonly kind: 'accept'; readonly original: string; readonly approved: true }
  | { readonly kind: 'rules'; readonly explain: string | null }
  | { readonly kind: 'report'; readonly format: ReportFormat }
  | { readonly kind: 'hook'; readonly action: HookAction }
  | { readonly kind: 'init' }
