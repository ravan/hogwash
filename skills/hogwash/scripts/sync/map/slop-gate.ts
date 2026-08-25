import { z } from 'zod'
import { HogwashError } from '../../errors.js'
import type { Replacement } from '../../rules/schema.js'
import { type Category, RuleIdSchema } from '../../types.js'
import type { RuleEdit } from '../draft.js'
import type { ParsedSource, SourcePart } from '../source.js'
import { contentRevision } from '../source.js'
import type { Mapper } from './mapper.js'

/** Frozen by rule-sources-S5. A change is a code review, not a config knob. */
export const SLOP_GATE_WEIGHT = 1.5

/** The English upstream files, in fetch order. Position fixes the section. */
export const SLOP_GATE_FILES = [
  {
    section: 'vocabulary',
    url: 'https://raw.githubusercontent.com/hwajongpark/slop-gate/main/rules/vocabulary.json',
  },
  {
    section: 'punctuation',
    url: 'https://raw.githubusercontent.com/hwajongpark/slop-gate/main/rules/punctuation.json',
  },
] as const
export type SlopGateSection = (typeof SLOP_GATE_FILES)[number]['section']

export const SLOP_GATE_PARTS: readonly SourcePart[] = SLOP_GATE_FILES.map((file) => ({
  url: file.url,
  accept: 'application/json, text/plain',
  gzip: false,
}))

const configError = (message: string): HogwashError => new HogwashError({ kind: 'config', message })

/**
 * A literal string the upstream pattern is known to match — the rule's one
 * matching example. `null` when the pattern uses syntax outside the supported
 * subset, which is what the shape gate counts as dropped.
 */
// verbatim exception — the supported subset IS the shape gate (spec §2.4.4)
const UNSUPPORTED = /[*+.^${}]/
export function witnessFor(pattern: string): string | null {
  const out: string[] = []
  let at = 0
  while (at < pattern.length) {
    const here = pattern[at] ?? ''
    if (here === '\\') {
      if (pattern.startsWith('\\b', at)) {
        at += 2
        continue
      }
      return null
    }
    if (here === ')' || here === ']' || here === '|' || here === '?') return null
    if (here === '(' || here === '[') {
      const close = pattern.indexOf(here === '(' ? ')' : ']', at)
      if (close === -1) return null
      const body = pattern.slice(at + 1, close)
      if (body === '' || /[()[\]\\]/.test(body)) return null
      const optional = pattern[close + 1] === '?'
      at = close + 1 + (optional ? 1 : 0)
      if (here === '[') out.push(body[0] ?? '')
      else if (!optional) out.push(body.split('|')[0] ?? '')
      continue
    }
    if (UNSUPPORTED.test(here)) return null
    out.push(here)
    at += 1
  }
  const witness = out.join('')
  return witness.trim() === '' ? null : witness
}

const QUOTED_PHRASE = /'([a-z][a-z '-]*)'/
const METACHARACTER = /[.*+?^${}()|[\]\\]/g

/** At most one entry: the first lower-case quoted phrase the hint offers. */
export function replacementsFromHint(hint: string, witness: string): readonly Replacement[] {
  const found = QUOTED_PHRASE.exec(hint)
  const text = found?.[1]
  if (text === undefined) return []
  return [{ when: witness.replace(METACHARACTER, '\\$&'), text }]
}

const FileSchema = z.object({
  id: z.string().min(1),
  rules: z
    .array(z.object({ id: z.string().min(1), match: z.string().min(1), hint: z.string() }))
    .nonempty(),
})

/** `bodies` is one per SLOP_GATE_FILES entry, in that order. */
export function parseSlopGate(bodies: readonly string[]): ParsedSource {
  if (bodies.length !== SLOP_GATE_FILES.length) {
    throw configError(
      `The slop-gate source fetched ${bodies.length} bodies, not ${SLOP_GATE_FILES.length}.`,
    )
  }
  const lines: string[] = []
  SLOP_GATE_FILES.forEach((file, at) => {
    let raw: unknown
    try {
      raw = JSON.parse(bodies[at] ?? '')
    } catch {
      throw configError(`The slop-gate ${file.section} file is not JSON.`)
    }
    const parsed = FileSchema.safeParse(raw)
    if (!parsed.success) {
      throw configError(`The slop-gate ${file.section} file is not an id-and-rules object.`)
    }
    if (parsed.data.id !== file.section) {
      throw configError(
        `The slop-gate file fetched as ${file.section} calls itself ${parsed.data.id}.`,
      )
    }
    for (const rule of parsed.data.rules) {
      const fields = [file.section, rule.id, rule.match, rule.hint]
      if (fields.some((field) => field.includes('\t') || field.includes('\n'))) {
        throw configError(`The slop-gate ${file.section} rule ${rule.id} holds a tab or a newline.`)
      }
      lines.push(fields.join('\t'))
    }
  })
  const snapshot = `${lines.sort().join('\n')}\n`
  return { snapshot, revision: contentRevision(snapshot) }
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/
const SLOP_GATE_FIELDS = 4
const CATEGORY_OF: Readonly<Record<SlopGateSection, Category>> = {
  vocabulary: 'vocabulary',
  punctuation: 'formatting',
}

function sectionOf(field: string): SlopGateSection | null {
  const file = SLOP_GATE_FILES.find((entry) => entry.section === field)
  return file === undefined ? null : file.section
}

export const mapSlopGate: Mapper = (added) => {
  const edits: RuleEdit[] = []
  const seen = new Set<string>()
  let dropped = 0
  for (const line of added) {
    const fields = line.split('\t')
    if (fields.length !== SLOP_GATE_FIELDS) {
      return { kind: 'invalid', reason: `the line "${line}" is not ${SLOP_GATE_FIELDS} fields` }
    }
    const [sectionField = '', upstreamId = '', pattern = '', hint = ''] = fields
    const section = sectionOf(sectionField)
    const witness = witnessFor(pattern)
    const id = `slop.${sectionField}.${upstreamId}`
    if (
      section === null ||
      !SAFE_ID.test(upstreamId) ||
      hint.trim() === '' ||
      witness === null ||
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
        category: CATEGORY_OF[section],
        era: 'mixed',
        severity: 'warning',
        weight: SLOP_GATE_WEIGHT,
        section,
        pattern,
        message: hint,
        replacements: [...replacementsFromHint(hint, witness)],
        examples: { matching: [witness], clean: [] },
      },
    })
  }
  return { kind: 'mapped', edits, dropped }
}
