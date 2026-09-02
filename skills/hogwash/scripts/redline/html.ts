import { basename } from 'node:path'
import type { FileReport, Register } from '../types.js'
import type { DiffSegment, Hunk } from './align.js'
import type { Notes } from './notes.js'

export type HunkView = {
  readonly lineStart: number
  readonly section: string | null
  readonly chips: readonly string[]
  readonly original: readonly DiffSegment[]
  readonly revised: readonly DiffSegment[]
}

export type WaivedRow = Notes['waived'][number]

export type RedlineView = {
  readonly title: string
  readonly subtitle: string
  readonly intro: string
  readonly originalPath: string
  readonly candidatePath: string
  readonly actionable: readonly [number, number]
  readonly density: readonly [number, number]
  readonly threshold: number
  readonly factsAltered: number
  readonly scores: Notes['scores']
  readonly hunks: readonly HunkView[]
  readonly waived: readonly WaivedRow[]
  readonly footer: string | null
}

const actionableCount = (file: FileReport): number =>
  file.findings.filter((finding) => finding.actionable).length

/** Merge the deterministic scan-and-diff results with the supplied judgment notes. */
export function buildView(input: {
  readonly originalPath: string
  readonly candidatePath: string
  readonly register: Register
  readonly threshold: number
  readonly original: FileReport
  readonly candidate: FileReport
  readonly hunks: readonly Hunk[]
  readonly notes: Notes
}): RedlineView {
  const { notes } = input
  const waivedKeys = new Set(notes.waived.map((row) => `${row.line}:${row.rule}`))
  const hunks = input.hunks.map((hunk) => ({
    lineStart: hunk.lineStart,
    section: hunk.section,
    chips: [
      ...new Set<string>(
        input.original.findings
          .filter(
            (finding) =>
              finding.actionable &&
              finding.location.start.line >= hunk.lineStart &&
              finding.location.start.line <= hunk.lineEnd &&
              !waivedKeys.has(`${finding.location.start.line}:${finding.ruleId}`),
          )
          .map((finding) => finding.ruleId),
      ),
      ...notes.annotations
        .filter((note) => note.line >= hunk.lineStart && note.line <= hunk.lineEnd)
        .map((note) => note.label),
    ],
    original: hunk.original,
    revised: hunk.revised,
  }))
  const passages = hunks.length
  return {
    title: notes.title ?? basename(input.originalPath),
    subtitle:
      notes.subtitle ??
      `Hogwash redline, scanner register \`${input.register}\`. ` +
        `${passages} passage${passages === 1 ? '' : 's'} changed. ` +
        'The original is unchanged on disk; this compares it against the candidate.',
    intro:
      notes.intro ??
      'Every entry shows the original passage beside its revision. ' +
        'Passages the rewrite left untouched are not listed.',
    originalPath: input.originalPath,
    candidatePath: input.candidatePath,
    actionable: [actionableCount(input.original), actionableCount(input.candidate)],
    density: [input.original.density, input.candidate.density],
    threshold: input.threshold,
    factsAltered: notes.factsAltered,
    scores: notes.scores,
    hunks,
    waived: notes.waived,
    footer: notes.footer,
  }
}

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Escape, then let backtick spans render as inline code. */
const inline = (text: string): string => escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>')

const renderSegments = (segments: readonly DiffSegment[], tag: 'del' | 'ins'): string =>
  segments
    .map((part) =>
      part.kind === 'same' ? escapeHtml(part.text) : `<${tag}>${escapeHtml(part.text)}</${tag}>`,
    )
    .join('')

const STYLE = `
:root {
  --paper:#FBFAF7; --surface:#FFFFFF; --ink:#1B1A17; --muted:#6E6A62;
  --rule:#E4E0D6; --accent:#2E4B6B; --accent-soft:#EAF0F6;
  --del-bg:#F8E6E2; --del-ink:#8C2F22; --del-edge:#D9B4AC;
  --ins-bg:#DEEDE4; --ins-ink:#1C6741; --ins-edge:#A8CDB8;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper:#15161A; --surface:#1C1E22; --ink:#E9E7E2; --muted:#97938B;
    --rule:#2C2F35; --accent:#8FB3D9; --accent-soft:#1F2833;
    --del-bg:#3B2421; --del-ink:#EBA99C; --del-edge:#5C3833;
    --ins-bg:#1D3A2B; --ins-ink:#95D2AC; --ins-edge:#2F5A44;
  }
}
:root[data-theme="dark"] {
  --paper:#15161A; --surface:#1C1E22; --ink:#E9E7E2; --muted:#97938B;
  --rule:#2C2F35; --accent:#8FB3D9; --accent-soft:#1F2833;
  --del-bg:#3B2421; --del-ink:#EBA99C; --del-edge:#5C3833;
  --ins-bg:#1D3A2B; --ins-ink:#95D2AC; --ins-edge:#2F5A44;
}
* { box-sizing:border-box; }
body {
  margin:0; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif;
  font-size:16px; line-height:1.55;
}
.wrap { max-width:1180px; margin:0 auto; padding:0 24px 96px; }
header.top { padding:56px 0 28px; border-bottom:1px solid var(--rule); }
h1 {
  font-family:"Source Serif 4",Georgia,serif; font-weight:600;
  font-size:clamp(28px,4vw,42px); line-height:1.15; margin:0 0 10px;
  text-wrap:balance; letter-spacing:-0.01em;
}
td code { font-family:"IBM Plex Mono",monospace; font-size:12.5px; color:var(--muted); }
footer code { font-family:"IBM Plex Mono",monospace; font-size:0.92em; }
.sub { color:var(--muted); margin:0; max-width:62ch; }
.sub code, .note code, .why code { font-family:"IBM Plex Mono",monospace; font-size:0.88em; }
.stats { display:flex; flex-wrap:wrap; gap:0; margin:28px 0 0;
  border:1px solid var(--rule); border-radius:3px; background:var(--surface); overflow:hidden; }
.stat { flex:1 1 130px; padding:14px 18px; border-right:1px solid var(--rule); }
.stat:last-child { border-right:none; }
.stat .n { font-family:"IBM Plex Mono",monospace; font-size:24px; font-variant-numeric:tabular-nums;
  display:block; line-height:1.2; }
.stat .k { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); }
.stat .n .arrow { color:var(--muted); font-size:16px; padding:0 2px; }
.stat .n .to { color:var(--accent); }
.legend { display:flex; gap:20px; flex-wrap:wrap; align-items:center;
  margin:22px 0 0; font-size:13px; color:var(--muted); }
.swatch { display:inline-block; padding:1px 7px; border-radius:2px;
  font-family:"Source Serif 4",Georgia,serif; }
.swatch.d { background:var(--del-bg); color:var(--del-ink); text-decoration:line-through; }
.swatch.i { background:var(--ins-bg); color:var(--ins-ink); }
h2 { font-family:"Source Serif 4",Georgia,serif; font-weight:600; font-size:22px;
  margin:56px 0 6px; }
.note { color:var(--muted); margin:0 0 22px; max-width:64ch; font-size:14.5px; }
.row { border:1px solid var(--rule); border-radius:3px; background:var(--surface);
  margin:0 0 18px; overflow:hidden; }
.row-head { display:flex; align-items:center; gap:12px; flex-wrap:wrap;
  padding:10px 16px; background:var(--accent-soft); border-bottom:1px solid var(--rule); }
.ln { font-family:"IBM Plex Mono",monospace; font-size:12.5px; font-weight:500;
  color:var(--accent); font-variant-numeric:tabular-nums; }
.sec { font-size:12.5px; color:var(--muted); }
.chips { margin-left:auto; display:flex; gap:6px; flex-wrap:wrap; }
.chip { font-family:"IBM Plex Mono",monospace; font-size:11px; padding:2px 7px;
  border:1px solid var(--rule); border-radius:2px; color:var(--muted); background:var(--surface); }
.cols { display:grid; grid-template-columns:1fr 1fr; }
.col { padding:16px 18px 20px; }
.col-a { border-right:1px solid var(--rule); }
.col-label { font-size:10.5px; text-transform:uppercase; letter-spacing:.09em;
  color:var(--muted); margin:0 0 8px; }
.txt { font-family:"Source Serif 4",Georgia,serif; font-size:16.5px; line-height:1.62;
  margin:0; white-space:pre-line; }
.txt-none { color:var(--muted); font-style:italic; }
del { background:var(--del-bg); color:var(--del-ink); text-decoration:line-through;
  text-decoration-thickness:1px; border-radius:2px; box-shadow:0 0 0 1px var(--del-edge) inset; }
ins { background:var(--ins-bg); color:var(--ins-ink); text-decoration:none;
  border-radius:2px; box-shadow:0 0 0 1px var(--ins-edge) inset; }
.tablewrap { overflow-x:auto; border:1px solid var(--rule); border-radius:3px; background:var(--surface); }
table { border-collapse:collapse; width:100%; font-size:14px; min-width:640px; }
th,td { text-align:left; padding:10px 14px; border-bottom:1px solid var(--rule); vertical-align:top; }
th { font-size:10.5px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); font-weight:600; }
tr:last-child td { border-bottom:none; }
.why { color:var(--muted); }
footer { margin-top:56px; padding-top:22px; border-top:1px solid var(--rule);
  color:var(--muted); font-size:13.5px; }
@media (max-width:760px) {
  .cols { grid-template-columns:1fr; }
  .col-a { border-right:none; border-bottom:1px solid var(--rule); }
  .chips { margin-left:0; width:100%; }
}
`

const column = (
  label: string,
  side: 'col-a' | 'col-b',
  segments: readonly DiffSegment[],
  tag: 'del' | 'ins',
  emptyText: string,
): string => {
  const body =
    segments.length === 0
      ? `<p class="txt txt-none">${emptyText}</p>`
      : `<p class="txt">${renderSegments(segments, tag)}</p>`
  return `<div class="col ${side}"><p class="col-label">${label}</p>${body}</div>`
}

const renderHunk = (hunk: HunkView): string => {
  const chips = hunk.chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')
  return [
    '<article class="row">',
    '<header class="row-head">',
    `<span class="ln">L${hunk.lineStart}</span>`,
    hunk.section === null ? '' : `<span class="sec">${escapeHtml(hunk.section)}</span>`,
    chips === '' ? '' : `<span class="chips">${chips}</span>`,
    '</header>',
    '<div class="cols">',
    column('Original', 'col-a', hunk.original, 'del', '(no original passage)'),
    column('Revised', 'col-b', hunk.revised, 'ins', '(passage removed)'),
    '</div>',
    '</article>',
  ]
    .filter((part) => part !== '')
    .join('\n')
}

const movement = (before: string, after: string): string =>
  before === after
    ? `<span class="n">${before}</span>`
    : `<span class="n">${before}<span class="arrow">→</span><span class="to">${after}</span></span>`

const stat = (value: string, label: string): string =>
  `<div class="stat">${value}<span class="k">${label}</span></div>`

const renderWaived = (rows: readonly WaivedRow[]): string => {
  if (rows.length === 0) return ''
  return [
    `<h2>${rows.length} finding${rows.length === 1 ? '' : 's'} left standing</h2>`,
    '<p class="note">These were put to the author as choices and waived deliberately. ' +
      'They stay in the report so the decision is visible rather than silently edited away.</p>',
    '<div class="tablewrap">',
    '<table>',
    '<thead><tr><th>Line</th><th>Rule</th><th>Match</th><th>Why it stands</th></tr></thead>',
    '<tbody>',
    ...rows.map(
      (row) =>
        `<tr><td class="ln">L${row.line}</td><td><code>${escapeHtml(row.rule)}</code></td>` +
        `<td>&ldquo;${escapeHtml(row.match)}&rdquo;</td><td class="why">${inline(row.reason)}</td></tr>`,
    ),
    '</tbody>',
    '</table>',
    '</div>',
  ].join('\n')
}

/** Render the complete standalone redline page. */
export function renderRedline(view: RedlineView): string {
  const stats = [
    stat(movement(String(view.actionable[0]), String(view.actionable[1])), 'Actionable findings'),
    stat(
      movement(view.density[0].toFixed(1), view.density[1].toFixed(1)),
      `Density / ${view.threshold} allowed`,
    ),
    stat(`<span class="n">${view.hunks.length}</span>`, 'Passages changed'),
    stat(`<span class="n">${view.waived.length}</span>`, 'Owner-waived'),
    stat(`<span class="n">${view.factsAltered}</span>`, 'Facts altered'),
  ].join('\n')
  const changes =
    view.hunks.length === 0
      ? '<h2>No passages changed</h2>\n<p class="note">The candidate matches the original.</p>'
      : [
          `<h2>${view.hunks.length} changed passage${view.hunks.length === 1 ? '' : 's'}</h2>`,
          `<p class="note">${inline(view.intro)}</p>`,
          ...view.hunks.map(renderHunk),
        ].join('\n')
  const scores =
    view.scores === null
      ? ''
      : ` Scores: reads-human ${view.scores.readsHuman[0]}&rarr;${view.scores.readsHuman[1]}, ` +
        `content quality ${view.scores.contentQuality[0]}&rarr;${view.scores.contentQuality[1]}.`
  const footer =
    `Generated from <code>${escapeHtml(view.originalPath)}</code> and ` +
    `<code>${escapeHtml(view.candidatePath)}</code>.${scores}` +
    `${view.footer === null ? '' : ` ${inline(view.footer)}`}`
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(view.title)}</title>`,
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap">',
    `<style>${STYLE}</style>`,
    '</head>',
    '<body>',
    '<div class="wrap">',
    '<header class="top">',
    `<h1>${escapeHtml(view.title)}</h1>`,
    `<p class="sub">${inline(view.subtitle)}</p>`,
    '<div class="stats">',
    stats,
    '</div>',
    '<p class="legend">',
    '<span><span class="swatch d">removed</span> cut from the original</span>',
    '<span><span class="swatch i">added</span> in the revision</span>',
    '<span>Rules that triggered each edit sit on the right of its header.</span>',
    '</p>',
    '</header>',
    changes,
    renderWaived(view.waived),
    `<footer>${footer}</footer>`,
    '</div>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
