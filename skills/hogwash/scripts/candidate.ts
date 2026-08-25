import { access, rename } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { HogwashError } from './errors.js'

/** Derive the sibling candidate without inspecting the filesystem. */
export function candidatePath(original: string): string {
  const extension = extname(original)
  const filename = basename(original, extension)
  return join(dirname(original), `${filename}-hogwash${extension}`)
}

export async function requireCandidate(original: string): Promise<string> {
  const candidate = candidatePath(original)
  try {
    await access(candidate)
    return candidate
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path: candidate,
      message: error instanceof Error ? error.message : 'candidate does not exist',
    })
  }
}

/** Atomically replace the original with its sibling candidate. */
export async function acceptCandidate(original: string): Promise<string> {
  const candidate = await requireCandidate(original)
  try {
    await rename(candidate, original)
    return original
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path: candidate,
      message: error instanceof Error ? error.message : 'could not replace the original',
    })
  }
}
