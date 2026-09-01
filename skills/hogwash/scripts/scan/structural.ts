import type { StructuralRule } from '../rules/schema.js'
import type { Block, DocumentStructure, Span } from '../segment/markdown.js'
import { proseSlice, segment } from '../segment/markdown.js'
import { sentenceSpans } from '../segment/sentences.js'
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

/**
 * The sentences of a block, over the raw text, with fenced and inline code
 * blanked out first. A command line is full of commas and full stops that are
 * not prose, and counting them would train the reader to skip these findings.
 */
const sentencesOf = (text: string, structure: DocumentStructure, block: Block): readonly Span[] =>
  sentenceSpans(proseSlice(text, structure, block), block.start)

/** The sentence as prose: its raw span, with any code inside it blanked out. */
const proseOf = (text: string, structure: DocumentStructure, span: Span): string =>
  proseSlice(text, structure, span)

/**
 * Commas that separate clauses. A thousands separator sits between two digits
 * and is not a clause boundary, so it does not count.
 */
const clauseCommas = (sentence: string): number =>
  sentence.replace(/(\d),(\d)/g, '$1$2').split(',').length - 1

/**
 * Sentences carrying more commas than the limit. Headings are titles rather
 * than sentences, so they are left out; list items are prose and are not.
 */
function overCommaedSentences(text: string, limit: number): readonly Span[] {
  const structure = segment(text)
  const found: Span[] = []
  for (const block of structure.blocks) {
    if (block.kind === 'heading') continue
    for (const span of sentencesOf(text, structure, block)) {
      if (clauseCommas(proseOf(text, structure, span)) > limit) found.push(span)
    }
  }
  return found
}

/** Paragraphs running longer than the limit in sentences. Lists are not paragraphs. */
function longParagraphs(text: string, limit: number): readonly Span[] {
  const structure = segment(text)
  return structure.blocks.filter(
    (block) => block.kind === 'paragraph' && sentencesOf(text, structure, block).length > limit,
  )
}

/** The limit a counting check falls back to when its pack names none. */
const DEFAULT_LIMIT = { 'over-commaed-sentence': 1, 'long-paragraph': 3 } as const

const spansFor = (rule: StructuralRule, text: string): readonly Span[] => {
  switch (rule.check) {
    case 'title-case-heading':
      return titleCaseHeadings(text)
    case 'over-commaed-sentence':
      return overCommaedSentences(text, rule.limit ?? DEFAULT_LIMIT['over-commaed-sentence'])
    case 'long-paragraph':
      return longParagraphs(text, rule.limit ?? DEFAULT_LIMIT['long-paragraph'])
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
    for (const block of spansFor(rule, text)) {
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
