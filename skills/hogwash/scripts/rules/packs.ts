import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { HogwashError } from '../errors.js'
import type { PackName } from '../types.js'
import type {
  Gate,
  LexicalRule,
  Rule,
  RulePack,
  StructuralRule,
  StylometricRule,
} from './schema.js'
import { loadPack } from './schema.js'

export type LoadedRule = {
  readonly rule: Rule
  readonly pack: PackName
  readonly packAttribution: string
}

export type RuleSelection = {
  readonly packs: readonly PackName[]
  readonly gates: readonly Gate[]
  readonly deprecated: boolean
}

const BUNDLED_PACK_FILES = [
  'wikipedia-signs',
  'claudisms',
  'humanizer',
  'stylometry',
  'excess-vocab',
  'vale-ai-tells',
  'slop-gate',
  'unslop',
  'mechanics',
] as const

export function loadBundledPacks(): readonly RulePack[] {
  const packs: RulePack[] = []
  const owners = new Map<string, PackName>()
  for (const name of BUNDLED_PACK_FILES) {
    const location = new URL(`../../rules/${name}.json`, import.meta.url)
    const origin = fileURLToPath(location)
    const pack = loadPack(JSON.parse(readFileSync(location, 'utf8')), origin)
    for (const rule of pack.rules) {
      const owner = owners.get(rule.id)
      if (owner !== undefined) {
        throw new HogwashError({
          kind: 'config',
          message: `Rule id ${rule.id} appears in both ${owner} and ${pack.name}.`,
        })
      }
      owners.set(rule.id, pack.name)
    }
    packs.push(pack)
  }
  return packs
}

export function selectRules(
  packs: readonly RulePack[],
  selection: RuleSelection,
): readonly LoadedRule[] {
  const loaded: LoadedRule[] = []
  for (const pack of packs) {
    if (!selection.packs.includes(pack.name)) continue
    for (const rule of pack.rules) {
      if (rule.deprecated && !selection.deprecated) continue
      if (rule.gated !== null && !selection.gates.includes(rule.gated)) continue
      loaded.push({ rule, pack: pack.name, packAttribution: pack.attribution })
    }
  }
  return loaded
}

export function lexicalRules(selected: readonly LoadedRule[]): readonly LexicalRule[] {
  const rules: LexicalRule[] = []
  for (const loaded of selected) {
    if (loaded.rule.engine === 'lexical') rules.push(loaded.rule)
  }
  return rules
}

export function stylometricRules(selected: readonly LoadedRule[]): readonly StylometricRule[] {
  const rules: StylometricRule[] = []
  for (const loaded of selected) {
    if (loaded.rule.engine === 'stylometric') rules.push(loaded.rule)
  }
  return rules
}

export function structuralRules(selected: readonly LoadedRule[]): readonly StructuralRule[] {
  const rules: StructuralRule[] = []
  for (const loaded of selected) {
    if (loaded.rule.engine === 'structural') rules.push(loaded.rule)
  }
  return rules
}
