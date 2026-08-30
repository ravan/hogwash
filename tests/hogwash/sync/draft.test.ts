import { describe, expect, it } from 'bun:test'
import type { AgentQuery } from '../../../skills/hogwash/scripts/adapters/types.js'
import { EraSchema } from '../../../skills/hogwash/scripts/rules/schema.js'
import type { DraftRequest } from '../../../skills/hogwash/scripts/sync/draft.js'
import {
  buildDraftPrompt,
  createDrafter,
  DRAFT_LINE_LIMIT,
  DRAFT_SYSTEM_PROMPT,
  draftBatches,
  parseDraftReply,
} from '../../../skills/hogwash/scripts/sync/draft.js'
import { CategorySchema, RuleIdSchema } from '../../../skills/hogwash/scripts/types.js'

const request = (overrides: Partial<DraftRequest> = {}): DraftRequest => ({
  added: ['Words to watch: delve'],
  removed: ['old line'],
  existing: [{ id: RuleIdSchema.parse('wiki.vocab.delve'), message: 'delve is over-used' }],
  idPolicy: { kind: 'prefixed', prefix: 'wiki.' },
  ...overrides,
})

describe('buildDraftPrompt', () => {
  it('states the changed lines, the existing rules and the allowed values', () => {
    const prompt = buildDraftPrompt(request())
    expect(prompt).toContain('Words to watch: delve')
    expect(prompt).toContain('old line')
    expect(prompt).toContain('wiki.vocab.delve')
    for (const category of CategorySchema.options) expect(prompt).toContain(category)
    for (const era of EraSchema.options) expect(prompt).toContain(era)
  })

  it('truncates a long added list and says how many lines it dropped', () => {
    const added = Array.from({ length: 130 }, (_, index) => `line-${index + 1}`)
    const prompt = buildDraftPrompt(request({ added }))
    expect(prompt).toContain(`line-${DRAFT_LINE_LIMIT}`)
    expect(prompt).not.toContain(`line-${DRAFT_LINE_LIMIT + 1}`)
    expect(prompt).toContain('10 more added lines omitted')
  })

  it('states the id prefix the source requires', () => {
    const prompt = buildDraftPrompt(request({ idPolicy: { kind: 'prefixed', prefix: 'wiki.' } }))
    expect(prompt).toContain('Every rule id must start with "wiki.".')
  })

  it('says nothing about a prefix for a free policy', () => {
    const prompt = buildDraftPrompt(request({ idPolicy: { kind: 'free' } }))
    expect(prompt).not.toContain('must start with')
  })
})

describe('DRAFT_SYSTEM_PROMPT', () => {
  it('names no pack-specific id prefix', () => {
    expect(DRAFT_SYSTEM_PROMPT).not.toContain('wiki.')
  })
})

describe('draftBatches', () => {
  it('yields one empty batch for an empty list', () => {
    expect(draftBatches([], 3)).toEqual([[]])
  })

  it('keeps a list that fits in one batch', () => {
    expect(draftBatches(['a', 'b', 'c'], 3)).toEqual([['a', 'b', 'c']])
  })

  it('splits a list that overflows the batch size', () => {
    expect(draftBatches(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']])
  })
})

describe('parseDraftReply', () => {
  it('reads an empty edit list', () => {
    expect(parseDraftReply('{"edits":[]}')).toEqual({ kind: 'drafted', edits: [] })
  })

  it('reads a fenced reply wrapped in prose', () => {
    const reply = [
      'Here is what I found.',
      '```json',
      '{"edits":[{"kind":"deprecate","id":"wiki.vocab.old","reason":"era passed"}]}',
      '```',
    ].join('\n')
    expect(parseDraftReply(reply)).toEqual({
      kind: 'drafted',
      edits: [
        { kind: 'deprecate', id: RuleIdSchema.parse('wiki.vocab.old'), reason: 'era passed' },
      ],
    })
  })

  it('reports a reply with no JSON object', () => {
    expect(parseDraftReply('no json here')).toEqual({
      kind: 'unusable',
      reason: 'no JSON object in the reply',
    })
  })

  const addReply = (weight: string): string =>
    `{"edits":[{"kind":"add","rule":{"engine":"lexical","id":"wiki.vocab.woven","category":"vocabulary","era":"gpt4","severity":"warning","message":"m","section":"s","pattern":"\\\\bwoven\\\\b","examples":{"matching":["woven"],"clean":["rug"]}${weight}}}]}`

  const weightOf = (reply: string): number | null => {
    const outcome = parseDraftReply(reply)
    if (outcome.kind !== 'drafted') return null
    const edit = outcome.edits[0]
    if (edit?.kind !== 'add') return null
    return edit.rule.weight
  }

  it('defaults a drafted rule to weight 1', () => {
    expect(weightOf(addReply(''))).toBe(1)
  })

  it('keeps a weight the reply states', () => {
    expect(weightOf(addReply(',"weight":2.5'))).toBe(2.5)
  })

  it('refuses a weight of zero', () => {
    expect(parseDraftReply(addReply(',"weight":0')).kind).toBe('unusable')
  })

  it('reports an edit missing required fields', () => {
    const outcome = parseDraftReply('{"edits":[{"kind":"add","rule":{"engine":"lexical"}}]}')
    expect(outcome.kind).toBe('unusable')
    expect(outcome.kind === 'unusable' && outcome.reason).toContain('id')
  })
})

describe('createDrafter', () => {
  it('parses the query reply', async () => {
    const query: AgentQuery = async () => '{"edits":[]}'
    await expect(createDrafter(query)(request())).resolves.toEqual({ kind: 'drafted', edits: [] })
  })

  it('reports a thrown query as unusable', async () => {
    const query: AgentQuery = async () => {
      throw new Error('boom')
    }
    await expect(createDrafter(query)(request())).resolves.toEqual({
      kind: 'unusable',
      reason: 'boom',
    })
  })
})
