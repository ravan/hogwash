import { HogwashError } from '../../errors.js'
import { RuleIdSchema } from '../../types.js'
import type { RuleEdit } from '../draft.js'
import type { ParsedSource } from '../source.js'
import { contentRevision } from '../source.js'
import { parseCsv } from './csv.js'
import type { Mapper } from './mapper.js'

/** Frozen by rule-sources-S1's calibration. A change here is a code review. */
export const RATIO_FLOOR = 2
export const WEIGHT_DIVISOR = 4
export const WEIGHT_FLOOR = 0.5
export const WEIGHT_CAP = 3

const configError = (message: string): HogwashError => new HogwashError({ kind: 'config', message })

function columnOf(header: readonly string[], name: string, file: string): number {
  const at = header.indexOf(name)
  if (at === -1) throw configError(`The ${file} body has no ${name} column.`)
  return at
}

function body(bodies: readonly string[], at: number, file: string): string {
  const text = bodies[at]
  if (text === undefined) throw configError(`The excess-vocab source fetched no ${file} body.`)
  return text
}

/**
 * `bodies[0]` is excess_words.csv, `bodies[1]` is the yearly counts CSV.
 * The snapshot is one `word\tratio` line per style word, ratio to four
 * decimals, sorted by word. Throws HogwashError{kind:'config'}.
 */
export function parseExcessVocab(bodies: readonly string[]): ParsedSource {
  const wordRows = parseCsv(body(bodies, 0, 'excess-words'))
  const countRows = parseCsv(body(bodies, 1, 'yearly-counts'))

  const wordHeader = wordRows[0]
  if (wordHeader === undefined) throw configError('The excess-words body is empty.')
  const wordAt = columnOf(wordHeader, 'word', 'excess-words')
  const typeAt = columnOf(wordHeader, 'type', 'excess-words')

  const countHeader = countRows[0]
  if (countHeader === undefined) throw configError('The yearly-counts body is empty.')
  const countWordAt = columnOf(countHeader, 'word', 'yearly-counts')
  const at2022 = columnOf(countHeader, '2022', 'yearly-counts')
  const at2024 = columnOf(countHeader, '2024', 'yearly-counts')

  const counts = new Map<string, readonly string[]>()
  for (const row of countRows.slice(1)) counts.set(row[countWordAt] ?? '', row)
  const totals = counts.get('')
  if (totals === undefined) throw configError('The yearly-counts body has no totals row.')
  const total2022 = Number(totals[at2022])
  const total2024 = Number(totals[at2024])

  const entries: { readonly word: string; readonly ratio: number }[] = []
  for (const row of wordRows.slice(1)) {
    if (row[typeAt] !== 'style') continue
    const word = row[wordAt] ?? ''
    const countRow = counts.get(word)
    if (word === '' || countRow === undefined) continue
    const count2022 = Number(countRow[at2022])
    if (count2022 === 0) continue
    entries.push({
      word,
      ratio: Number(countRow[at2024]) / total2024 / (count2022 / total2022),
    })
  }
  entries.sort((left, right) => (left.word < right.word ? -1 : 1))

  const lines = entries.map((entry) => `${entry.word}\t${entry.ratio.toFixed(4)}`)
  const snapshot = lines.length === 0 ? '' : `${lines.join('\n')}\n`
  return { snapshot, revision: contentRevision(snapshot) }
}

const SAFE_WORD = /^[a-z]+$/

export const mapExcessVocab: Mapper = (added) => {
  const edits: RuleEdit[] = []
  let dropped = 0

  for (const line of added) {
    const fields = line.split('\t')
    const word = fields[0]
    const ratio = Number(fields[1])
    if (fields.length !== 2 || word === undefined || !Number.isFinite(ratio) || ratio <= 0) {
      return { kind: 'invalid', reason: `The snapshot line "${line}" is not a word and a ratio.` }
    }
    if (!SAFE_WORD.test(word) || ratio < RATIO_FLOOR) {
      dropped += 1
      continue
    }
    const weight =
      Math.round(Math.min(WEIGHT_CAP, Math.max(WEIGHT_FLOOR, ratio / WEIGHT_DIVISOR)) * 10) / 10
    edits.push({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: RuleIdSchema.parse(`xv.vocab.${word}`),
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight,
        section: 'excess vocabulary',
        pattern: `\\b${word}\\b`,
        replacements: [],
        message: `"${word}" appears ${ratio.toFixed(1)} times more often in 2024 academic abstracts than in 2022.`,
        examples: { matching: [word], clean: [] },
      },
    })
  }
  return { kind: 'mapped', edits, dropped }
}
