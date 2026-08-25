import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { HogwashError } from '../errors.js'
import type { PackName } from '../types.js'
import { PackNameSchema } from '../types.js'
import type { RulePack } from './schema.js'
import { loadPack } from './schema.js'

/** The pack every ban-list rule lands in; never the name of a bundled pack. */
export const BAN_PACK: PackName = PackNameSchema.parse('ban-list')
export const BAN_RULE_PREFIX = 'ban/'

/** One bullet from the ban list: the banned wording, and why it is banned. */
export type BanEntry = { readonly term: string; readonly reason: string | null }

const BULLET = /^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$/
const FENCE = /^\s*(?:```|~~~)/
/** An em dash, an en dash or a spaced hyphen: the three ways people write "term — why". */
const REASON_SPLIT = /\s+(?:—|–|--|-)\s+/
const TRIM_MARKS = /^["'`“”‘’*_]+|["'`“”‘’*_]+$/g

const slugOf = (term: string): string =>
  term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

/** Reads bullets only. Headings, prose and fenced code are notes for the reader. */
export function parseBanList(source: string): readonly BanEntry[] {
  const entries: BanEntry[] = []
  let fenced = false
  for (const line of source.split('\n')) {
    if (FENCE.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const bullet = BULLET.exec(line)
    if (bullet === null) continue
    const body = bullet[1]
    if (body === undefined) continue
    const split = REASON_SPLIT.exec(body)
    const rawTerm = split === null ? body : body.slice(0, split.index)
    const rawReason = split === null ? '' : body.slice(split.index + split[0].length)
    const term = rawTerm.replace(TRIM_MARKS, '').trim()
    const reason = rawReason.trim()
    if (term.length === 0) continue
    entries.push({ term, reason: reason.length === 0 ? null : reason })
  }
  return entries
}

const ESCAPE = /[.*+?^${}()|[\]\\]/g

/**
 * The banned wording as a pattern. A word boundary guards each end only when
 * that end is a word character, so "e.g." and "-ish" still match where they
 * occur. The term is matched as written: an inflection the writer also wants
 * banned is its own bullet.
 */
const patternOf = (term: string): string => {
  const escaped = term.replace(ESCAPE, '\\$&')
  const open = /^\w/.test(term) ? '\\b' : ''
  const close = /\w$/.test(term) ? '\\b' : ''
  return `${open}${escaped}${close}`
}

const ruleOf = (entry: BanEntry, id: string, origin: string): unknown => ({
  id,
  category: 'vocabulary',
  engine: 'lexical',
  era: 'mixed',
  severity: 'warning',
  weight: 2,
  reliable: true,
  pattern: patternOf(entry.term),
  flags: ['i'],
  message:
    entry.reason === null
      ? `The ban list forbids ${JSON.stringify(entry.term)}.`
      : `The ban list forbids ${JSON.stringify(entry.term)}: ${entry.reason}`,
  attribution: `ban list ${origin}`,
  examples: { matching: [entry.term] },
})

/** Turns the parsed bullets into a pack; throws HogwashError{kind:'config'} on an empty list. */
export function banPackOf(entries: readonly BanEntry[], origin: string): RulePack {
  if (entries.length === 0) {
    throw new HogwashError({
      kind: 'config',
      message: `The ban list ${origin} holds no entries. Write one bulleted line for each banned word or phrase.`,
    })
  }
  const used = new Map<string, number>()
  const rules = entries.map((entry) => {
    const base = slugOf(entry.term) || 'entry'
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    const id = seen === 0 ? `${BAN_RULE_PREFIX}${base}` : `${BAN_RULE_PREFIX}${base}-${seen + 1}`
    return ruleOf(entry, id, origin)
  })
  return loadPack(
    { name: BAN_PACK, version: '1', attribution: `ban list ${origin}`, rules },
    origin,
  )
}

const ErrnoSchema = z.object({ code: z.string() })

/** Reads the configured ban list at the I/O boundary; a missing file is an error. */
export async function loadBanList(path: string): Promise<RulePack> {
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    const missing = ErrnoSchema.safeParse(error).data?.code === 'ENOENT'
    throw new HogwashError({
      kind: 'config',
      message: missing
        ? `Could not read the ban list ${path}: no such file.`
        : `Could not read the ban list ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  return banPackOf(parseBanList(source), path)
}
