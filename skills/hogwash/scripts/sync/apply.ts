import { z } from 'zod'
import { HogwashError } from '../errors.js'
import type { LexicalRule } from '../rules/schema.js'
import { loadPack } from '../rules/schema.js'
import type { AcceptedEdit } from './review.js'

/**
 * A pack file exactly as it sits on disk. Rule objects stay untyped records so
 * an edit never reorders a neighbour's keys or materializes a field its author
 * chose to omit — the reviewable diff is the point (ADR 0002).
 */
const RawRuleSchema = z.record(z.string(), z.json())
type RawRule = z.infer<typeof RawRuleSchema>

const RawPackSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  attribution: z.string().min(1),
  rules: z.array(RawRuleSchema).min(1),
})

export type PackEditCounts = {
  readonly added: number
  readonly deprecated: number
  readonly retimed: number
}

export type ApplyOutcome =
  | { readonly kind: 'applied'; readonly text: string; readonly counts: PackEditCounts }
  | { readonly kind: 'invalid'; readonly reason: string }

const KEY_ORDER = [
  'id',
  'category',
  'engine',
  'pattern',
  'flags',
  'severity',
  'weight',
  'registers',
  'advisory',
  'era',
  'deprecated',
  'gated',
  'reliable',
  'message',
  'replacements',
  'examples',
  'attribution',
] as const

function serialize(rule: LexicalRule): RawRule {
  const emitted: RawRule = {
    id: rule.id,
    category: rule.category,
    engine: rule.engine,
    severity: rule.severity,
    weight: rule.weight,
    era: rule.era,
    reliable: rule.reliable,
    message: rule.message,
    examples: { matching: [...rule.examples.matching], clean: [...rule.examples.clean] },
    attribution: rule.attribution,
  }
  const registers = rule.registers
  if (registers.technical !== 1 || registers.prose !== 1 || registers.marketing !== 1) {
    emitted.registers = { ...registers }
  }
  if (rule.advisory) emitted.advisory = true
  if (rule.deprecated) emitted.deprecated = true
  if (rule.gated !== null) emitted.gated = rule.gated
  emitted.pattern = rule.pattern
  emitted.flags = [...rule.flags]
  if (rule.replacements.length > 0) {
    emitted.replacements = rule.replacements.map((one) => ({ ...one }))
  }
  const ordered: RawRule = {}
  for (const key of KEY_ORDER) {
    const value = emitted[key]
    if (value !== undefined) ordered[key] = value
  }
  return ordered
}

function withDeprecated(rule: RawRule): RawRule {
  if ('deprecated' in rule) return { ...rule, deprecated: true }
  const ordered: RawRule = {}
  for (const [key, value] of Object.entries(rule)) {
    ordered[key] = value
    if (key === 'era') ordered.deprecated = true
  }
  return ordered
}

function indexOfId(rules: readonly RawRule[], id: string): number {
  return rules.findIndex((rule) => typeof rule.id === 'string' && rule.id === id)
}

/**
 * Applies accepted edits to a pack file's text and returns the file's new text.
 * The result is guaranteed to round-trip `loadPack`; `origin` names the file in
 * the failure reason. Pure — no I/O, no clock, no randomness — so identical
 * inputs always produce identical bytes (spec §6.1).
 */
export function applyEdits(
  current: string,
  edits: readonly AcceptedEdit[],
  origin: string,
): ApplyOutcome {
  let decoded: unknown
  try {
    decoded = JSON.parse(current)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'invalid', reason: `Could not read ${origin}: ${reason}` }
  }
  const parsed = RawPackSchema.safeParse(decoded)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
    return { kind: 'invalid', reason: `Could not read ${origin}: ${issues}` }
  }
  if (edits.length === 0) {
    return { kind: 'applied', text: current, counts: { added: 0, deprecated: 0, retimed: 0 } }
  }

  const document = parsed.data
  const rules = [...document.rules]
  if (rules.some((rule) => typeof rule.id !== 'string')) {
    return { kind: 'invalid', reason: `A rule in ${origin} has no string id.` }
  }
  let added = 0
  let deprecated = 0
  let retimed = 0

  for (const edit of edits) {
    if (edit.kind === 'add') {
      if (edit.rule.engine !== 'lexical') {
        return {
          kind: 'invalid',
          reason: `The sync cannot add the ${edit.rule.engine} rule ${edit.rule.id}; only lexical rules are drafted from a page diff.`,
        }
      }
      if (indexOfId(rules, edit.rule.id) !== -1) {
        return { kind: 'invalid', reason: `The rule id ${edit.rule.id} is already in ${origin}.` }
      }
      rules.push(serialize(edit.rule))
      added += 1
      continue
    }
    const at = indexOfId(rules, edit.id)
    if (at === -1) {
      return { kind: 'invalid', reason: `The rule id ${edit.id} is not in ${origin}.` }
    }
    const rule = rules[at]
    if (rule === undefined) {
      return { kind: 'invalid', reason: `The rule id ${edit.id} is not in ${origin}.` }
    }
    if (edit.kind === 'deprecate') {
      rules[at] = withDeprecated(rule)
      deprecated += 1
      continue
    }
    rules[at] = { ...rule, era: edit.era }
    retimed += 1
  }

  const text = `${JSON.stringify({ ...document, rules }, null, 2)}\n`
  try {
    loadPack(JSON.parse(text), origin)
  } catch (error) {
    if (!(error instanceof HogwashError)) throw error
    return { kind: 'invalid', reason: error.message }
  }
  return { kind: 'applied', text, counts: { added, deprecated, retimed } }
}
