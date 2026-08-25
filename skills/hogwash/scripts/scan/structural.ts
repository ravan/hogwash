import type { StructuralCheck, StructuralRule } from '../rules/schema.js'
import type { Block } from '../segment/markdown.js'
import { segment } from '../segment/markdown.js'
import type { Finding, Register } from '../types.js'
import { FindingSchema } from '../types.js'
import { effectiveWeight } from './density.js'

/**
 * Words a title-case heading leaves lower-case anyway, so their case says
 * nothing about the heading's own style. English closed-class words only; the
 * list is deliberately short, because a word wrongly on it hides a real tell.
 */
const MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'onto',
  'or',
  'over',
  'per',
  'the',
  'to',
  'up',
  'via',
  'vs',
  'with',
])

/** The heading's own words: no `#` marker, no emphasis, no inline code. */
const headingWords = (heading: string): readonly string[] =>
  heading
    .replace(/^#{1,6}\s+/, '')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[*_~]/g, '')
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, ''))
    .filter((word) => word.length > 0)

/**
 * Whether a heading is capitalised word by word. The first word is skipped,
 * because sentence case capitalises it too, and so are minor words and
 * all-caps acronyms. One lower-case word is enough to call a heading sentence
 * case. Calling it title case takes two capitalised words, because a single
 * one is as likely to be a proper noun.
 */
type HeadingCase = 'title' | 'sentence' | 'unknown'

function headingCase(heading: string): HeadingCase {
  const judged = headingWords(heading)
    .slice(1)
    .filter((word) => word !== word.toUpperCase() && !MINOR_WORDS.has(word.toLowerCase()))
  if (judged.some((word) => word[0] === word[0]?.toLowerCase())) return 'sentence'
  return judged.length >= 2 ? 'title' : 'unknown'
}

/**
 * The title-case headings of a document that otherwise uses sentence case. With
 * no sentence-case heading to compare against, the document is title case
 * throughout and nothing fires — the rule is about the odd one out.
 */
function titleCaseHeadings(text: string): readonly Block[] {
  const headings = segment(text).blocks.filter((block) => block.kind === 'heading')
  const cases = headings.map((block) => headingCase(text.slice(block.start, block.end)))
  if (!cases.includes('sentence')) return []
  return headings.filter((_, at) => cases[at] === 'title')
}

const blocksFor = (check: StructuralCheck, text: string): readonly Block[] => {
  switch (check) {
    case 'title-case-heading':
      return titleCaseHeadings(text)
  }
}

/** The deterministic whole-document checks, as findings on the spans they name. */
export function scanStructure(
  text: string,
  rules: readonly StructuralRule[],
  register: Register,
): readonly Finding[] {
  const findings: Finding[] = []
  for (const rule of rules) {
    for (const block of blocksFor(rule.check, text)) {
      findings.push(
        FindingSchema.parse({
          ruleId: rule.id,
          start: block.start,
          end: block.end,
          match: text.slice(block.start, block.end),
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          engine: 'structural',
          effectiveWeight: effectiveWeight(rule, register),
          suggestion: null,
          actionable: effectiveWeight(rule, register) > 0,
        }),
      )
    }
  }
  return findings.sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end ||
      (left.ruleId < right.ruleId ? -1 : left.ruleId > right.ruleId ? 1 : 0),
  )
}
