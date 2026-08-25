import { describe, expect, it } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { ConfigSchema } from '../scripts/config.js'
import type { LoadedItem } from '../scripts/eval/corpus.js'
import { loadCorpus } from '../scripts/eval/corpus.js'
import type { ScanRules } from '../scripts/report/build.js'
import { buildReport } from '../scripts/report/build.js'
import {
  lexicalRules,
  loadBundledPacks,
  selectRules,
  stylometricRules,
} from '../scripts/rules/packs.js'
import { DEFAULT_THRESHOLD } from '../scripts/scan/density.js'
import type { FileReport } from '../scripts/types.js'

const root = fileURLToPath(new URL('../', import.meta.url))

const selected = selectRules(loadBundledPacks(), {
  packs: ConfigSchema.parse({}).packs,
  gates: [],
  deprecated: false,
})

const rules: ScanRules = {
  lexical: lexicalRules(selected),
  stylometric: stylometricRules(selected),
  structural: [],
}

const corpus = loadCorpus(root)

const measure = (item: LoadedItem): FileReport => {
  const config = ConfigSchema.parse({ register: item.item.register })
  const file = buildReport([{ path: item.item.path, text: item.text }], rules, config, 'fixed')
    .files[0]
  if (file === undefined) throw new Error(`no file report for ${item.item.path}`)
  return file
}

const itemsOf = (kind: 'positive' | 'control'): readonly [string, LoadedItem][] =>
  corpus
    .filter((entry) => entry.kind === kind)
    .flatMap((entry) =>
      entry.items.map((item): [string, LoadedItem] => [`${entry.name}/${item.item.path}`, item]),
    )

describe('the evaluation corpus', () => {
  it('declares every class exactly once', () => {
    const names = corpus.map((entry) => entry.name)
    expect(names).toHaveLength(11)
    expect(new Set(names).size).toBe(names.length)
  })

  it.each(itemsOf('control'))('keeps %s under the threshold', (_label, item) => {
    expect(measure(item).density).toBeLessThan(DEFAULT_THRESHOLD)
  })

  it.each(itemsOf('positive'))('pushes %s over the threshold', (_label, item) => {
    expect(measure(item).density).toBeGreaterThan(DEFAULT_THRESHOLD)
  })

  const claudeItems = corpus
    .filter((entry) => entry.name === 'ai-claude')
    .flatMap((entry) => entry.items.map((item): [string, LoadedItem] => [item.item.path, item]))

  // Advisory rules are judgement calls by construction, so they carry no weight
  // and cannot fail this gate. Only a counting rule is a false positive here.
  it.each(claudeItems)('keeps %s free of counting lexical findings', (_label, item) => {
    expect(
      measure(item).findings.filter(
        (finding) => finding.engine === 'lexical' && finding.effectiveWeight > 0,
      ),
    ).toEqual([])
  })

  it.each([...itemsOf('control'), ...itemsOf('positive')])(
    'adjudicates only spans the scanner raises in %s',
    (label, item) => {
      const raised = new Set(
        measure(item).findings.map((finding) => `${finding.ruleId} ${finding.match}`),
      )
      for (const span of item.adjudication.falsePositives) {
        expect(raised.has(`${span.ruleId} ${span.quote}`), `${label}: ${span.quote}`).toBe(true)
      }
    },
  )
})
