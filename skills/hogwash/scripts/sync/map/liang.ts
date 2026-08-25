import { RuleIdSchema } from '../../types.js'
import type { RuleEdit } from '../draft.js'
import type { Mapper } from './mapper.js'

/** Frozen by rule-sources-S3's calibration (D5′, D6′). A change here is a code review. */
export const LIANG_RANK_CEILING = 10
export const LIANG_WEIGHT_TOP = 1.5
export const LIANG_WEIGHT_FLOOR = 0.5

export type LiangPos = 'adjective' | 'adverb'

const HEADER = 'rank\tpos\tword'
const SAFE_WORD = /^[a-z]+$/
const POSITIVE_INT = /^[1-9][0-9]*$/

export function liangWeight(rank: number): number {
  const span = LIANG_WEIGHT_TOP - LIANG_WEIGHT_FLOOR
  const fallen = LIANG_WEIGHT_TOP - (span * (rank - 1)) / (LIANG_RANK_CEILING - 1)
  return Math.round(fallen * 10) / 10
}

const sectionOf = (pos: LiangPos): string => `top 100 ${pos}s`

export const mapLiangTables: Mapper = (added) => {
  const edits: RuleEdit[] = []
  let dropped = 0

  for (const line of added) {
    if (line === '' || line.startsWith('#') || line === HEADER) continue
    const fields = line.split('\t')
    const [rank, pos, word] = fields
    if (fields.length !== 3 || rank === undefined || word === undefined) {
      return {
        kind: 'invalid',
        reason: `The table line "${line}" is not a rank, a pos and a word.`,
      }
    }
    if (!POSITIVE_INT.test(rank)) {
      return { kind: 'invalid', reason: `The table line "${line}" has no positive integer rank.` }
    }
    if (pos !== 'adjective' && pos !== 'adverb') {
      return {
        kind: 'invalid',
        reason: `The table line "${line}" names an unknown part of speech.`,
      }
    }
    if (Number(rank) > LIANG_RANK_CEILING || !SAFE_WORD.test(word)) {
      dropped += 1
      continue
    }
    const section = sectionOf(pos)
    edits.push({
      kind: 'add',
      rule: {
        engine: 'lexical',
        id: RuleIdSchema.parse(`xv.liang.${word}`),
        category: 'vocabulary',
        era: 'mixed',
        severity: 'warning',
        weight: liangWeight(Number(rank)),
        section,
        pattern: `\\b${word}\\b`,
        replacements: [],
        message: `"${word}" is ranked ${rank} of the ${section} that grew most disproportionately in ICLR 2024 peer reviews.`,
        examples: { matching: [word], clean: [] },
      },
    })
  }
  return { kind: 'mapped', edits, dropped }
}
