import { z } from 'zod'
import { HogwashError } from '../errors.js'

import { SYNC_SOURCE_NAMES, type SyncSourceName, SyncSourceNameSchema } from './source.js'

export const SyncFamilySchema = z.enum(['claude', 'codex'])
export type SyncFamily = z.infer<typeof SyncFamilySchema>

export type SyncSelection =
  | { readonly kind: 'one'; readonly source: SyncSourceName }
  | { readonly kind: 'all' }

export type SyncArgs = {
  readonly family: SyncFamily
  readonly selection: SyncSelection
  readonly familyGiven: boolean
  /** Prose sources only, like --family. Structured sources always write. */
  readonly detectOnly: boolean
  readonly prBodyPath: string | null
}

function usage(message: string): HogwashError {
  return new HogwashError({ kind: 'usage', message })
}

/** Throws HogwashError{kind:'usage'} on an unknown flag, family or source. */
export function parseSyncArgs(argv: readonly string[]): SyncArgs {
  let family: SyncFamily = 'claude'
  let source: SyncSourceName = 'wikipedia-signs'
  let familyGiven = false
  let detectOnly = false
  let prBodyPath: string | null = null
  let allGiven = false
  let sourceGiven = false
  let at = 0
  while (at < argv.length) {
    const token = argv[at]
    if (token === '--all') {
      allGiven = true
      at += 1
      continue
    }
    if (token === '--detect-only') {
      detectOnly = true
      at += 1
      continue
    }
    if (token !== '--family' && token !== '--source' && token !== '--pr-body') {
      throw usage(
        `Unknown option ${token}. Only --all, --source, --family, --detect-only and --pr-body are accepted.`,
      )
    }
    const value = argv[at + 1]
    if (value === undefined) {
      if (token === '--family') throw usage('--family needs a value: claude or codex.')
      if (token === '--pr-body') throw usage('--pr-body needs a value: a file path.')
      throw usage(`--source needs a value: ${SYNC_SOURCE_NAMES.join(' or ')}.`)
    }
    if (token === '--family') {
      const parsed = SyncFamilySchema.safeParse(value)
      if (!parsed.success) throw usage(`Cannot sync with the ${value} family. Use claude or codex.`)
      family = parsed.data
      familyGiven = true
    } else if (token === '--pr-body') {
      if (value === '') throw usage('--pr-body needs a value: a file path.')
      prBodyPath = value
    } else {
      const parsed = SyncSourceNameSchema.safeParse(value)
      if (!parsed.success) {
        throw usage(`Unknown sync source ${value}. Use ${SYNC_SOURCE_NAMES.join(' or ')}.`)
      }
      source = parsed.data
      sourceGiven = true
    }
    at += 2
  }
  if (allGiven && sourceGiven) {
    throw usage('--all runs every source, so it cannot be given with --source. Pick one.')
  }
  return {
    family,
    selection: allGiven ? { kind: 'all' } : { kind: 'one', source },
    familyGiven,
    detectOnly,
    prBodyPath,
  }
}
