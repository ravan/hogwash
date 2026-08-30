import { describe, expect, it } from 'bun:test'
import type { SourceResult } from '../../../skills/hogwash/scripts/sync/all.js'
import { renderPrBody } from '../../../skills/hogwash/scripts/sync/pr.js'

describe('renderPrBody', () => {
  it('lists one bullet per source when nothing drifted', () => {
    const results: readonly SourceResult[] = [
      { source: 'excess-vocab-csv', outcome: { kind: 'unchanged', revision: 42 } },
      { source: 'slop-gate', outcome: { kind: 'failed', reason: 'nope' } },
    ]
    expect(renderPrBody(results)).toBe(
      '# Rule sync\n\n- excess-vocab-csv: unchanged (r42)\n- slop-gate: failed, nope\n',
    )
  })

  it('adds a drift section when a source drifted', () => {
    const results: readonly SourceResult[] = [
      {
        source: 'wikipedia-signs',
        outcome: { kind: 'drifted', revision: 7, added: 5, removed: 1 },
      },
      { source: 'excess-vocab-csv', outcome: { kind: 'unchanged', revision: 42 } },
    ]
    expect(renderPrBody(results)).toBe(
      '# Rule sync\n\n- wikipedia-signs: drift (r7) +5/-1 lines, nothing written\n- excess-vocab-csv: unchanged (r42)\n\n## Drift not written\n\n- wikipedia-signs: +5/-1 lines\n\nProse sources ran detect-only because no agent credential was configured. Their snapshots are unchanged, so a local drafting run still sees the whole diff.\n',
    )
  })

  it('renders a heading alone for no results', () => {
    expect(renderPrBody([])).toBe('# Rule sync\n\n')
  })
})
