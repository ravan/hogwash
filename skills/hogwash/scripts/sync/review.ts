import {
  compileRule,
  type Era,
  type RegisterWeights,
  type Rule,
  type RulePack,
  RuleSchema,
} from '../rules/schema.js'
import { PackNameSchema, type RuleId } from '../types.js'
import type { DraftedRule, IdPolicy, RuleEdit } from './draft.js'

/** What a producer of rule edits must state so review can materialize them. */
export type EditOrigin = {
  /** The pack whose rules this origin may add to or deprecate. */
  readonly pack: string
  /** Constrains every rule id this origin may add; `free` constrains none. */
  readonly idPolicy: IdPolicy
  /** Register weights stamped onto every rule this origin produces (spec §2.5.2). */
  readonly registers: RegisterWeights
  /** Attribution stamped onto every rule this origin produces. */
  readonly attribution: (section: string) => string
}

export type AcceptedEdit =
  | { readonly kind: 'add'; readonly rule: Rule }
  | { readonly kind: 'deprecate'; readonly id: RuleId; readonly reason: string }
  | { readonly kind: 'era'; readonly id: RuleId; readonly era: Era }
export type RejectedEdit = { readonly reason: string; readonly edit: RuleEdit }
export type ReviewResult = {
  readonly accepted: readonly AcceptedEdit[]
  readonly rejected: readonly RejectedEdit[]
  readonly duplicates: number
}
export type MaterializeOutcome =
  | { readonly kind: 'rule'; readonly rule: Rule }
  | { readonly kind: 'invalid'; readonly reason: string }

const FIXED = {
  deprecated: false,
  gated: null,
  reliable: false,
} as const

export function materialize(drafted: DraftedRule, origin: EditOrigin): MaterializeOutcome {
  const common = {
    id: drafted.id,
    category: drafted.category,
    era: drafted.era,
    severity: drafted.severity,
    message: drafted.message,
    attribution: origin.attribution(drafted.section),
    examples: drafted.examples,
    deprecated: FIXED.deprecated,
    gated: FIXED.gated,
    weight: drafted.weight,
    reliable: FIXED.reliable,
    registers: origin.registers,
  }
  const result = RuleSchema.safeParse({
    ...common,
    engine: 'lexical',
    pattern: drafted.pattern,
    flags: ['i'],
    replacements: drafted.replacements,
  })
  if (result.success) return { kind: 'rule', rule: result.data }
  return {
    kind: 'invalid',
    reason: result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; '),
  }
}

function exampleFault(rule: Rule): string | null {
  if (rule.engine !== 'lexical') return null
  for (const example of rule.examples.matching) {
    if (!compileRule(rule).test(example)) return `the matching example "${example}" does not match`
  }
  for (const example of rule.examples.clean) {
    if (compileRule(rule).test(example)) return `the clean example "${example}" matches`
  }
  return null
}

function spansMatched(pattern: string, flags: readonly string[], example: string): Set<string> {
  const found = new Set<string>()
  for (const match of example.matchAll(new RegExp(pattern, `${flags.join('')}g`))) {
    found.add(match[0].toLowerCase())
  }
  return found
}

function coveredByShippedPack(rule: Rule, packs: readonly RulePack[]): boolean {
  if (rule.engine !== 'lexical') return false
  const shipped = packs.flatMap((pack) => pack.rules.filter((entry) => entry.engine === 'lexical'))
  for (const example of rule.examples.matching) {
    const candidate = spansMatched(rule.pattern, rule.flags, example)
    if (candidate.size === 0) return false
    const covered = new Set<string>()
    for (const entry of shipped) {
      if (entry.engine !== 'lexical') continue
      for (const span of spansMatched(entry.pattern, entry.flags, example)) covered.add(span)
    }
    for (const span of candidate) {
      let matched = false
      for (const shippedSpan of covered) {
        if (span.includes(shippedSpan)) {
          matched = true
          break
        }
      }
      if (!matched) return false
    }
  }
  return true
}

export function reviewEdits(
  edits: readonly RuleEdit[],
  packs: readonly RulePack[],
  origin: EditOrigin,
): ReviewResult {
  const accepted: AcceptedEdit[] = []
  const rejected: RejectedEdit[] = []
  let duplicates = 0
  const syncedName = PackNameSchema.parse(origin.pack)
  const synced = packs.find((pack) => pack.name === syncedName)
  const allIds = new Set(packs.flatMap((pack) => pack.rules.map((rule) => rule.id)))
  const syncedIds = new Set((synced?.rules ?? []).map((rule) => rule.id))

  for (const edit of edits) {
    if (synced === undefined) {
      rejected.push({ reason: `the ${origin.pack} pack is not loaded`, edit })
      continue
    }
    if (edit.kind === 'add') {
      if (allIds.has(edit.rule.id)) {
        rejected.push({ reason: `the rule id ${edit.rule.id} already exists`, edit })
        continue
      }
      const policy = origin.idPolicy
      if (policy.kind === 'prefixed' && !edit.rule.id.startsWith(policy.prefix)) {
        rejected.push({
          reason: `the rule id ${edit.rule.id} does not start with ${policy.prefix}`,
          edit,
        })
        continue
      }
      const outcome = materialize(edit.rule, origin)
      if (outcome.kind === 'invalid') {
        rejected.push({ reason: outcome.reason, edit })
        continue
      }
      const fault = exampleFault(outcome.rule)
      if (fault !== null) {
        rejected.push({ reason: fault, edit })
        continue
      }
      if (coveredByShippedPack(outcome.rule, packs)) {
        duplicates += 1
        rejected.push({
          reason: 'duplicate: an enabled pack already matches every phrase this rule does',
          edit,
        })
        continue
      }
      accepted.push({ kind: 'add', rule: outcome.rule })
      continue
    }
    if (!syncedIds.has(edit.id)) {
      rejected.push({ reason: `the rule id ${edit.id} is not in the ${origin.pack} pack`, edit })
      continue
    }
    accepted.push(
      edit.kind === 'deprecate'
        ? { kind: 'deprecate', id: edit.id, reason: edit.reason }
        : { kind: 'era', id: edit.id, era: edit.era },
    )
  }
  return { accepted, rejected, duplicates }
}
