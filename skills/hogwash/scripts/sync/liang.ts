import { HogwashError } from '../errors.js'
import type { RulePack } from '../rules/schema.js'
import { loadPack } from '../rules/schema.js'
import { applyEdits, type PackEditCounts } from './apply.js'
import { mapLiangTables } from './map/liang.js'
import { renderProposal } from './proposal.js'
import type { EditOrigin } from './review.js'
import { reviewEdits } from './review.js'
import { contentRevision } from './source.js'

export const LIANG_TABLES_PATH = 'data/liang-2024-tables.tsv'
export const LIANG_PACK_PATH = 'rules/excess-vocab.json'
export const LIANG_PROPOSAL_PATH = 'rules/liang-2024.proposed.json'

export const LIANG_ORIGIN: EditOrigin = {
  pack: 'excess-vocab',
  idPolicy: { kind: 'prefixed', prefix: 'xv.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  attribution: (section) =>
    `Liang et al., ICML 2024, PMLR 235:29575, ${section} (ranked word list, transcribed with attribution)`,
}

export type LiangImport =
  | {
      readonly kind: 'imported'
      readonly packText: string
      readonly proposalText: string
      readonly counts: PackEditCounts
      readonly accepted: number
      readonly duplicates: number
      readonly rejected: number
      readonly dropped: number
    }
  | { readonly kind: 'invalid'; readonly reason: string }

/**
 * The one-shot import of the hand-transcribed Liang tables. Pure — no I/O, no
 * clock, no randomness — so identical inputs always produce identical bytes.
 */
export function importLiangTables(
  tables: string,
  packText: string,
  packs: readonly RulePack[],
): LiangImport {
  const mapped = mapLiangTables(tables.split('\n'))
  if (mapped.kind === 'invalid') return { kind: 'invalid', reason: mapped.reason }

  let current: RulePack
  try {
    current = loadPack(JSON.parse(packText), LIANG_PACK_PATH)
  } catch (error) {
    if (error instanceof HogwashError) return { kind: 'invalid', reason: error.message }
    const reason = error instanceof Error ? error.message : String(error)
    return { kind: 'invalid', reason: `Could not read ${LIANG_PACK_PATH}: ${reason}` }
  }
  const reviewed = packs.map((pack) => (pack.name === current.name ? current : pack))

  const review = reviewEdits(mapped.edits, reviewed, LIANG_ORIGIN)
  const applied = applyEdits(packText, review.accepted, LIANG_PACK_PATH)
  if (applied.kind === 'invalid') return { kind: 'invalid', reason: applied.reason }

  const proposalText = renderProposal({
    version: 1,
    revision: contentRevision(tables),
    family: null,
    dropped: mapped.dropped,
    accepted: review.accepted,
    rejected: review.rejected,
  })
  return {
    kind: 'imported',
    packText: applied.text,
    proposalText,
    counts: applied.counts,
    accepted: review.accepted.length,
    duplicates: review.duplicates,
    rejected: review.rejected.length,
    dropped: mapped.dropped,
  }
}
