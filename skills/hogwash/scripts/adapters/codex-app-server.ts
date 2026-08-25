import { spawn } from 'node:child_process'
import type { Readable } from 'node:stream'
import type { CodexTransport } from './codex-client.js'

export const CODEX_COMMAND = 'codex'
export const CODEX_ARGS: readonly string[] = ['app-server']

const DIAGNOSTICS_LIMIT = 2000

// verbatim exception — chunk-to-line buffering must be exact; a dropped
// partial line loses the turn/completed frame and hangs the judge run
async function* linesOf(stream: Readable): AsyncGenerator<string> {
  let buffer = ''
  for await (const chunk of stream) {
    buffer += String(chunk)
    for (;;) {
      const at = buffer.indexOf('\n')
      if (at < 0) break
      const line = buffer.slice(0, at)
      buffer = buffer.slice(at + 1)
      if (line.trim().length > 0) yield line
    }
  }
  if (buffer.trim().length > 0) yield buffer
}

export function openCodexTransport(): CodexTransport {
  const child = spawn(CODEX_COMMAND, [...CODEX_ARGS], { stdio: ['pipe', 'pipe', 'pipe'] })

  let stderr = ''
  child.stderr.on('data', (chunk: unknown) => {
    stderr = (stderr + String(chunk)).slice(-DIAGNOSTICS_LIMIT)
  })

  let exited = false
  child.on('close', () => {
    exited = true
  })

  const failure = new Promise<never>((_resolve, reject) => {
    child.on('error', (error) => reject(error))
  })

  async function* readStdout(): AsyncGenerator<string> {
    const stdout = linesOf(child.stdout)
    for (;;) {
      const next = await Promise.race([stdout.next(), failure])
      if (next.done === true) return
      yield next.value
    }
  }

  return {
    send: (message) => {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    },
    lines: readStdout(),
    diagnostics: () => stderr,
    close: () =>
      new Promise<void>((resolve) => {
        if (exited) {
          resolve()
          return
        }
        child.on('close', () => resolve())
        child.kill()
      }),
  }
}
