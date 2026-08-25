import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Models } from '../../scripts/adapters/tuning.js'
import type { AgentQuery } from '../../scripts/adapters/types.js'
import type { Shell } from '../../scripts/cli.js'
import { defaultConfigJson } from '../../scripts/config.js'
import type { ModelFamily } from '../../scripts/types.js'

export const fixturePath = (name: string): string =>
  fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))

export type QueryFactory = (family: ModelFamily, models: Models) => AgentQuery | null

export type Harness = {
  readonly shell: Shell
  readonly cwd: string
  readonly stdout: string[]
  readonly stderr: string[]
  readonly processes: { command: string; args: readonly string[]; wait: boolean }[]
  readonly copyOf: (name: string) => string
  readonly writeConfig: (value: unknown) => void
  setStdin(value: string): void
}

export const harness = (queryFor: QueryFactory = () => null): Harness => {
  const cwd = mkdtempSync(join(tmpdir(), 'hogwash-cli-'))
  const stdout: string[] = []
  const stderr: string[] = []
  const processes: { command: string; args: readonly string[]; wait: boolean }[] = []
  let stdin = ''
  mkdirSync(join(cwd, 'profile'), { recursive: true })
  writeFileSync(join(cwd, 'hogwash.json'), defaultConfigJson(), 'utf8')
  writeFileSync(join(cwd, 'profile', 'voice.md'), '# Voice\n\nWrite plainly.\n', 'utf8')
  writeFileSync(join(cwd, 'profile', 'quality.md'), '# Quality\n\nKeep facts intact.\n', 'utf8')
  writeFileSync(join(cwd, 'profile', 'ban-list.md'), '# Ban list\n\n- delve — filler\n', 'utf8')
  return {
    cwd,
    stdout,
    stderr,
    processes,
    setStdin: (value) => {
      stdin = value
    },
    writeConfig: (value) => writeFileSync(join(cwd, 'hogwash.json'), JSON.stringify(value), 'utf8'),
    copyOf: (name) => {
      const target = join(cwd, name)
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(fixturePath(name), target)
      return target
    },
    shell: {
      cwd,
      now: () => '2026-01-01T00:00:00.000Z',
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
      readStdin: () => Promise.resolve(stdin),
      queryFor,
      runProcess: (command, args, wait) => {
        processes.push({ command, args, wait })
        return Promise.resolve()
      },
    },
  }
}

export const readWrittenReport = (cwd: string): unknown =>
  JSON.parse(readFileSync(join(cwd, '.hogwash', 'report.json'), 'utf8'))
