import type { RulePack } from '../rules/schema.js'
import { PackNameSchema } from '../types.js'
import type { PackEditCounts } from './apply.js'
import { applyEdits } from './apply.js'
import type { SyncFamily } from './args.js'
import type { LineChanges } from './diff.js'
import { changedLines } from './diff.js'
import type { Drafter, ExistingRule, RuleEdit } from './draft.js'
import { DRAFT_LINE_LIMIT, draftBatches } from './draft.js'
import type { InjectionFinding } from './injection.js'
import { blocking, describeFinding, scanInjection } from './injection.js'
import { renderProposal } from './proposal.js'
import { reviewEdits } from './review.js'
import type { SyncSource } from './source.js'

/** 'detect' fetches, scans and diffs, then writes nothing (spec §3.6). */
export type SyncMode = 'write' | 'detect'

export type SyncDeps = {
  readonly family: SyncFamily
  readonly mode: SyncMode
  readonly source: SyncSource
  readonly packs: readonly RulePack[]
  readonly fetchBodies: () => Promise<readonly string[]>
  readonly readSnapshot: () => string | null
  readonly writeSnapshot: (text: string) => void
  readonly writeProposal: (text: string) => void
  readonly readPack: () => string | null
  readonly writePack: (text: string) => void
  /** null for a structured source — no agent exists in that path (spec §6.1). */
  readonly draft: Drafter | null
  readonly log: (line: string) => void
}
export type SyncOutcome =
  | { readonly kind: 'bootstrapped'; readonly revision: number; readonly lines: number }
  | { readonly kind: 'unchanged'; readonly revision: number }
  | {
      readonly kind: 'updated'
      readonly revision: number
      readonly added: number
      readonly removed: number
      readonly accepted: number
      readonly rejected: number
      readonly duplicates: number
      readonly dropped: number
      readonly pack: PackEditCounts
    }
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'unsafe'; readonly findings: readonly InjectionFinding[] }
  | {
      readonly kind: 'drifted'
      readonly revision: number
      readonly added: number
      readonly removed: number
    }

function existingRules(packs: readonly RulePack[], pack: string): readonly ExistingRule[] {
  const syncedName = PackNameSchema.parse(pack)
  const synced = packs.find((entry) => entry.name === syncedName)
  return (synced?.rules ?? []).map((rule) => ({ id: rule.id, message: rule.message }))
}

type Fetched = { readonly kind: 'fetched'; readonly snapshot: string; readonly revision: number }
type Failed = { readonly kind: 'failed'; readonly reason: string }
type Drafted = {
  readonly kind: 'edits'
  readonly edits: readonly RuleEdit[]
  readonly dropped: number
}

/** Fetches the bodies and injection-scans them before anything ingests one. */
async function fetchSnapshot(deps: SyncDeps): Promise<Fetched | SyncOutcome> {
  try {
    const bodies = await deps.fetchBodies()

    // Scan before anything ingests a body: before it is parsed, before it is
    // normalized, before a single line reaches the drafting agent. The raw text
    // is what an attacker controls, so the raw text is what gets checked — and
    // every body is one, not only the first.
    const findings = bodies.flatMap((body) => scanInjection(body))
    for (const finding of findings) deps.log(describeFinding(finding))
    const blocked = blocking(findings)
    if (blocked.length > 0) return { kind: 'unsafe', findings: blocked }

    const parsed = deps.source.parse(bodies)
    return { kind: 'fetched', snapshot: parsed.snapshot, revision: parsed.revision }
  } catch (error) {
    return { kind: 'failed', reason: error instanceof Error ? error.message : String(error) }
  }
}

/** Drafts edits batch by batch, feeding each batch what the earlier ones proposed. */
async function draftWithAgent(
  deps: SyncDeps,
  draft: Drafter,
  changes: LineChanges,
): Promise<Drafted | Failed> {
  const existing = existingRules(deps.packs, deps.source.pack)
  const collected: RuleEdit[] = []
  let usable = false
  let firstReason: string | null = null
  let batchIndex = 0
  for (const batch of draftBatches(changes.added, DRAFT_LINE_LIMIT)) {
    const proposed = collected.flatMap((edit) =>
      edit.kind === 'add' ? [{ id: edit.rule.id, message: edit.rule.message }] : [],
    )
    const outcome = await draft({
      added: batch,
      removed: batchIndex === 0 ? changes.removed : [],
      existing: [...existing, ...proposed],
      idPolicy: deps.source.idPolicy,
    })
    batchIndex += 1
    if (outcome.kind === 'unusable') {
      deps.log(`The drafter returned nothing usable: ${outcome.reason}`)
      if (firstReason === null) firstReason = outcome.reason
      continue
    }
    usable = true
    collected.push(...outcome.edits)
  }
  if (!usable) {
    return { kind: 'failed', reason: firstReason ?? 'The drafter returned nothing usable.' }
  }
  return { kind: 'edits', edits: collected, dropped: 0 }
}

/** The mapper for a structured source, the drafting agent for a prose one. */
async function collectEdits(deps: SyncDeps, changes: LineChanges): Promise<Drafted | Failed> {
  if (deps.source.kind === 'structured') {
    const mapped = deps.source.map(changes.added)
    if (mapped.kind === 'invalid') {
      deps.log(`The mapper refused the changed lines: ${mapped.reason}`)
      return { kind: 'failed', reason: mapped.reason }
    }
    return { kind: 'edits', edits: mapped.edits, dropped: mapped.dropped }
  }
  if (deps.draft === null) {
    return {
      kind: 'failed',
      reason: `The ${deps.source.name} source needs a drafting agent and none was supplied.`,
    }
  }
  return draftWithAgent(deps, deps.draft, changes)
}

/** Reviews the edits, applies the accepted ones, and leaves one coherent git diff. */
function applyReviewed(
  deps: SyncDeps,
  drafted: Drafted,
  changes: LineChanges,
  snapshot: string,
  revision: number,
): SyncOutcome {
  const review = reviewEdits(drafted.edits, deps.packs, deps.source)
  const rejectionCounts = new Map<string, number>()
  for (const rejection of review.rejected) {
    rejectionCounts.set(rejection.reason, (rejectionCounts.get(rejection.reason) ?? 0) + 1)
  }
  for (const [reason, count] of rejectionCounts) {
    deps.log(`${count} ${count === 1 ? 'edit' : 'edits'} rejected: ${reason}`)
  }
  const current = deps.readPack()
  if (current === null) {
    return { kind: 'failed', reason: `The pack file ${deps.source.packPath} is not there.` }
  }
  const applied = applyEdits(current, review.accepted, deps.source.packPath)
  if (applied.kind === 'invalid') return { kind: 'failed', reason: applied.reason }

  // One run leaves one coherent git diff, or none at all.
  deps.writeSnapshot(snapshot)
  deps.writeProposal(
    renderProposal({
      version: 1,
      revision,
      family: deps.family,
      accepted: review.accepted,
      rejected: review.rejected,
      dropped: drafted.dropped,
    }),
  )
  deps.writePack(applied.text)
  return {
    kind: 'updated',
    revision,
    added: changes.added.length,
    removed: changes.removed.length,
    accepted: review.accepted.length,
    rejected: review.rejected.length,
    duplicates: review.duplicates,
    dropped: drafted.dropped,
    pack: applied.counts,
  }
}

export async function runSync(deps: SyncDeps): Promise<SyncOutcome> {
  const fetched = await fetchSnapshot(deps)
  if (fetched.kind !== 'fetched') return fetched
  const { snapshot, revision } = fetched

  const previous = deps.readSnapshot()
  if (deps.mode === 'detect') {
    const drift = changedLines(previous ?? '', snapshot)
    if (drift.added.length === 0 && drift.removed.length === 0) {
      return { kind: 'unchanged', revision }
    }
    return {
      kind: 'drifted',
      revision,
      added: drift.added.length,
      removed: drift.removed.length,
    }
  }
  if (previous === null) {
    deps.writeSnapshot(snapshot)
    return {
      kind: 'bootstrapped',
      revision,
      lines: snapshot === '' ? 0 : snapshot.split('\n').length - 1,
    }
  }

  const changes = changedLines(previous, snapshot)
  if (changes.added.length === 0 && changes.removed.length === 0) {
    return { kind: 'unchanged', revision }
  }

  const drafted = await collectEdits(deps, changes)
  if (drafted.kind === 'failed') return drafted
  return applyReviewed(deps, drafted, changes, snapshot, revision)
}
