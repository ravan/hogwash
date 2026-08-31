import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyOverrides, banListPath, loadConfig } from '../config.js'
import { HogwashError } from '../errors.js'
import { buildReport } from '../report/build.js'
import { loadBanList } from '../rules/banlist.js'
import {
  lexicalRules,
  loadBundledPacks,
  selectRules,
  structuralRules,
  stylometricRules,
} from '../rules/packs.js'
import type { PackName, RuleId } from '../types.js'
import type { LoadedClass } from './corpus.js'
import { loadCorpus } from './corpus.js'
import type { ClassScore, ScoredDocument } from './metrics.js'
import { adjudicate, scoreClass, scorePacks } from './metrics.js'
import type { EvaluationReport } from './report.js'
import { EVALUATION_PATH, gateFailures, renderEvaluation, renderGateFailure } from './report.js'

const USAGE = 'usage: eval [--gate] [--out <path>]'

const usageFailure = (): never => {
  throw new HogwashError({ kind: 'usage', message: USAGE })
}

function parseArgs(argv: readonly string[]): { readonly gate: boolean; readonly out: string } {
  let gate = false
  let out = EVALUATION_PATH
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--gate') {
      gate = true
    } else if (argument === '--out') {
      const value = argv[++index]
      if (value === undefined || value.startsWith('-')) return usageFailure()
      out = value
    } else {
      return usageFailure()
    }
  }
  return { gate, out }
}

try {
  const args = parseArgs(process.argv.slice(2))
  const createdAt = new Date().toISOString()
  const cwd = process.cwd()
  const config = await loadConfig(cwd)
  const banPack = await loadBanList(join(cwd, banListPath(config)))
  const selected = selectRules([...loadBundledPacks(), banPack], {
    packs: [...config.packs, banPack.name],
    gates: config.gates,
    deprecated: config.includeDeprecatedRules,
  })
  const scanRules = {
    lexical: lexicalRules(selected),
    stylometric: stylometricRules(selected),
    structural: structuralRules(selected),
  }
  // The corpus lives in the repo's tests tree, not in the shipped skill; the config and the output belong to the project.
  const corpus = loadCorpus(fileURLToPath(new URL('../../../../', import.meta.url)))
  const classes: ClassScore[] = []
  const notCollected: LoadedClass['name'][] = []

  for (const entry of corpus) {
    if (entry.items.length === 0) {
      notCollected.push(entry.name)
      continue
    }
    const documents: ScoredDocument[] = entry.items.map((item) => {
      const itemConfig = applyOverrides(config, {
        register: item.item.register,
        threshold: null,
        short: false,
      })
      const file = buildReport(
        [{ path: item.item.path, text: item.text }],
        scanRules,
        itemConfig,
        createdAt,
      ).files[0]
      if (file === undefined) throw new Error('the report held no file')
      return {
        path: item.item.path,
        words: file.words,
        density: file.density,
        adjudicated: adjudicate(file.findings, item.adjudication),
        missed: item.adjudication.missed,
      }
    })
    classes.push(scoreClass(entry.name, entry.kind, documents))
  }

  const packOf: ReadonlyMap<RuleId, PackName> = new Map(
    selected.map((loaded) => [loaded.rule.id, loaded.pack]),
  )
  const report: EvaluationReport = {
    createdAt,
    threshold: config.threshold,
    classes,
    packs: scorePacks(classes, packOf, config.packs),
    notCollected,
  }
  writeFileSync(args.out, renderEvaluation(report), 'utf8')
  console.log(args.out)
  const failures = args.gate ? gateFailures(report) : []
  for (const failure of failures) console.error(renderGateFailure(failure))
  process.exitCode = failures.length === 0 ? 0 : 1
} catch (error) {
  if (!(error instanceof HogwashError)) throw error
  console.error(error.message)
  process.exitCode = 2
}
