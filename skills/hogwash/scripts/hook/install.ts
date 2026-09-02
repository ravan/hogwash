import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { HogwashError } from '../errors.js'
import { HOOK_PATH, preCommitScript } from './script.js'

const ErrnoSchema = z.object({ code: z.string() })

/** Writes the pre-commit hook under `cwd` and returns its absolute path.
 *  Throws HogwashError{kind:'io'} when the hook already exists or cannot be written. */
export async function installHook(cwd: string, scriptPath: string): Promise<string> {
  const path = join(cwd, ...HOOK_PATH.split('/'))
  try {
    await writeFile(path, preCommitScript(scriptPath), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o755,
    })
  } catch (error) {
    const message =
      ErrnoSchema.safeParse(error).data?.code === 'EEXIST'
        ? 'a pre-commit hook already exists'
        : error instanceof Error
          ? error.message
          : 'could not be written'
    throw new HogwashError({ kind: 'io', path, message })
  }
  return path
}
