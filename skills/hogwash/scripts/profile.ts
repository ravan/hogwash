import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import type { Config } from './config.js'
import { HogwashError } from './errors.js'

const ErrnoSchema = z.object({ code: z.string() })

export type LoadedProfile = {
  readonly voice: string
  readonly quality: string
  readonly banList: string
}

async function readProfileDocument(path: string, name: string): Promise<string> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error) {
    const missing = ErrnoSchema.safeParse(error).data?.code === 'ENOENT'
    throw new HogwashError({
      kind: 'config',
      message: missing
        ? `Could not read the ${name} ${path}: no such file.`
        : `Could not read the ${name} ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  if (text.trim().length === 0) {
    throw new HogwashError({ kind: 'config', message: `The ${name} ${path} is empty.` })
  }
  return text
}

/** Read the three mandatory profile documents named by the config. */
export async function loadProfile(cwd: string, config: Config): Promise<LoadedProfile> {
  return {
    voice: await readProfileDocument(join(cwd, config.profile.voice), 'voice profile'),
    quality: await readProfileDocument(join(cwd, config.profile.quality), 'quality profile'),
    banList: await readProfileDocument(join(cwd, config.profile.banList), 'ban list'),
  }
}
