import { multisetExcess } from '../multiset.js'

export type LineChanges = {
  readonly added: readonly string[]
  readonly removed: readonly string[]
}

function linesOf(text: string): readonly string[] {
  const lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

const lineKey = (line: string): string => line

export function changedLines(before: string, after: string): LineChanges {
  const beforeLines = linesOf(before)
  const afterLines = linesOf(after)
  return {
    added: multisetExcess(afterLines, beforeLines, lineKey),
    removed: multisetExcess(beforeLines, afterLines, lineKey),
  }
}
