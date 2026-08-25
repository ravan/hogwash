import { readFileSync } from 'node:fs'
import { loadBundledPacks } from '../../scripts/rules/packs.js'
import type { DraftOutcome, DraftRequest } from '../../scripts/sync/draft.js'
import type { SyncDeps, SyncMode } from '../../scripts/sync/run.js'
import { sourceOf } from '../../scripts/sync/source.js'
import { RuleIdSchema } from '../../scripts/types.js'

export const fixture = (name: string): string =>
  readFileSync(new URL(`../fixtures/sync/${name}`, import.meta.url), 'utf8')

export const packs = loadBundledPacks()

export const shippedWikiRuleCount = (): number =>
  packs.find((pack) => pack.name === 'wikipedia-signs')?.rules.length ?? 0

export const moonlightingAdd: DraftOutcome = {
  kind: 'drafted',
  edits: [
    {
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: RuleIdSchema.parse('wiki.vocab.moonlighting'),
        category: 'vocabulary',
        era: 'gpt4',
        severity: 'warning',
        weight: 1,
        message: 'moonlighting is over-used',
        section: 'Language and grammar',
        pattern: '\\bmoonlighting\\b',
        replacements: [],
        examples: { matching: ['a spot of moonlighting'], clean: ['the quarterly ledger'] },
      },
    },
  ],
}

export type Harness = {
  readonly deps: SyncDeps
  readonly snapshots: string[]
  readonly proposals: string[]
  readonly packs: string[]
  readonly logs: string[]
  readonly requests: DraftRequest[]
}

export function harness(options: {
  readonly readSnapshot: () => string | null
  readonly readPack?: () => string | null
  readonly fetchBodies?: () => Promise<readonly string[]>
  readonly draft?: DraftOutcome
  readonly drafts?: readonly DraftOutcome[]
  readonly mode?: SyncMode
}): Harness {
  const snapshots: string[] = []
  const proposals: string[] = []
  const written: string[] = []
  const logs: string[] = []
  const requests: DraftRequest[] = []
  return {
    snapshots,
    proposals,
    packs: written,
    logs,
    requests,
    deps: {
      family: 'claude',
      mode: options.mode ?? 'write',
      source: sourceOf('wikipedia-signs'),
      packs,
      fetchBodies: options.fetchBodies ?? (async () => [fixture('page.json')]),
      readSnapshot: options.readSnapshot,
      writeSnapshot: (text) => snapshots.push(text),
      writeProposal: (text) => proposals.push(text),
      readPack: options.readPack ?? (() => fixture('pack-apply.json')),
      writePack: (text) => written.push(text),
      draft: async (request) => {
        requests.push(request)
        const queued = options.drafts
        if (queued === undefined) return options.draft ?? { kind: 'drafted', edits: [] }
        return (
          queued[Math.min(requests.length - 1, queued.length - 1)] ?? { kind: 'drafted', edits: [] }
        )
      },
      log: (line) => logs.push(line),
    },
  }
}
