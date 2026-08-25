import { z } from 'zod'

export const CODEX_PROTOCOL_VERSION = '0.149.1'

export const CodexRequestIdSchema: z.ZodType<number | string> = z.union([z.number(), z.string()])
export type CodexRequestId = z.infer<typeof CodexRequestIdSchema>

export type CodexFrame =
  | { readonly kind: 'response'; readonly id: CodexRequestId; readonly result: unknown }
  | { readonly kind: 'failure'; readonly id: CodexRequestId; readonly message: string }
  | { readonly kind: 'server-request'; readonly id: CodexRequestId; readonly method: string }
  | { readonly kind: 'notification'; readonly method: string; readonly params: unknown }
  | { readonly kind: 'unrecognized' }

const ServerRequestFrameSchema = z.object({
  id: CodexRequestIdSchema,
  method: z.string(),
})

const FailureFrameSchema = z.object({
  id: CodexRequestIdSchema,
  error: z.object({ message: z.string() }),
})

const ResponseFrameSchema = z.object({
  id: CodexRequestIdSchema,
  result: z.unknown(),
})

const NotificationFrameSchema = z.object({
  method: z.string(),
  params: z.unknown(),
})

export function readFrame(line: string): CodexFrame {
  let payload: unknown
  try {
    payload = JSON.parse(line)
  } catch {
    return { kind: 'unrecognized' }
  }

  const serverRequest = ServerRequestFrameSchema.safeParse(payload)
  if (serverRequest.success) {
    return { kind: 'server-request', id: serverRequest.data.id, method: serverRequest.data.method }
  }

  const failure = FailureFrameSchema.safeParse(payload)
  if (failure.success) {
    return { kind: 'failure', id: failure.data.id, message: failure.data.error.message }
  }

  const response = ResponseFrameSchema.safeParse(payload)
  if (response.success) {
    return { kind: 'response', id: response.data.id, result: response.data.result }
  }

  const notification = NotificationFrameSchema.safeParse(payload)
  if (notification.success) {
    return {
      kind: 'notification',
      method: notification.data.method,
      params: notification.data.params,
    }
  }

  return { kind: 'unrecognized' }
}

export const ThreadStartResultSchema: z.ZodType<{ thread: { id: string } }> = z.object({
  thread: z.object({ id: z.string() }),
})

export const TurnCompletedParamsSchema: z.ZodType<{
  threadId: string
  turn: {
    status: 'completed' | 'interrupted' | 'failed' | 'inProgress'
    error: { message: string } | null
    items: readonly unknown[]
  }
}> = z.object({
  threadId: z.string(),
  turn: z.object({
    status: z.enum(['completed', 'interrupted', 'failed', 'inProgress']),
    error: z.object({ message: z.string() }).nullable().default(null),
    items: z.array(z.unknown()),
  }),
})

export const ErrorNotificationParamsSchema: z.ZodType<{ error: { message: string } }> = z.object({
  error: z.object({ message: z.string() }),
})

const AgentMessageItemSchema = z.object({
  type: z.literal('agentMessage'),
  text: z.string(),
})

/** Text of the last `agentMessage` item of a completed turn, or null. */
export function agentMessageText(items: readonly unknown[]): string | null {
  let text: string | null = null
  for (const item of items) {
    const parsed = AgentMessageItemSchema.safeParse(item)
    if (parsed.success) text = parsed.data.text
  }
  return text
}

export const DECLINE_REASON =
  'hogwash reads text and reports on it; it never runs commands or changes files.'

export type CodexDeclineDecision = 'decline' | { readonly denied: { readonly rejection: string } }
export type CodexDeclineReply =
  | { readonly kind: 'result'; readonly decision: CodexDeclineDecision }
  | { readonly kind: 'error'; readonly message: string }

/** ADR 0001 / spec §3.2.3: every server-initiated request is refused. */
export function declineReplyFor(method: string): CodexDeclineReply {
  switch (method) {
    case 'item/commandExecution/requestApproval':
    case 'item/fileChange/requestApproval':
      return { kind: 'result', decision: 'decline' }
    case 'execCommandApproval':
    case 'applyPatchApproval':
      return { kind: 'result', decision: { denied: { rejection: DECLINE_REASON } } }
    default:
      return { kind: 'error', message: `${method} is refused: ${DECLINE_REASON}` }
  }
}
