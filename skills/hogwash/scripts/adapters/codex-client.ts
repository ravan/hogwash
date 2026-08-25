import {
  agentMessageText,
  type CodexRequestId,
  declineReplyFor,
  ErrorNotificationParamsSchema,
  readFrame,
  ThreadStartResultSchema,
  TurnCompletedParamsSchema,
} from './codex-protocol.js'
import { CODEX_DEFAULT_TUNING, type CodexTuning } from './tuning.js'
import type { AgentQuery } from './types.js'

export type CodexTransport = {
  readonly send: (message: unknown) => void
  readonly lines: AsyncIterable<string>
  /** Captured stderr, for the message of a stream that ends early. */
  readonly diagnostics: () => string
  readonly close: () => Promise<void>
}
export type CodexTransportFactory = () => CodexTransport

const INITIALIZE_ID = 1
const THREAD_START_ID = 2
const TURN_START_ID = 3
const REFUSED_CODE = -32601

const threadStartParams = (systemPrompt: string, tuning: CodexTuning): Record<string, unknown> => ({
  approvalPolicy: 'never',
  sandbox: 'read-only',
  ephemeral: true,
  ...(systemPrompt.length > 0 ? { baseInstructions: systemPrompt } : {}),
  ...(tuning.model === undefined ? {} : { model: tuning.model }),
})

function replyToServerRequest(transport: CodexTransport, id: CodexRequestId, method: string): void {
  const reply = declineReplyFor(method)
  transport.send(
    reply.kind === 'result'
      ? { id, result: { decision: reply.decision } }
      : { id, error: { code: REFUSED_CODE, message: reply.message } },
  )
}

async function converse(
  transport: CodexTransport,
  request: { readonly systemPrompt: string; readonly prompt: string },
  tuning: CodexTuning,
): Promise<string> {
  transport.send({
    id: INITIALIZE_ID,
    method: 'initialize',
    params: {
      clientInfo: { name: 'hogwash', version: '0.0.0' },
      capabilities: null,
    },
  })

  let threadId: string | null = null

  for await (const line of transport.lines) {
    const frame = readFrame(line)

    if (frame.kind === 'failure') throw new Error(frame.message)

    if (frame.kind === 'server-request') {
      replyToServerRequest(transport, frame.id, frame.method)
      continue
    }

    if (frame.kind === 'response' && frame.id === INITIALIZE_ID) {
      transport.send({ method: 'initialized' })
      transport.send({
        id: THREAD_START_ID,
        method: 'thread/start',
        params: threadStartParams(request.systemPrompt, tuning),
      })
      continue
    }

    if (frame.kind === 'response' && frame.id === THREAD_START_ID) {
      threadId = ThreadStartResultSchema.parse(frame.result).thread.id
      transport.send({
        id: TURN_START_ID,
        method: 'turn/start',
        params: {
          threadId,
          input: [{ type: 'text', text: request.prompt, text_elements: [] }],
          ...(tuning.effort === undefined ? {} : { effort: tuning.effort }),
        },
      })
      continue
    }

    if (frame.kind !== 'notification') continue

    if (frame.method === 'error') {
      throw new Error(ErrorNotificationParamsSchema.parse(frame.params).error.message)
    }

    if (frame.method !== 'turn/completed') continue

    const completed = TurnCompletedParamsSchema.parse(frame.params)
    if (completed.threadId !== threadId) continue

    const { status, error, items } = completed.turn
    if (status !== 'completed') throw new Error(error?.message ?? `the turn was ${status}`)

    const text = agentMessageText(items)
    if (text === null) throw new Error('the codex turn completed without an agent message')
    return text
  }

  throw new Error(`the codex app-server stream ended before the turn: ${transport.diagnostics()}`)
}

/** One transport, one thread, one turn per call — the fresh session of ADR 0001.1. */
export function createCodexQuery(
  open: CodexTransportFactory,
  tuning: CodexTuning = {},
): AgentQuery {
  const resolved: CodexTuning = {
    model: tuning.model ?? CODEX_DEFAULT_TUNING.model,
    effort: tuning.effort ?? CODEX_DEFAULT_TUNING.effort,
  }
  return async (request) => {
    const transport = open()
    try {
      return await converse(transport, request, resolved)
    } finally {
      await transport.close()
    }
  }
}
