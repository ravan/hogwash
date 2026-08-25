import type { Threshold } from '../types.js'
import type { CorpusClassName } from './corpus.js'
import type { ClassScore, DocumentDensity, PackScore, RuleScore } from './metrics.js'
import { thresholdBand } from './metrics.js'

export type EvaluationReport = {
  readonly createdAt: string
  readonly threshold: Threshold
  readonly classes: readonly ClassScore[]
  readonly packs: readonly PackScore[]
  readonly notCollected: readonly CorpusClassName[]
}

export type GateFailure =
  | { readonly kind: 'classes-not-collected'; readonly names: readonly CorpusClassName[] }
  | { readonly kind: 'control-over-threshold'; readonly paths: readonly string[] }
  | { readonly kind: 'positive-under-threshold'; readonly paths: readonly string[] }

const thresholdPaths = (
  entry: ClassScore,
  threshold: Threshold,
  comparison: 'over' | 'under',
): readonly string[] =>
  entry.densities
    .filter((measured) =>
      comparison === 'over' ? measured.density > threshold : measured.density <= threshold,
    )
    .map((measured) => measured.path)

export function gateFailures(report: EvaluationReport): readonly GateFailure[] {
  const failures: GateFailure[] = []
  if (report.notCollected.length > 0) {
    failures.push({ kind: 'classes-not-collected', names: report.notCollected })
  }
  const controls = report.classes
    .filter((entry) => entry.kind === 'control')
    .flatMap((entry) => thresholdPaths(entry, report.threshold, 'over'))
  if (controls.length > 0) failures.push({ kind: 'control-over-threshold', paths: controls })
  const positives = report.classes
    .filter((entry) => entry.kind === 'positive')
    .flatMap((entry) => thresholdPaths(entry, report.threshold, 'under'))
  if (positives.length > 0) failures.push({ kind: 'positive-under-threshold', paths: positives })
  return failures
}

export function renderGateFailure(failure: GateFailure): string {
  switch (failure.kind) {
    case 'classes-not-collected':
      return `${failure.names.length} corpus class(es) have no documents: ${failure.names.join(', ')}`
    case 'control-over-threshold':
      return `${failure.paths.length} control document(s) exceed the threshold: ${failure.paths.join(', ')}`
    case 'positive-under-threshold':
      return `${failure.paths.length} positive document(s) do not exceed the threshold: ${failure.paths.join(', ')}`
  }
}

export const EVALUATION_PATH = 'docs/evaluation.md'
const rate = (value: number): string => value.toFixed(2)
const metric = (value: number | null): string => (value === null ? 'n/a' : value.toFixed(2))
const paths = (values: readonly string[]): string => (values.length === 0 ? '—' : values.join(', '))
const row = (cells: readonly string[]): string => `| ${cells.join(' | ')} |`
const divider = (count: number): string => row(Array.from({ length: count }, () => '---'))

const aggregateRules = (classes: readonly ClassScore[]): readonly RuleScore[] => {
  const totals = new Map<string, { true: number; false: number; missed: number }>()
  for (const entry of classes) {
    for (const score of entry.rules) {
      const current = totals.get(score.ruleId) ?? { true: 0, false: 0, missed: 0 }
      current.true += score.truePositives
      current.false += score.falsePositives
      current.missed += score.knownMisses
      totals.set(score.ruleId, current)
    }
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([ruleId, counts]) => ({
      ruleId: ruleId as RuleScore['ruleId'],
      truePositives: counts.true,
      falsePositives: counts.false,
      knownMisses: counts.missed,
      precision:
        counts.true + counts.false === 0 ? null : counts.true / (counts.true + counts.false),
      recall: counts.missed === 0 ? null : counts.true / (counts.true + counts.missed),
    }))
}

const measured = (entry: DocumentDensity | null): string =>
  entry === null ? 'none measured' : `${entry.density.toFixed(1)} (${entry.path})`

export function renderEvaluation(report: EvaluationReport): string {
  const lines = ['# hogwash scanner evaluation', '', `Generated ${report.createdAt}.`, '']
  const classHeader = [
    'class',
    'kind',
    'documents',
    'words',
    'false positives / 1000 words',
    'over threshold',
  ]
  lines.push('## Corpus classes', '', row(classHeader), divider(classHeader.length))
  for (const entry of report.classes) {
    lines.push(
      row([
        entry.name,
        entry.kind,
        String(entry.documents),
        String(entry.words),
        rate(entry.falsePositiveRate),
        paths(thresholdPaths(entry, report.threshold, 'over')),
      ]),
    )
  }
  const band = thresholdBand(report.classes)
  lines.push(
    '',
    '## Threshold',
    '',
    `- shipped default: ${report.threshold}`,
    `- highest control density: ${measured(band.highestControl)}`,
    `- lowest positive density: ${measured(band.lowestPositive)}`,
    '',
    '## Per-rule precision',
    '',
  )
  const ruleHeader = ['rule', 'true', 'false', 'missed', 'precision', 'recall']
  lines.push(row(ruleHeader), divider(ruleHeader.length))
  for (const score of aggregateRules(report.classes)) {
    lines.push(
      row([
        `\`${score.ruleId}\``,
        String(score.truePositives),
        String(score.falsePositives),
        String(score.knownMisses),
        metric(score.precision),
        metric(score.recall),
      ]),
    )
  }
  lines.push('', '## Per-pack precision', '')
  const packHeader = ['pack', 'rules raised', 'true', 'false', 'precision']
  lines.push(row(packHeader), divider(packHeader.length))
  for (const score of report.packs) {
    lines.push(
      row([
        score.pack,
        String(score.rulesRaised),
        String(score.truePositives),
        String(score.falsePositives),
        metric(score.precision),
      ]),
    )
  }
  if (report.notCollected.length > 0) {
    lines.push('', '## Not collected', '', ...report.notCollected.map((name) => `- ${name}`))
  }
  return `${lines.join('\n')}\n`
}
