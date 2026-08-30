import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { changedLines } from '../../../skills/hogwash/scripts/sync/diff.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../fixtures/sync/${name}`, import.meta.url), 'utf8')

describe('changedLines', () => {
  it('reports nothing for identical texts', () => {
    expect(changedLines('a\nb\n', 'a\nb\n')).toEqual({ added: [], removed: [] })
  })

  it('reports one replaced line', () => {
    expect(changedLines('a\nb\n', 'a\nc\n')).toEqual({ added: ['c'], removed: ['b'] })
  })

  it('treats reordering as no change', () => {
    expect(changedLines('a\nb\nc\n', 'c\nb\na\n')).toEqual({ added: [], removed: [] })
  })

  it('counts a second copy of a line once', () => {
    expect(changedLines('x\n', 'x\nx\n')).toEqual({ added: ['x'], removed: [] })
  })

  it('reports every line of a text added from nothing', () => {
    expect(changedLines('', 'a\nb\n')).toEqual({ added: ['a', 'b'], removed: [] })
  })

  it('reports the stale snapshot against the expected page', () => {
    const changes = changedLines(fixture('snapshot-stale.txt'), fixture('page.expected.txt'))
    expect(changes.added).toEqual([
      'Words to watch: delve, tapestry, testament to',
      'Kumba stands as a testament to regional trade.',
    ])
    expect(changes.removed).toEqual(['Words to watch: rich tapestry of legacy signs'])
  })
})
