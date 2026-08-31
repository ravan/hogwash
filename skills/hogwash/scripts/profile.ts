import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { z } from 'zod'
import type { Config } from './config.js'
import { HogwashError } from './errors.js'

const ErrnoSchema = z.object({ code: z.string() })

export type LoadedProfile = {
  readonly voice: string
  readonly quality: string
  readonly banList: string
}

/** Project copy first; a relative path missing there falls back to ~/.idiolect/<path>. */
export function profileCandidates(
  cwd: string,
  path: string,
  home: string = homedir(),
): readonly string[] {
  if (isAbsolute(path)) return [path]
  return [join(cwd, path), join(home, '.idiolect', path)]
}

async function readProfileDocument(paths: readonly string[], name: string): Promise<string> {
  for (const [index, path] of paths.entries()) {
    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch (error) {
      const missing = ErrnoSchema.safeParse(error).data?.code === 'ENOENT'
      if (missing && index < paths.length - 1) continue
      throw new HogwashError({
        kind: 'config',
        message: missing
          ? `Could not read the ${name}: no such file. Tried ${paths.join(', ')}.`
          : `Could not read the ${name} ${path}: ${error instanceof Error ? error.message : String(error)}`,
      })
    }
    if (text.trim().length === 0) {
      throw new HogwashError({ kind: 'config', message: `The ${name} ${path} is empty.` })
    }
    return text
  }
  throw new HogwashError({
    kind: 'config',
    message: `Could not read the ${name}: no path configured.`,
  })
}

/** Read the three mandatory profile documents named by the config. */
export async function loadProfile(
  cwd: string,
  config: Config,
  home = homedir(),
): Promise<LoadedProfile> {
  return {
    voice: await readProfileDocument(
      profileCandidates(cwd, config.profile.voice, home),
      'voice profile',
    ),
    quality: await readProfileDocument(
      profileCandidates(cwd, config.profile.quality, home),
      'quality profile',
    ),
    banList: await readProfileDocument(
      profileCandidates(cwd, config.profile.banList, home),
      'ban list',
    ),
  }
}
