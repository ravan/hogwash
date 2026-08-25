import type { SyncFamily } from './args.js'
import type { AcceptedEdit, RejectedEdit } from './review.js'

export type Proposal = {
  readonly version: 1
  readonly revision: number
  readonly family: SyncFamily | null
  readonly dropped: number
  readonly accepted: readonly AcceptedEdit[]
  readonly rejected: readonly RejectedEdit[]
}

export function renderProposal(proposal: Proposal): string {
  return `${JSON.stringify(proposal, null, 2)}\n`
}
