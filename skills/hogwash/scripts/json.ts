const FENCE_PATTERN = /^\s*```[A-Za-z]*\n([\s\S]*?)\n?```\s*$/

/** The outermost `{…}` slice of a reply that may be wrapped in a code fence, or null. */
export function extractJsonObject(text: string): string | null {
  const fenced = FENCE_PATTERN.exec(text)
  const body = fenced?.[1] ?? text
  const open = body.indexOf('{')
  const close = body.lastIndexOf('}')
  if (open === -1 || close <= open) return null
  return body.slice(open, close + 1)
}
