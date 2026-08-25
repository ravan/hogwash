import { z } from 'zod'
import type { AgentQuery } from '../adapters/types.js'
import { extractJsonObject } from '../json.js'
import { EraSchema, ReplacementSchema, RuleExamplesSchema } from '../rules/schema.js'
import { CategorySchema, type RuleId, RuleIdSchema, SeveritySchema } from '../types.js'

export type ExistingRule = { readonly id: RuleId; readonly message: string }

export type IdPolicy =
  | { readonly kind: 'prefixed'; readonly prefix: string }
  | { readonly kind: 'free' }

export type DraftRequest = {
  readonly added: readonly string[]
  readonly removed: readonly string[]
  readonly existing: readonly ExistingRule[]
  readonly idPolicy: IdPolicy
}

const draftedCommon = {
  id: RuleIdSchema,
  category: CategorySchema,
  era: EraSchema,
  severity: SeveritySchema,
  weight: z.number().positive().default(1),
  message: z.string().min(1),
  section: z.string().min(1),
  examples: RuleExamplesSchema,
}

/** Every drafted rule is lexical: it is the one engine a page diff can support. */
export const DraftedRuleSchema = z.object({
  ...draftedCommon,
  engine: z.literal('lexical'),
  pattern: z.string().min(1),
  replacements: z.array(ReplacementSchema).default([]),
})
export type DraftedRule = z.infer<typeof DraftedRuleSchema>

export const RuleEditSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('add'), rule: DraftedRuleSchema }),
  z.object({ kind: z.literal('deprecate'), id: RuleIdSchema, reason: z.string().min(1) }),
  z.object({ kind: z.literal('era'), id: RuleIdSchema, era: EraSchema }),
])
export type RuleEdit = z.infer<typeof RuleEditSchema>

export type DraftOutcome =
  | { readonly kind: 'drafted'; readonly edits: readonly RuleEdit[] }
  | { readonly kind: 'unusable'; readonly reason: string }
export type Drafter = (request: DraftRequest) => Promise<DraftOutcome>

export const DRAFT_LINE_LIMIT = 120

// Verbatim exception: the model must return the exact machine-readable shape.
export const DRAFT_SYSTEM_PROMPT = [
  'You draft candidate rules for a prose linter from an encyclopedia page diff.',
  '',
  'Hard limits:',
  '- Never say that a text is machine-generated, and never name an author.',
  '- A rule describes a writing habit only: wording, structure, rhythm,',
  '  formatting or leftover interface residue.',
  '- Rule ids are dotted and lower-case.',
  '- Never reuse an id that already exists.',
  '- A rule needs a JavaScript regular expression. It is matched',
  '  case-insensitively, so never add case-only alternatives.',
  '- Every rule needs at least one matching example and at least one clean',
  '  example that the rule must not match.',
  '- Propose nothing that the supplied lines do not support.',
  '',
  'Answer with one JSON object and nothing else:',
  '{"edits":[ … ]}',
  'Each edit is one of:',
  '{"kind":"add","rule":{"engine":"lexical","id":"…","category":"…","era":"…",',
  '"severity":"…","message":"…","section":"…","pattern":"…",',
  '"examples":{"matching":["…"],"clean":["…"]}}}',
  '{"kind":"deprecate","id":"…","reason":"…"}',
  '{"kind":"era","id":"…","era":"…"}',
  'When the lines support no edit at all, answer {"edits":[]}.',
].join('\n')

/** Splits added lines into drafting batches; an empty list yields one empty batch. */
export function draftBatches(
  added: readonly string[],
  size: number,
): readonly (readonly string[])[] {
  if (added.length === 0) return [[]]
  const batches: (readonly string[])[] = []
  for (let at = 0; at < added.length; at += size) batches.push(added.slice(at, at + size))
  return batches
}

const DraftReplySchema = z.object({ edits: z.array(RuleEditSchema) })

function lineBlock(title: string, lines: readonly string[], noun: string): readonly string[] {
  const shown = lines.slice(0, DRAFT_LINE_LIMIT)
  const block = [title, ...shown]
  if (lines.length > shown.length) {
    block.push(`${lines.length - shown.length} more ${noun} lines omitted`)
  }
  return block
}

export function buildDraftPrompt(request: DraftRequest): string {
  return [
    `Allowed categories: ${CategorySchema.options.join(', ')}`,
    `Allowed eras: ${EraSchema.options.join(', ')}`,
    `Allowed severities: ${SeveritySchema.options.join(', ')}`,
    ...(request.idPolicy.kind === 'prefixed'
      ? [`Every rule id must start with "${request.idPolicy.prefix}".`]
      : []),
    '',
    'Rules that already exist:',
    ...request.existing.map((rule) => `${rule.id} — ${rule.message}`),
    '',
    ...lineBlock('Lines added to the page:', request.added, 'added'),
    '',
    ...lineBlock('Lines removed from the page:', request.removed, 'removed'),
    '',
    'Answer with one JSON object holding an "edits" array and nothing else.',
  ].join('\n')
}

export function parseDraftReply(text: string): DraftOutcome {
  const object = extractJsonObject(text)
  if (object === null) return { kind: 'unusable', reason: 'no JSON object in the reply' }

  let parsed: unknown
  try {
    parsed = JSON.parse(object)
  } catch (error) {
    return { kind: 'unusable', reason: error instanceof Error ? error.message : String(error) }
  }

  const result = DraftReplySchema.safeParse(parsed)
  if (!result.success) {
    return {
      kind: 'unusable',
      reason: result.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; '),
    }
  }
  return { kind: 'drafted', edits: result.data.edits }
}

export function createDrafter(query: AgentQuery): Drafter {
  return async (request) => {
    try {
      return parseDraftReply(
        await query({
          systemPrompt: DRAFT_SYSTEM_PROMPT,
          prompt: buildDraftPrompt(request),
        }),
      )
    } catch (error) {
      return { kind: 'unusable', reason: error instanceof Error ? error.message : String(error) }
    }
  }
}
