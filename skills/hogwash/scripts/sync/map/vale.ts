import { z } from 'zod'
import { HogwashError } from '../../errors.js'
import { RuleIdSchema } from '../../types.js'
import type { RuleEdit } from '../draft.js'
import type { ParsedSource, SourcePart } from '../source.js'
import { contentRevision } from '../source.js'
import type { Mapper } from './mapper.js'
import { readValeStyle } from './yaml.js'

/** Frozen by rule-sources-S4. A change to any of these is a code review. */
export const VALE_WEIGHT = 1.5
/** A token below this many whitespace-separated words is not a phrase. */
export const VALE_PHRASE_FLOOR = 2
export const VALE_INDEX_URL =
  'https://api.github.com/repos/tbhb/vale-ai-tells/contents/styles/ai-tells?ref=main'
export const VALE_RAW_BASE =
  'https://raw.githubusercontent.com/tbhb/vale-ai-tells/main/styles/ai-tells/'

const configError = (message: string): HogwashError => new HogwashError({ kind: 'config', message })

const IndexSchema = z.array(z.object({ name: z.string(), type: z.string() }))

/** Pure: one index body always yields the same parts, in the same order. */
export function expandValeIndex(indexBody: string): readonly SourcePart[] {
  let raw: unknown
  try {
    raw = JSON.parse(indexBody)
  } catch {
    throw configError('The Vale index is not JSON.')
  }
  const listing = IndexSchema.safeParse(raw)
  if (!listing.success) {
    throw configError('The Vale index is not a list of name-and-type entries.')
  }
  const names = listing.data
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.yml'))
    .map((entry) => entry.name)
    .sort()
  if (names.length === 0) throw configError('The Vale index lists no style files.')
  // The URL comes from the frozen base and the name, never from the index.
  return names.map((name) => ({
    url: `${VALE_RAW_BASE}${name}`,
    accept: 'text/yaml, text/plain',
    gzip: false,
  }))
}

/**
 * `bodies[0]` is the index; `bodies[1..]` are the style files, one per part
 * `expandValeIndex` returned, in that order. Throws
 * HogwashError{kind:'config'} on a length mismatch.
 */
export function parseVale(bodies: readonly string[]): ParsedSource {
  const indexBody = bodies[0]
  if (indexBody === undefined) {
    throw configError('The vale-ai-tells source fetched no body to parse.')
  }
  const parts = expandValeIndex(indexBody)
  const styleBodies = bodies.slice(1)
  if (styleBodies.length !== parts.length) {
    throw configError(
      `The Vale index names ${parts.length} style files and ${styleBodies.length} bodies came back.`,
    )
  }

  const lines: string[] = []
  for (const [at, part] of parts.entries()) {
    const name = part.url.slice(VALE_RAW_BASE.length).replace(/\.yml$/, '')
    const style = readValeStyle(styleBodies[at] ?? '')
    const declared = [style.exceptions ? 'exceptions' : '', style.scoped ? 'scope' : ''].filter(
      (trait) => trait !== '',
    )
    const traits = declared.length === 0 ? '-' : declared.join(',')
    // A style with no tokens still gets one line, so the mapper counts it.
    const tokens = style.tokens.length === 0 ? [''] : style.tokens
    for (const token of tokens) {
      lines.push([name, style.extends, traits, token, style.message].join('\t'))
    }
  }
  lines.sort()
  const snapshot = `${lines.join('\n')}\n`
  return { snapshot, revision: contentRevision(snapshot) }
}

const METACHAR = /[\\[\]().?*+|^${}]/
const ESCAPE = /[.*+?^${}()|[\]\\]/g
const WORD_EDGE = /\w/
const RUN_THEN_WORD = /([A-Z]+)([A-Z][a-z])/g
const WORD_THEN_CAPITAL = /([a-z0-9])([A-Z])/g
const NON_ALPHANUMERIC = /[^a-z0-9]+/g
const TRIM_HYPHENS = /^-+|-+$/g

const styleSlug = (style: string): string =>
  style.replace(RUN_THEN_WORD, '$1-$2').replace(WORD_THEN_CAPITAL, '$1-$2').toLowerCase()

const tokenSlug = (token: string): string =>
  token.toLowerCase().replace(NON_ALPHANUMERIC, '-').replace(TRIM_HYPHENS, '')

const patternFor = (token: string): string => {
  const escaped = token.replace(ESCAPE, '\\$&')
  const lead = WORD_EDGE.test(token.slice(0, 1)) ? '\\b' : ''
  const tail = WORD_EDGE.test(token.slice(-1)) ? '\\b' : ''
  return `${lead}${escaped}${tail}`
}

export const mapVale: Mapper = (added) => {
  const edits: RuleEdit[] = []
  const seen = new Set<string>()
  let dropped = 0

  for (const line of added) {
    const fields = line.split('\t')
    const [style, declaredExtends, traits, token, message] = fields
    if (
      fields.length !== 5 ||
      style === undefined ||
      declaredExtends === undefined ||
      traits === undefined ||
      token === undefined ||
      message === undefined
    ) {
      return { kind: 'invalid', reason: `The snapshot line "${line}" is not five fields.` }
    }
    const id = `vale.${styleSlug(style)}.${tokenSlug(token)}`
    if (
      declaredExtends !== 'existence' ||
      traits !== '-' ||
      METACHAR.test(token) ||
      token.split(/\s+/).filter((word) => word !== '').length < VALE_PHRASE_FLOOR ||
      seen.has(id)
    ) {
      dropped += 1
      continue
    }
    seen.add(id)
    edits.push({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: RuleIdSchema.parse(id),
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight: VALE_WEIGHT,
        section: style,
        pattern: patternFor(token),
        replacements: [],
        message: message.replaceAll('%s', token),
        examples: { matching: [token], clean: [] },
      },
    })
  }
  return { kind: 'mapped', edits, dropped }
}
