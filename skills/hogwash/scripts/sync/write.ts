import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** Writes a JSON file only when its bytes change, then re-formats it with biome. */
export const writeJson =
  (path: string) =>
  (text: string): void => {
    if (existsSync(path) && readFileSync(path, 'utf8') === text) return
    writeFileSync(path, text)
    try {
      execFileSync('bunx', ['biome', 'format', '--write', path], { stdio: 'ignore' })
    } catch {
      console.error(`Wrote ${path} but could not re-format it with biome.`)
    }
  }
