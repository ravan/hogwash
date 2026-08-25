import type { RuleEdit } from '../draft.js'

export type MapOutcome =
  | { readonly kind: 'mapped'; readonly edits: readonly RuleEdit[]; readonly dropped: number }
  | { readonly kind: 'invalid'; readonly reason: string }

/** Pure: the same added lines always give the same edits (spec §6.1). */
export type Mapper = (added: readonly string[]) => MapOutcome
