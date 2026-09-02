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

/**
 * Turns the parsed bullets into a pack. A list with no bullets is a ban list
 * that nobody has filled in yet, not a broken one: it yields null, and the
 * caller says so on stderr instead of refusing to scan.
 */
export function banPackOf(entries: readonly BanEntry[], origin: string): RulePack | null {
  if (entries.length === 0) return null
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

/** Try each candidate in order; null when every one is missing. Other errors throw. */
async function readBanSource(
  candidates: readonly string[],
): Promise<{ readonly source: string; readonly path: string } | null> {
  for (const candidate of candidates) {
    try {
      return { source: await readFile(candidate, 'utf8'), path: candidate }
    } catch (error) {
      if (ErrnoSchema.safeParse(error).data?.code === 'ENOENT') continue
      throw new HogwashError({
        kind: 'config',
        message: `Could not read the ban list ${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }
  return null
}

const candidatesOf = (path: string | readonly string[]): readonly string[] =>
  typeof path === 'string' ? [path] : path

/** The ban list file that was found, and its pack — null when the file holds no bullets. */
export type LoadedBanList = { readonly path: string; readonly pack: RulePack | null }

/** Reads the configured ban list at the I/O boundary; a missing file is an error. */
export async function loadBanList(path: string | readonly string[]): Promise<LoadedBanList> {
  const candidates = candidatesOf(path)
  const found = await readBanSource(candidates)
  if (found === null) {
    throw new HogwashError({
      kind: 'config',
      message:
        candidates.length === 1
          ? `Could not read the ban list ${candidates[0]}: no such file.`
          : `Could not read the ban list: no such file. Tried ${candidates.join(', ')}.`,
    })
  }
  return { path: found.path, pack: banPackOf(parseBanList(found.source), found.path) }
}

/** The configured ban list, or null when no candidate file exists. */
export async function loadBanListIfPresent(
  path: string | readonly string[],
): Promise<LoadedBanList | null> {
  const found = await readBanSource(candidatesOf(path))
  return found === null
    ? null
    : { path: found.path, pack: banPackOf(parseBanList(found.source), found.path) }
}
