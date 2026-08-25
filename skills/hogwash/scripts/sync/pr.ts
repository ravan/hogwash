import type { SourceResult } from './all.js'
import { describeOutcome } from './outcome.js'

const DETECT_NOTE =
  'Prose sources ran detect-only because no agent credential was configured. Their snapshots are unchanged, so a local drafting run still sees the whole diff.'

/** Markdown for the scheduled workflow's pull-request body (spec §3.6). */
export function renderPrBody(results: readonly SourceResult[]): string {
  const bullets = results.map((result) => `- ${describeOutcome(result.source, result.outcome)}\n`)
  const body = `# Rule sync\n\n${bullets.join('')}`
  const drifted = results.flatMap((result) =>
    result.outcome.kind === 'drifted'
      ? [`- ${result.source}: +${result.outcome.added}/-${result.outcome.removed} lines\n`]
      : [],
  )
  if (drifted.length === 0) return body
  return `${body}\n## Drift not written\n\n${drifted.join('')}\n${DETECT_NOTE}\n`
}
