import type { LexicalRule } from './schema.js'

/** The literal replacement for `matched`, or null when no entry covers it. */
export function replacementFor(rule: LexicalRule, matched: string): string | null {
  for (const entry of rule.replacements) {
    if (!new RegExp(`^(?:${entry.when})$`, 'i').test(matched)) continue
    const first = matched.charAt(0)
    const lead = entry.text.charAt(0)
    if (lead === '' || first === first.toLowerCase()) return entry.text
    return lead.toUpperCase() + entry.text.slice(1)
  }
  return null
}
