import type { StylometricMetric, StylometricRule } from '../rules/schema.js'
import type { Block, DocumentStructure, Span } from '../segment/markdown.js'
import { proseSlice, segment } from '../segment/markdown.js'
import { sentenceSpans } from '../segment/sentences.js'
import type { Finding, Register } from '../types.js'
import { FindingSchema } from '../types.js'
import {
  coefficientOfVariation,
  contractionRate,
  headingShape,
  proseWords,
  punctuationDensity,
  repeatedOpenerShare,
  typeTokenRatio,
} from './measures.js'

const PARAGRAPH_WORD_GATE = 40
const DOCUMENT_PARAGRAPH_WORD_GATE = 30
const DOCUMENT_PARAGRAPH_GATE = 3
const DOCUMENT_HEADING_GATE = 4
const SENTENCE_GATE = 3
const DIVERSITY_WINDOW = 40

type Sample = { readonly span: Span; readonly value: number }
export type StylometricSample = Sample

export const firesAbove = (metric: StylometricMetric): boolean => {
  switch (metric) {
    case 'punctuation-density':
    case 'sentence-opener-repetition':
    case 'heading-uniformity':
      return true
    case 'sentence-uniformity':
    case 'paragraph-uniformity':
    case 'lexical-diversity':
    case 'contraction-rate':
      return false
  }
}

type Paragraph = {
  readonly block: Block
  readonly prose: string
  readonly words: readonly string[]
}

function paragraphSample(paragraph: Paragraph, metric: StylometricMetric): Sample | null {
  if (paragraph.words.length < PARAGRAPH_WORD_GATE) return null
  switch (metric) {
    case 'sentence-uniformity': {
      const sentences = sentenceSpans(paragraph.prose, paragraph.block.start)
      if (sentences.length < SENTENCE_GATE) return null
      const counts = sentences.map(
        (sentence) =>
          proseWords(
            paragraph.prose.slice(
              sentence.start - paragraph.block.start,
              sentence.end - paragraph.block.start,
            ),
          ).length,
      )
      return { span: paragraph.block, value: coefficientOfVariation(counts) }
    }
    case 'sentence-opener-repetition': {
      const sentences = sentenceSpans(paragraph.prose, paragraph.block.start)
      if (sentences.length < SENTENCE_GATE) return null
      const openers = sentences.flatMap((sentence) => {
        const first = proseWords(
          paragraph.prose.slice(
            sentence.start - paragraph.block.start,
            sentence.end - paragraph.block.start,
          ),
        )[0]
        return first === undefined ? [] : [first]
      })
      if (openers.length < SENTENCE_GATE) return null
      return { span: paragraph.block, value: repeatedOpenerShare(openers) }
    }
    case 'lexical-diversity':
      return {
        span: paragraph.block,
        value: typeTokenRatio(paragraph.words, DIVERSITY_WINDOW),
      }
    case 'contraction-rate':
      return { span: paragraph.block, value: contractionRate(paragraph.words) }
    case 'punctuation-density':
      return {
        span: paragraph.block,
        value: punctuationDensity(paragraph.prose, paragraph.words.length),
      }
    case 'paragraph-uniformity':
    case 'heading-uniformity':
      return null
  }
}

function documentSample(paragraphs: readonly Paragraph[]): Sample | null {
  const measured = paragraphs.filter(
    (paragraph) => paragraph.words.length >= DOCUMENT_PARAGRAPH_WORD_GATE,
  )
  if (measured.length < DOCUMENT_PARAGRAPH_GATE) return null
  const first = measured[0]
  const last = measured[measured.length - 1]
  if (first === undefined || last === undefined) return null
  return {
    span: { start: first.block.start, end: last.block.end },
    value: coefficientOfVariation(measured.map((paragraph) => paragraph.words.length)),
  }
}

function headingSample(text: string, structure: DocumentStructure): Sample | null {
  const shaped = structure.blocks
    .filter((block) => block.kind === 'heading')
    .flatMap((block) => {
      const shape = headingShape(proseSlice(text, structure, block))
      return shape === null ? [] : [{ block, shape }]
    })
  if (shaped.length < DOCUMENT_HEADING_GATE) return null
  const first = shaped[0]
  const last = shaped[shaped.length - 1]
  if (first === undefined || last === undefined) return null
  return {
    span: { start: first.block.start, end: last.block.end },
    value: repeatedOpenerShare(shaped.map((heading) => heading.shape)),
  }
}

function buildParagraphs(text: string, structure: DocumentStructure): readonly Paragraph[] {
  return structure.blocks
    .filter((block) => block.kind === 'paragraph')
    .map((block) => {
      const prose = proseSlice(text, structure, block)
      return { block, prose, words: proseWords(prose) }
    })
}

function metricSamples(
  text: string,
  structure: DocumentStructure,
  paragraphs: readonly Paragraph[],
  metric: StylometricMetric,
): readonly (Sample | null)[] {
  return metric === 'paragraph-uniformity'
    ? [documentSample(paragraphs)]
    : metric === 'heading-uniformity'
      ? [headingSample(text, structure)]
      : paragraphs.map((paragraph) => paragraphSample(paragraph, metric))
}

/** Raw measured values for one metric over a document, gates applied.
 *  This is what calibration reads; scanStylometry fires on the same values. */
export function stylometrySamples(
  text: string,
  metric: StylometricMetric,
): readonly StylometricSample[] {
  const structure = segment(text)
  const paragraphs = buildParagraphs(text, structure)
  return metricSamples(text, structure, paragraphs, metric).filter(
    (sample): sample is Sample => sample !== null,
  )
}

export function scanStylometry(
  text: string,
  rules: readonly StylometricRule[],
  register: Register,
): readonly Finding[] {
  if (rules.length === 0) return []
  const structure = segment(text)
  const paragraphs = buildParagraphs(text, structure)

  const findings: Finding[] = []
  for (const rule of rules) {
    const samples =
      rule.metric === 'paragraph-uniformity'
        ? [documentSample(paragraphs)]
        : rule.metric === 'heading-uniformity'
          ? [headingSample(text, structure)]
          : paragraphs.map((paragraph) => paragraphSample(paragraph, rule.metric))
    const baseline = rule.baselines[register]
    for (const sample of samples) {
      if (sample === null) continue
      const fires = firesAbove(rule.metric) ? sample.value > baseline : sample.value < baseline
      if (!fires) continue
      findings.push(
        FindingSchema.parse({
          ruleId: rule.id,
          start: sample.span.start,
          end: sample.span.end,
          match: text.slice(sample.span.start, sample.span.end),
          category: rule.category,
          severity: rule.severity,
          message: rule.message,
          engine: 'stylometric',
          effectiveWeight: 0,
          suggestion: null,
          actionable: false,
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
