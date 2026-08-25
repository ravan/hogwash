import type { Density, Finding, PackName, RuleId, WordCount } from '../types.js'
import type { Adjudication, CorpusClassKind, CorpusClassName } from './corpus.js'

export type Verdict = 'true-positive' | 'false-positive'
export type AdjudicatedFinding = {
  readonly finding: Finding
  readonly verdict: Verdict
}

export type RuleScore = {
  readonly ruleId: RuleId
  readonly truePositives: number
  readonly falsePositives: number
  readonly knownMisses: number
  /** null when the rule raised nothing. */
  readonly precision: number | null
  /** null when no miss was recorded for the rule — an unrecorded miss is not evidence. */
  readonly recall: number | null
}

export type ScoredDocument = {
  readonly path: string
  readonly words: WordCount
  readonly density: Density
  readonly adjudicated: readonly AdjudicatedFinding[]
  readonly missed: readonly Adjudication['missed'][number][]
}

/** One measured document's density. The over-threshold list and the threshold
 *  band are both derived from these, so they cannot disagree. */
export type DocumentDensity = {
  readonly path: string
  readonly density: Density
}

export type ClassScore = {
  readonly name: CorpusClassName
  readonly kind: CorpusClassKind
  readonly documents: number
  readonly words: number
  /** False positives per 1000 prose words. */
  readonly falsePositiveRate: number
  readonly densities: readonly DocumentDensity[]
  readonly rules: readonly RuleScore[]
}

type Tally = {
  truePositives: number
  falsePositives: number
  knownMisses: number
}

const spanKey = (ruleId: RuleId, quote: string): string => `${ruleId} ${quote}`

export function adjudicate(
  findings: readonly Finding[],
  adjudication: Adjudication,
): readonly AdjudicatedFinding[] {
  const listed = new Set(
    adjudication.falsePositives.map((span) => spanKey(span.ruleId, span.quote)),
  )
  return findings.map((finding) => ({
    finding,
    verdict: listed.has(spanKey(finding.ruleId, finding.match))
      ? ('false-positive' as const)
      : ('true-positive' as const),
  }))
}

export function scoreRules(documents: readonly ScoredDocument[]): readonly RuleScore[] {
  const tallies = new Map<RuleId, Tally>()
  const tally = (ruleId: RuleId): Tally => {
    const existing = tallies.get(ruleId)
    if (existing !== undefined) return existing
    const fresh: Tally = { truePositives: 0, falsePositives: 0, knownMisses: 0 }
    tallies.set(ruleId, fresh)
    return fresh
  }
  for (const document of documents) {
    for (const entry of document.adjudicated) {
      const current = tally(entry.finding.ruleId)
      if (entry.verdict === 'true-positive') current.truePositives += 1
      else current.falsePositives += 1
    }
    for (const miss of document.missed) tally(miss.ruleId).knownMisses += 1
  }
  return [...tallies.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([ruleId, counts]) => {
      const raised = counts.truePositives + counts.falsePositives
      return {
        ruleId,
        truePositives: counts.truePositives,
        falsePositives: counts.falsePositives,
        knownMisses: counts.knownMisses,
        precision: raised === 0 ? null : counts.truePositives / raised,
        recall:
          counts.knownMisses === 0
            ? null
            : counts.truePositives / (counts.truePositives + counts.knownMisses),
      }
    })
}

export function scoreClass(
  name: CorpusClassName,
  kind: CorpusClassKind,
  documents: readonly ScoredDocument[],
): ClassScore {
  const words = documents.reduce((total, document) => total + document.words, 0)
  const falsePositives = documents.reduce(
    (total, document) =>
      total + document.adjudicated.filter((entry) => entry.verdict === 'false-positive').length,
    0,
  )
  return {
    name,
    kind,
    documents: documents.length,
    words,
    falsePositiveRate: words === 0 ? 0 : (falsePositives * 1000) / words,
    densities: documents.map((document) => ({
      path: document.path,
      density: document.density,
    })),
    rules: scoreRules(documents),
  }
}

export type PackScore = {
  readonly pack: PackName
  /** Distinct rules of this pack that raised at least one span, corpus-wide. */
  readonly rulesRaised: number
  readonly truePositives: number
  readonly falsePositives: number
  /** null when the pack raised nothing across the corpus. */
  readonly precision: number | null
}

/** One entry per name in `enabled`, in `enabled` order, so an enabled pack that
 *  raised nothing still gets a row. A ruleId absent from `packOf` is ignored. */
export function scorePacks(
  classes: readonly ClassScore[],
  packOf: ReadonlyMap<RuleId, PackName>,
  enabled: readonly PackName[],
): readonly PackScore[] {
  const totals = new Map<PackName, { true: number; false: number; raised: Set<RuleId> }>()
  for (const entry of classes) {
    for (const score of entry.rules) {
      const pack = packOf.get(score.ruleId)
      if (pack === undefined) continue
      const current = totals.get(pack) ?? { true: 0, false: 0, raised: new Set<RuleId>() }
      current.true += score.truePositives
      current.false += score.falsePositives
      if (score.truePositives + score.falsePositives > 0) current.raised.add(score.ruleId)
      totals.set(pack, current)
    }
  }
  return enabled.map((pack) => {
    const counts = totals.get(pack) ?? { true: 0, false: 0, raised: new Set<RuleId>() }
    const raised = counts.true + counts.false
    return {
      pack,
      rulesRaised: counts.raised.size,
      truePositives: counts.true,
      falsePositives: counts.false,
      precision: raised === 0 ? null : counts.true / raised,
    }
  })
}

/** The gap the shipped default threshold has to sit inside. */
export type ThresholdBand = {
  /** null when the evaluation measured no control document. */
  readonly highestControl: DocumentDensity | null
  /** null when the evaluation measured no positive document. */
  readonly lowestPositive: DocumentDensity | null
}

export function thresholdBand(classes: readonly ClassScore[]): ThresholdBand {
  let highestControl: DocumentDensity | null = null
  let lowestPositive: DocumentDensity | null = null
  for (const entry of classes) {
    for (const measured of entry.densities) {
      if (entry.kind === 'control') {
        if (highestControl === null || measured.density > highestControl.density) {
          highestControl = measured
        }
      } else if (lowestPositive === null || measured.density < lowestPositive.density) {
        lowestPositive = measured
      }
    }
  }
  return { highestControl, lowestPositive }
}
