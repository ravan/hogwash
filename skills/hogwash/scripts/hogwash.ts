#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createSdkQuery } from './adapters/claude-sdk.js'
import { openCodexTransport } from './adapters/codex-app-server.js'
import { createCodexQuery } from './adapters/codex-client.js'
import type { Models } from './adapters/tuning.js'
import type { AgentQuery } from './adapters/types.js'
import { run } from './cli.js'
import { resolveIdiolectHome } from './profile.js'
import type { ModelFamily } from './types.js'

const queryFor = (family: ModelFamily, models: Models): AgentQuery | null => {
  switch (family) {
    case 'claude':
      return createSdkQuery(models.claude)
    case 'codex':
      return createCodexQuery(openCodexTransport, models.codex)
  }
}

const runProcess = (command: string, args: readonly string[], wait: boolean): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      ...(wait ? {} : { detached: true }),
      stdio: wait ? 'inherit' : 'ignore',
    })
    child.once('error', reject)
    if (wait) {
      child.once('close', (code) => {
        code === 0
          ? resolve()
          : reject(new Error(`${command} exited ${code ?? 'without a status'}`))
      })
    } else {
      child.once('spawn', () => {
        child.unref()
        resolve()
      })
    }
  })

// A single sink with backpressure: console.log drops the tail of a write larger
// than the pipe buffer when the process exits, which cut `rules` and large JSON
// reports short whenever stdout was a pipe.
const out = Bun.stdout.writer()
const exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  idiolectHome: resolveIdiolectHome(process.env.IDIOLECT_HOME),
  scriptPath: fileURLToPath(import.meta.url),
  now: () => new Date().toISOString(),
  stdout: (line) => {
    out.write(`${line}\n`)
  },
  stderr: (line) => console.error(line),
  color: process.stdout.isTTY === true && process.env.NO_COLOR === undefined,
  readStdin: () => Bun.stdin.text(),
  queryFor,
  runProcess,
})
await out.end()
process.exitCode = exitCode
