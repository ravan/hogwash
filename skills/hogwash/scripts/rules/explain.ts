import { HogwashError } from '../errors.js'
import type { LoadedRule } from './packs.js'

export function renderRuleList(selected: readonly LoadedRule[]): string {
  return selected
    .map(({ rule, pack }) => `${rule.id} ${pack} ${rule.engine} ${rule.category}`)
    .join('\n')
}

export function renderRuleExplanation(selected: readonly LoadedRule[], id: string): string {
  const loaded = selected.find((entry) => entry.rule.id === id)
  if (loaded === undefined) {
    throw new HogwashError({ kind: 'usage', message: `No such rule: ${id}` })
  }
  const { rule, pack, packAttribution } = loaded
  const lines = [
    `id: ${rule.id}`,
    `pack: ${pack}`,
    `category: ${rule.category}`,
    `engine: ${rule.engine}`,
    `severity: ${rule.severity}`,
  ]
  if (rule.engine === 'stylometric') {
    lines.push(
      `era: ${rule.era}`,
      `gate: ${rule.gated ?? 'none'}`,
      `message: ${rule.message}`,
      `metric: ${rule.metric}`,
      `baselines: technical ${rule.baselines.technical}, prose ${rule.baselines.prose}, marketing ${rule.baselines.marketing}`,
    )
  } else {
    lines.push(
      `weight: ${rule.weight}`,
      `registers: technical ${rule.registers.technical}, prose ${rule.registers.prose}, marketing ${rule.registers.marketing}`,
      `era: ${rule.era}`,
      `reliable: ${rule.reliable}`,
      `gate: ${rule.gated ?? 'none'}`,
      `message: ${rule.message}`,
    )
    if (rule.engine === 'lexical') {
      lines.push(`pattern: ${rule.pattern}`)
      for (const r of rule.replacements)
        lines.push(`replacement: ${r.when} -> ${JSON.stringify(r.text)}`)
    } else {
      lines.push(`check: ${rule.check}`)
    }
    for (const example of rule.examples.matching) lines.push(`matches: ${example}`)
    for (const example of rule.examples.clean) lines.push(`clean: ${example}`)
  }
  lines.push(`rule attribution: ${rule.attribution}`)
  lines.push(`pack attribution: ${packAttribution}`)
  return lines.join('\n')
}
