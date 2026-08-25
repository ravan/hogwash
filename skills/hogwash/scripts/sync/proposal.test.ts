import { describe, expect, it } from 'bun:test'
import { RuleIdSchema } from '../types.js'
import type { Proposal } from './proposal.js'
import { renderProposal } from './proposal.js'

describe('renderProposal', () => {
  it('renders an empty proposal as pretty JSON with one trailing newline', () => {
    const proposal: Proposal = {
      version: 1,
      revision: 7,
      family: 'codex',
      accepted: [],
      rejected: [],
      dropped: 3,
    }
    const text = renderProposal(proposal)
    expect(text.endsWith('\n')).toBe(true)
    expect(text.endsWith('\n\n')).toBe(false)
    expect(text.split('\n')[0]).toBe('{')
    expect(JSON.parse(text)).toEqual(proposal)
  })

  it('round-trips an accepted era edit', () => {
    const edit = { kind: 'era', id: RuleIdSchema.parse('wiki.vocab.delve'), era: 'gpt5' } as const
    const text = renderProposal({
      version: 1,
      revision: 9,
      family: 'claude',
      accepted: [edit],
      rejected: [],
      dropped: 0,
    })
    const parsed: { readonly accepted: readonly unknown[]; readonly dropped: number } =
      JSON.parse(text)
    expect(parsed.accepted).toEqual([edit])
    expect(parsed.dropped).toBe(0)
  })
})
