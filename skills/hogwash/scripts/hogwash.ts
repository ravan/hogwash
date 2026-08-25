#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { createSdkQuery } from './adapters/claude-sdk.js'
import { openCodexTransport } from './adapters/codex-app-server.js'
import { createCodexQuery } from './adapters/codex-client.js'
import type { Models } from './adapters/tuning.js'
import type { AgentQuery } from './adapters/types.js'
import { run } from './cli.js'
import type { ModelFamily } from './types.js'

const queryFor = (family: ModelFamily, models: Models): AgentQuery | null => {
  switch (family) {
    case 'claude':
      return createSdkQuery(models.claude)
    case 'codex':
      return createCodexQuery(openCodexTransport, models.codex)
    case 'gemini':
      return null
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

process.exitCode = await run(process.argv.slice(2), {
  cwd: process.cwd(),
  now: () => new Date().toISOString(),
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
  color: process.stdout.isTTY === true && process.env.NO_COLOR === undefined,
  readStdin: () => Bun.stdin.text(),
  queryFor,
  runProcess,
})
