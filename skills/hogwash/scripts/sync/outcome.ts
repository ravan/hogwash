import type { SyncOutcome } from './run.js'
import type { SyncSourceName } from './source.js'

/** The one outcome-line format, shared by --source and --all (spec §4.2). */
export function describeOutcome(source: SyncSourceName, outcome: SyncOutcome): string {
  switch (outcome.kind) {
    case 'bootstrapped':
      return `${source}: bootstrapped (r${outcome.revision}) ${outcome.lines} snapshot lines`
    case 'unchanged':
      return `${source}: unchanged (r${outcome.revision})`
    case 'updated':
      return `${source}: updated (r${outcome.revision}) +${outcome.pack.added} rules, ${outcome.duplicates} duplicates, ${outcome.dropped} dropped, ${outcome.rejected} rejected in all; pack ${outcome.pack.deprecated} deprecated, ${outcome.pack.retimed} re-timed`
    case 'drifted':
      return `${source}: drift (r${outcome.revision}) +${outcome.added}/-${outcome.removed} lines, nothing written`
    case 'failed':
      return `${source}: failed, ${outcome.reason}`
    case 'unsafe':
      return `${source}: unsafe, ${outcome.findings.length} blocking injection ${outcome.findings.length === 1 ? 'finding' : 'findings'}, nothing written`
  }
}
