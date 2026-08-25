// verbatim exception — the ordered strip table IS the normalizer's design
const STRIPS: readonly (readonly [RegExp, string])[] = [
  [/<!--[\s\S]*?-->/g, ''],
  [/<ref[^>]*\/>/g, ''],
  [/<ref[^>]*>[\s\S]*?<\/ref>/g, ''],
  [/^\{\|[\s\S]*?^\|\}$/gm, ''],
]
const AFTER_TEMPLATES: readonly (readonly [RegExp, string])[] = [
  [/\[\[(?:[^[\]|]*\|)?([^[\]|]*)\]\]/g, '$1'],
  [/\[(?:https?:|\/\/)\S*(?:\s+([^\]]*))?\]/g, '$1'],
  [/<\/?[a-zA-Z][^>]*>/g, ''],
  [/'''''|'''|''/g, ''],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
  [/&quot;/g, '"'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
]
const KEEP_NAMED: ReadonlySet<string> = new Set(['text', 'content', 'quote', '1', '2', '3'])

const NAMED_SEGMENT = /^\s*([A-Za-z0-9_ -]+?)\s*=([\s\S]*)$/

/** The index just past the `}}` that closes the `{{` at `open`, or null when unbalanced. */
function closeOf(text: string, open: number): number | null {
  let depth = 0
  let at = open
  while (at < text.length) {
    if (text.startsWith('{{', at)) {
      depth += 1
      at += 2
      continue
    }
    if (text.startsWith('}}', at)) {
      depth -= 1
      at += 2
      if (depth === 0) return at
      continue
    }
    at += 1
  }
  return null
}

function splitSegments(body: string): readonly string[] {
  const segments: string[] = []
  let braces = 0
  let brackets = 0
  let start = 0
  let at = 0
  while (at < body.length) {
    if (body.startsWith('{{', at) || body.startsWith('}}', at)) {
      braces += body.startsWith('{{', at) ? 1 : -1
      at += 2
      continue
    }
    if (body.startsWith('[[', at) || body.startsWith(']]', at)) {
      brackets += body.startsWith('[[', at) ? 1 : -1
      at += 2
      continue
    }
    if (body[at] === '|' && braces === 0 && brackets === 0) {
      segments.push(body.slice(start, at))
      start = at + 1
    }
    at += 1
  }
  segments.push(body.slice(start))
  return segments
}

function stripTemplates(text: string): string {
  let result = ''
  let at = 0
  while (at < text.length) {
    const open = text.indexOf('{{', at)
    if (open === -1) {
      result += text.slice(at)
      break
    }
    const close = closeOf(text, open)
    if (close === null) {
      result += text.slice(at)
      break
    }
    result += text.slice(at, open)
    const body = text.slice(open + 2, close - 2)
    const kept: string[] = []
    for (const segment of splitSegments(body).slice(1)) {
      const named = NAMED_SEGMENT.exec(segment)
      if (named === null) {
        kept.push(segment)
        continue
      }
      const name = named[1] ?? ''
      const value = named[2] ?? ''
      if (KEEP_NAMED.has(name.toLowerCase())) kept.push(value)
    }
    result += stripTemplates(kept.join(' '))
    at = close
  }
  return result
}

/** One line per non-blank source line, inner runs of whitespace collapsed. */
function normalizeLines(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line !== '')
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`
}

export function normalizeWikitext(wikitext: string): string {
  let text = wikitext.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (const [pattern, replacement] of STRIPS) text = text.replace(pattern, replacement)
  text = stripTemplates(text)
  for (const [pattern, replacement] of AFTER_TEMPLATES) text = text.replace(pattern, replacement)
  return normalizeLines(text)
}

/**
 * Markdown sources need far less work than wikitext: no templates, no refs. The
 * comment strip matters for the same reason it does there — a comment is text
 * the page does not show, so diffing it would churn the snapshot for nothing,
 * and it is the obvious place to hide instructions aimed at the drafting agent.
 */
export function normalizeMarkdown(markdown: string): string {
  const text = markdown
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
  return normalizeLines(text)
}
