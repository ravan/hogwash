import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  agentMessageText,
  CODEX_PROTOCOL_VERSION,
  DECLINE_REASON,
  declineReplyFor,
  readFrame,
} from '../../../skills/hogwash/scripts/adapters/codex-protocol.js'

const vendored = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../../../skills/hogwash/vendor/codex-app-server/${name}`, import.meta.url),
      'utf8',
    ),
  )

type JsonSchema = {
  readonly required?: readonly string[]
  readonly enum?: readonly string[]
  readonly properties?: Record<string, unknown>
  readonly definitions?: Record<string, JsonSchema>
}

const schema = (name: string): JsonSchema => vendored(name) as JsonSchema

const definition = (root: JsonSchema, name: string): JsonSchema => {
  const found = root.definitions?.[name]
  if (found === undefined) throw new Error(`the vendored schema has no ${name} definition`)
  return found
}

const propertyNames = (of: JsonSchema): readonly string[] => Object.keys(of.properties ?? {})

describe('the vendored codex app-server protocol', () => {
  it('pins the vendored protocol version', () => {
    const pinned = readFileSync(
      new URL('../../../skills/hogwash/vendor/codex-app-server/VERSION', import.meta.url),
      'utf8',
    )
    expect(pinned.trim()).toBe(CODEX_PROTOCOL_VERSION)
  })

  it('still finds every thread/start field it sends', () => {
    expect(propertyNames(schema('v2/ThreadStartParams.json'))).toEqual(
      expect.arrayContaining(['approvalPolicy', 'sandbox', 'ephemeral', 'baseInstructions']),
    )
  })

  it('still finds the thread id it reads', () => {
    const response = schema('v2/ThreadStartResponse.json')
    expect(response.required).toContain('thread')
    expect(propertyNames(definition(response, 'Thread'))).toContain('id')
  })

  it('still finds every turn/start field it sends', () => {
    expect(schema('v2/TurnStartParams.json').required).toEqual(['input', 'threadId'])
  })

  it('still finds every turn/completed field it reads', () => {
    const notification = schema('v2/TurnCompletedNotification.json')
    expect(notification.required).toEqual(['threadId', 'turn'])
    expect(propertyNames(definition(notification, 'Turn'))).toEqual(
      expect.arrayContaining(['status', 'error', 'items']),
    )
    expect(definition(notification, 'TurnStatus').enum).toEqual([
      'completed',
      'interrupted',
      'failed',
      'inProgress',
    ])
  })

  it('declines every request the server can initiate', () => {
    const variants = (vendored('ServerRequest.json') as { oneOf: readonly unknown[] }).oneOf
    const methods = variants.map((variant) => {
      const method = (variant as { properties: { method: { enum: readonly string[] } } }).properties
        .method
      return method.enum[0] as string
    })
    expect(methods).toHaveLength(10)
    for (const method of methods) {
      const reply = declineReplyFor(method)
      expect(reply).toBeDefined()
      if (reply.kind !== 'result') continue
      const refused =
        reply.decision === 'decline' || typeof reply.decision === 'object'
          ? reply.decision
          : undefined
      expect(refused).toBeDefined()
    }
  })
})

describe('readFrame', () => {
  it('reads a response', () => {
    expect(readFrame('{"id":1,"result":{}}')).toMatchObject({ kind: 'response', id: 1 })
  })

  it('reads a failure', () => {
    expect(readFrame('{"id":1,"error":{"code":-32601,"message":"nope"}}')).toMatchObject({
      kind: 'failure',
      message: 'nope',
    })
  })

  it('reads a server request', () => {
    expect(
      readFrame('{"method":"item/fileChange/requestApproval","id":"r1","params":{}}'),
    ).toMatchObject({
      kind: 'server-request',
      id: 'r1',
      method: 'item/fileChange/requestApproval',
    })
  })

  it('reads a notification', () => {
    expect(readFrame('{"method":"turn/started","params":{"x":1}}')).toMatchObject({
      kind: 'notification',
      method: 'turn/started',
    })
  })

  it('rejects text that is not json', () => {
    expect(readFrame('not json')).toEqual({ kind: 'unrecognized' })
  })

  it('rejects a frame with no shape it knows', () => {
    expect(readFrame('{"jsonrpc":"2.0"}')).toEqual({ kind: 'unrecognized' })
  })
})

describe('agentMessageText', () => {
  it('returns the last agent message', () => {
    expect(
      agentMessageText([
        { type: 'reasoning' },
        { type: 'agentMessage', text: 'first' },
        { type: 'agentMessage', text: 'last' },
      ]),
    ).toBe('last')
  })

  it('returns null when no item is an agent message', () => {
    expect(agentMessageText([{ type: 'reasoning' }])).toBeNull()
  })

  it('returns null for no items at all', () => {
    expect(agentMessageText([])).toBeNull()
  })
})

describe('declineReplyFor', () => {
  it('declines the v2 approval requests', () => {
    expect(declineReplyFor('item/commandExecution/requestApproval')).toEqual({
      kind: 'result',
      decision: 'decline',
    })
    expect(declineReplyFor('item/fileChange/requestApproval')).toEqual({
      kind: 'result',
      decision: 'decline',
    })
  })

  it('denies the legacy approval requests', () => {
    expect(declineReplyFor('execCommandApproval')).toEqual({
      kind: 'result',
      decision: { denied: { rejection: DECLINE_REASON } },
    })
    expect(declineReplyFor('applyPatchApproval')).toEqual({
      kind: 'result',
      decision: { denied: { rejection: DECLINE_REASON } },
    })
  })

  it('answers an unsupported request with an error', () => {
    const reply = declineReplyFor('item/tool/call')
    expect(reply.kind).toBe('error')
    if (reply.kind !== 'error') throw new Error('expected error')
    expect(reply.message).toContain('item/tool/call')
  })
})
