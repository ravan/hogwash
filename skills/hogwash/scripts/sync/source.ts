import { z } from 'zod'
import { HogwashError } from '../errors.js'
import { mapExcessVocab, parseExcessVocab } from './map/excess-vocab.js'
import type { Mapper } from './map/mapper.js'
import { mapSlopGate, parseSlopGate, SLOP_GATE_PARTS } from './map/slop-gate.js'
import { expandValeIndex, mapVale, parseVale, VALE_INDEX_URL } from './map/vale.js'
import { normalizeMarkdown, normalizeWikitext } from './normalize.js'
import { parsePage } from './page.js'
import type { EditOrigin } from './review.js'

export const SyncSourceNameSchema = z.enum([
  'wikipedia-signs',
  'claudisms-ai',
  'excess-vocab-csv',
  'vale-ai-tells',
  'slop-gate',
  'blader-humanizer',
  'pstack-unslop',
])
export type SyncSourceName = z.infer<typeof SyncSourceNameSchema>

/** What a fetched body yields: the text we diff, and the revision we report. */
export type ParsedSource = { readonly snapshot: string; readonly revision: number }

/** One body a source fetches. A `gzip` part is decompressed by the shell. */
export type SourcePart = {
  readonly url: string
  readonly accept: string
  readonly gzip: boolean
}

export type SourceFetch =
  | { readonly kind: 'fixed'; readonly parts: readonly SourcePart[] }
  | {
      readonly kind: 'indexed'
      readonly index: SourcePart
      /** `parse` then receives the index body first, then one body per part. */
      readonly expand: (indexBody: string) => readonly SourcePart[]
    }

type SyncSourceCommon = EditOrigin & {
  readonly name: SyncSourceName
  /** The pack file this source rewrites, relative to the repository root. */
  readonly packPath: string
  readonly fetch: SourceFetch
  readonly snapshotPath: string
  readonly proposalPath: string
  readonly parse: (bodies: readonly string[]) => ParsedSource
}

export type SyncSource =
  | (SyncSourceCommon & { readonly kind: 'prose' })
  | (SyncSourceCommon & { readonly kind: 'structured'; readonly map: Mapper })

function onlyBody(bodies: readonly string[]): string {
  const body = bodies[0]
  if (body === undefined) {
    throw new HogwashError({ kind: 'config', message: 'The source fetched no body to parse.' })
  }
  return body
}

export const USER_AGENT = 'hogwash-rule-sync/0.0 (+https://github.com/ravan/slop)'

/**
 * FNV-1a over the normalized text. claudisms.ai serves a plain document with no
 * revision number, so the content itself has to stand in for one. Deterministic
 * and stable across runs, which is all the diff and the proposal need.
 */
export function contentRevision(text: string): number {
  let hash = 0x811c9dc5
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  // Keep it inside the positive-int range the proposal schema accepts.
  return hash % 0x7fffffff || 1
}

const WIKIPEDIA: SyncSource = {
  name: 'wikipedia-signs',
  kind: 'prose',
  pack: 'wikipedia-signs',
  packPath: 'rules/wikipedia-signs.json',
  fetch: {
    kind: 'fixed',
    parts: [
      {
        url: 'https://en.wikipedia.org/w/rest.php/v1/page/Wikipedia%3ASigns_of_AI_writing',
        accept: 'application/json',
        gzip: false,
      },
    ],
  },
  snapshotPath: 'rules/wikipedia-signs.snapshot.txt',
  proposalPath: 'rules/wikipedia-signs.proposed.json',
  attribution: (section) => `Wikipedia:Signs of AI writing § ${section} (CC BY-SA 4.0)`,
  idPolicy: { kind: 'prefixed', prefix: 'wiki.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: (bodies) => {
    const page = parsePage(onlyBody(bodies))
    return { snapshot: normalizeWikitext(page.source), revision: page.latest.id }
  },
}

const CLAUDISMS_AI: SyncSource = {
  name: 'claudisms-ai',
  kind: 'prose',
  pack: 'claudisms',
  packPath: 'rules/claudisms.json',
  fetch: {
    kind: 'fixed',
    parts: [
      {
        url: 'https://claudisms.ai/claudisms.md',
        accept: 'text/markdown, text/plain',
        gzip: false,
      },
    ],
  },
  snapshotPath: 'rules/claudisms.snapshot.txt',
  proposalPath: 'rules/claudisms.proposed.json',
  attribution: (section) => `claudisms.ai § ${section} (free to copy and adapt)`,
  idPolicy: { kind: 'free' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: (bodies) => {
    const snapshot = normalizeMarkdown(onlyBody(bodies))
    return { snapshot, revision: contentRevision(snapshot) }
  },
}

const EXCESS_VOCAB: SyncSource = {
  name: 'excess-vocab-csv',
  kind: 'structured',
  pack: 'excess-vocab',
  packPath: 'rules/excess-vocab.json',
  fetch: {
    kind: 'fixed',
    parts: [
      {
        url: 'https://raw.githubusercontent.com/berenslab/llm-excess-vocab/main/results/excess_words.csv',
        accept: 'text/csv, text/plain',
        gzip: false,
      },
      {
        url: 'https://raw.githubusercontent.com/berenslab/llm-excess-vocab/main/results/yearly-counts.csv.gz',
        accept: 'application/gzip, application/octet-stream',
        gzip: true,
      },
    ],
  },
  snapshotPath: 'rules/excess-vocab.snapshot.txt',
  proposalPath: 'rules/excess-vocab.proposed.json',
  attribution: (section) => `Kobak et al., Science Advances 2025, ${section} (MIT)`,
  idPolicy: { kind: 'prefixed', prefix: 'xv.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: parseExcessVocab,
  map: mapExcessVocab,
}

const BLADER_HUMANIZER: SyncSource = {
  name: 'blader-humanizer',
  kind: 'prose',
  pack: 'humanizer',
  packPath: 'rules/humanizer.json',
  fetch: {
    kind: 'fixed',
    parts: [
      {
        url: 'https://raw.githubusercontent.com/blader/humanizer/main/SKILL.md',
        accept: 'text/markdown, text/plain',
        gzip: false,
      },
    ],
  },
  snapshotPath: 'rules/humanizer.snapshot.txt',
  proposalPath: 'rules/humanizer.proposed.json',
  attribution: (section) => `blader/humanizer § ${section} (MIT)`,
  idPolicy: { kind: 'free' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: (bodies) => {
    const snapshot = normalizeMarkdown(onlyBody(bodies))
    return { snapshot, revision: contentRevision(snapshot) }
  },
}

const VALE_AI_TELLS: SyncSource = {
  name: 'vale-ai-tells',
  kind: 'structured',
  pack: 'vale-ai-tells',
  packPath: 'rules/vale-ai-tells.json',
  fetch: {
    kind: 'indexed',
    index: { url: VALE_INDEX_URL, accept: 'application/vnd.github+json', gzip: false },
    expand: expandValeIndex,
  },
  snapshotPath: 'rules/vale-ai-tells.snapshot.txt',
  proposalPath: 'rules/vale-ai-tells.proposed.json',
  attribution: (section) => `tbhb/vale-ai-tells § ${section} (MIT)`,
  idPolicy: { kind: 'prefixed', prefix: 'vale.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: parseVale,
  map: mapVale,
}

const SLOP_GATE: SyncSource = {
  name: 'slop-gate',
  kind: 'structured',
  pack: 'slop-gate',
  packPath: 'rules/slop-gate.json',
  fetch: { kind: 'fixed', parts: SLOP_GATE_PARTS },
  snapshotPath: 'rules/slop-gate.snapshot.txt',
  proposalPath: 'rules/slop-gate.proposed.json',
  attribution: (section) => `hwajongpark/slop-gate § ${section} (MIT)`,
  idPolicy: { kind: 'prefixed', prefix: 'slop.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: parseSlopGate,
  map: mapSlopGate,
}

const PSTACK_UNSLOP: SyncSource = {
  name: 'pstack-unslop',
  kind: 'prose',
  pack: 'unslop',
  packPath: 'rules/unslop.json',
  fetch: {
    kind: 'fixed',
    parts: [
      {
        url: 'https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md',
        accept: 'text/markdown, text/plain',
        gzip: false,
      },
    ],
  },
  snapshotPath: 'rules/unslop.snapshot.txt',
  proposalPath: 'rules/unslop.proposed.json',
  attribution: (section) => `cursor/plugins pstack unslop § ${section} (MIT)`,
  idPolicy: { kind: 'prefixed', prefix: 'unslop.' },
  registers: { technical: 1, prose: 1, marketing: 1 },
  parse: (bodies) => {
    const snapshot = normalizeMarkdown(onlyBody(bodies))
    return { snapshot, revision: contentRevision(snapshot) }
  },
}

const SOURCES: Record<SyncSourceName, SyncSource> = {
  'wikipedia-signs': WIKIPEDIA,
  'claudisms-ai': CLAUDISMS_AI,
  'excess-vocab-csv': EXCESS_VOCAB,
  'vale-ai-tells': VALE_AI_TELLS,
  'slop-gate': SLOP_GATE,
  'blader-humanizer': BLADER_HUMANIZER,
  'pstack-unslop': PSTACK_UNSLOP,
}

export const SYNC_SOURCE_NAMES: readonly SyncSourceName[] = SyncSourceNameSchema.options

/** Throws HogwashError{kind:'usage'} when the name is not a known source. */
export function sourceOf(name: string): SyncSource {
  const parsed = SyncSourceNameSchema.safeParse(name)
  if (!parsed.success) {
    throw new HogwashError({
      kind: 'usage',
      message: `Unknown sync source ${name}. Use ${SYNC_SOURCE_NAMES.join(' or ')}.`,
    })
  }
  return SOURCES[parsed.data]
}
