import { access, cp, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initConfig } from './config.js'
import { HogwashError } from './errors.js'

const TEMPLATE_SOURCE = fileURLToPath(new URL('../templates', import.meta.url))
const TEMPLATES = [
  ['voice-template.md', 'profiles/default/voice.md'],
  ['quality-template.md', 'profiles/default/quality.md'],
  ['ban-list-template.md', 'profiles/default/ban-list.md'],
] as const

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function copyIfMissing(source: string, destination: string): Promise<void> {
  if (await exists(destination)) return
  await mkdir(dirname(destination), { recursive: true })
  try {
    await cp(source, destination, { errorOnExist: true, force: false })
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path: destination,
      message: error instanceof Error ? error.message : 'could not create profile',
    })
  }
}

/** Create the config and the three profile files that the skill requires. */
export async function initProject(cwd: string): Promise<readonly string[]> {
  const config = await initConfig(cwd)
  const written = [config.path]
  for (const [source, destination] of TEMPLATES) {
    const path = join(cwd, destination)
    await copyIfMissing(join(TEMPLATE_SOURCE, source), path)
    written.push(path)
  }
  return written
}
