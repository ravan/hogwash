/**
 * Upstream pages are text other people control, and the sync feeds changed lines
 * to an agent. This scan runs on the raw body, before normalization, because the
 * normalizer strips HTML comments — the one place an instruction aimed at the
 * drafting agent would sit unseen by a human reading the rendered page.
 *
 * Two grades, and the split matters. A banlist quotes the phrases it bans, so
 * "As an AI language model" appears in the Wikipedia page as a specimen, not as
 * a directive. Visible instruction-like prose therefore warns; it never blocks,
 * or the wiki sync would never run again. What blocks is the machinery that
 * changes meaning or executes on its own: bidi overrides, executable markup,
 * dangerous URIs, and instructions hidden where no reader would see them.
 */

export type InjectionGrade = 'block' | 'warn'

export type InjectionFinding = {
  readonly grade: InjectionGrade
  readonly kind: string
  readonly line: number
  readonly excerpt: string
}

/** Instruction shapes aimed at whatever reads the text next. */
const DIRECTIVE =
  /\b(ignore|disregard|forget)\s+(all\s+|any\s+)?(previous|prior|earlier|above|the\s+above)\b|\bnew\s+instructions?\b|\byou\s+are\s+now\b|\bsystem\s+prompt\b|\bdo\s+not\s+(tell|inform|mention\s+to)\s+(the\s+)?(user|human|operator)\b|\binstead,?\s+(output|return|reply|respond|emit|write)\b|\badd\s+the\s+following\s+rule\b|\brun\s+the\s+following\b|\bexecute\s+the\s+following\b/i

/**
 * Bidi overrides reorder what a reader sees without changing what a parser
 * reads — the Trojan Source attack. There is no honest use for one in a prose
 * banlist, and unlike a zero-width space it changes meaning on its own. U+001B
 * rides along for the same reason: an ESC opens an ANSI sequence, which repaints
 * the terminal of anyone who prints the text.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: ESC is what this pattern is for, not an accident
const BIDI = /[\u202A-\u202E\u2066-\u2069\u001B]/

/**
 * Zero-width and invisible characters only obfuscate; they cannot instruct.
 * They also turn up honestly: U+200D joins the parts of an emoji like
 * "\u{1F9D1}‍\u{1F4BB}", U+200C and U+200D carry meaning in Arabic and
 * Indic shaping, and a page that catalogues hidden characters quotes them as
 * specimens. So they are worth surfacing and not worth blocking on.
 */
const HIDDEN = /[\u00AD\u200B-\u200F\u2060-\u2064\uFEFF\u180E]/

const EXECUTABLE = /<\s*(script|iframe|object|embed|form)\b|\son[a-z]+\s*=\s*["']/i
const DANGEROUS_URI = /\b(javascript:|vbscript:|data:text\/html)/i
const SHELL = /\b(curl|wget|bash|sh\s+-c|npm\s+i(nstall)?|pip\s+install|rm\s+-rf|chmod\s+\+x)\b/

const lineOf = (text: string, index: number): number => text.slice(0, index).split('\n').length

const excerpt = (text: string, index: number, length: number): string =>
  text
    .slice(Math.max(0, index - 30), index + length + 40)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)

function pushAll(
  findings: InjectionFinding[],
  raw: string,
  pattern: RegExp,
  grade: InjectionGrade,
  kind: string,
): void {
  const global = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`)
  let match = global.exec(raw)
  while (match !== null) {
    if (match[0].length === 0) {
      global.lastIndex += 1
    } else {
      findings.push({
        grade,
        kind,
        line: lineOf(raw, match.index),
        excerpt: excerpt(raw, match.index, match[0].length),
      })
    }
    match = global.exec(raw)
  }
}

/** Scans a fetched body. Returns every finding; the caller decides what to do. */
export function scanInjection(raw: string): readonly InjectionFinding[] {
  const findings: InjectionFinding[] = []

  pushAll(findings, raw, BIDI, 'block', 'bidi-override')
  pushAll(findings, raw, EXECUTABLE, 'block', 'executable-markup')
  pushAll(findings, raw, DANGEROUS_URI, 'block', 'dangerous-uri')

  // A comment is invisible in the rendered page. An instruction inside one is
  // aimed at a machine by construction, so it blocks rather than warns.
  const comments = /<!--([\s\S]*?)-->/g
  let comment = comments.exec(raw)
  while (comment !== null) {
    const body = comment[1] ?? ''
    if (DIRECTIVE.test(body) || SHELL.test(body)) {
      findings.push({
        grade: 'block',
        kind: 'hidden-instruction',
        line: lineOf(raw, comment.index),
        excerpt: excerpt(raw, comment.index, comment[0].length),
      })
    }
    comment = comments.exec(raw)
  }

  // Visible prose. A banlist quotes these as specimens, so a human decides.
  pushAll(findings, raw, HIDDEN, 'warn', 'hidden-character')
  pushAll(findings, raw, DIRECTIVE, 'warn', 'directive-phrase')
  pushAll(findings, raw, SHELL, 'warn', 'shell-command')

  return findings.sort((left, right) => left.line - right.line)
}

export const blocking = (findings: readonly InjectionFinding[]): readonly InjectionFinding[] =>
  findings.filter((finding) => finding.grade === 'block')

export const describeFinding = (finding: InjectionFinding): string =>
  `${finding.grade} ${finding.kind} at line ${finding.line}: ${finding.excerpt}`
