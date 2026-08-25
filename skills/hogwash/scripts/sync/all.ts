import type { SyncSelection } from './args.js'
import { describeOutcome } from './outcome.js'
import type { SyncOutcome } from './run.js'
import type { SyncSource, SyncSourceName } from './source.js'
import { SYNC_SOURCE_NAMES, sourceOf } from './source.js'

export type SourceResult = {
  readonly source: SyncSourceName
  readonly outcome: SyncOutcome
}
export type SyncExitCode = 0 | 2
export type RunAllDeps = {
  readonly sources: readonly SyncSource[]
  readonly run: (source: SyncSource) => Promise<SyncOutcome>
  readonly report: (line: string) => void
}
export type RunAllOutcome = {
  readonly results: readonly SourceResult[]
  readonly exitCode: SyncExitCode
}

/** Registry order for 'all'; the one named source for 'one'. */
export function selectedSources(selection: SyncSelection): readonly SyncSource[] {
  if (selection.kind === 'all') return SYNC_SOURCE_NAMES.map((name) => sourceOf(name))
  return [sourceOf(selection.source)]
}

/** Runs every source in order, continues past a failure (spec §3.5). */
export async function runAll(deps: RunAllDeps): Promise<RunAllOutcome> {
  const results: SourceResult[] = []
  for (const source of deps.sources) {
    let outcome: SyncOutcome
    try {
      outcome = await deps.run(source)
    } catch (error) {
      outcome = {
        kind: 'failed',
        reason: error instanceof Error ? error.message : String(error),
      }
    }
    results.push({ source: source.name, outcome })
    deps.report(describeOutcome(source.name, outcome))
  }
  const bad = results.some(
    (result) => result.outcome.kind === 'failed' || result.outcome.kind === 'unsafe',
  )
  return { results, exitCode: bad ? 2 : 0 }
}
