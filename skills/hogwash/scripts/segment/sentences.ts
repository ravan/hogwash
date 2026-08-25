import type { RawOffset } from '../types.js'
import { RawOffsetSchema } from '../types.js'
import type { Span } from './markdown.js'

// verbatim exception — the boundary definition is the rule being specified
const BOUNDARY_PATTERN = /[.!?]+(?=\s|$)/g

/** Sentence spans over the raw text (spec §2.1.3). `prose` is the slice that
 *  begins at `start`; returned spans are raw-text offsets. */
export function sentenceSpans(prose: string, start: RawOffset): readonly Span[] {
  const cuts: number[] = []
  BOUNDARY_PATTERN.lastIndex = 0
  let boundary = BOUNDARY_PATTERN.exec(prose)
  while (boundary !== null) {
    cuts.push(boundary.index + boundary[0].length)
    boundary = BOUNDARY_PATTERN.exec(prose)
  }
  if (cuts[cuts.length - 1] !== prose.length) cuts.push(prose.length)

  const spans: Span[] = []
  let from = 0
  for (const cut of cuts) {
    const piece = prose.slice(from, cut)
    const leading = piece.length - piece.trimStart().length
    const trailing = piece.length - piece.trimEnd().length
    if (piece.trim().length > 0) {
      spans.push({
        start: RawOffsetSchema.parse(start + from + leading),
        end: RawOffsetSchema.parse(start + cut - trailing),
      })
    }
    from = cut
  }
  return spans
}
