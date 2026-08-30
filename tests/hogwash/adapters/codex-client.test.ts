import { describe, expect, it } from 'bun:test'
import type { CodexTransport } from '../../../skills/hogwash/scripts/adapters/codex-client.js'
import { createCodexQuery } from '../../../skills/hogwash/scripts/adapters/codex-client.js'
import { CODEX_DEFAULT_TUNING } from '../../../skills/hogwash/scripts/adapters/tuning.js'

const THREAD = 'thread-1'

type Sent = {
  readonly id?: number | string
  readonly method?: string
  readonly params?: Record<string, unknown>
  readonly result?: Record<string, unknown>
  readonly error?: Record<string, unknown>
}

type Fake = {
  readonly open: () => CodexTransport
  readonly sends: Sent[]
  closes: number
}

const fake = (lines: readonly string[], diagnostics = 'codex said nothing'): Fake => {
  const sends: Sent[] = []
  const state = { closes: 0 }
  return {
    sends,
    get closes() {
      return state.closes
    },
    set closes(value: number) {
      state.closes = value
    },
    open: () => ({
      send: (message) => {
        sends.push(message as Sent)
      },
      lines: (async function* generate() {
        for (const line of lines) yield line
      })(),
      diagnostics: () => diagnostics,
      close: () => {
        state.closes += 1
        return Promise.resolve()
      },
    }),
  }
}

const handshake = [
  '{"id":1,"result":{}}',
  `{"id":2,"result":{"thread":{"id":"${THREAD}"}}}`,
  '{"id":3,"result":{}}',
]

const turnCompleted = (turn: Record<string, unknown>, threadId = THREAD): string =>
  JSON.stringify({ method: 'turn/completed', params: { threadId, turn } })

const message = (text: string): Record<string, unknown> => ({ type: 'agentMessage', text })

const completedWith = (...texts: readonly string[]): string =>
  turnCompleted({ status: 'completed', error: null, items: texts.map(message) })

const ask = (transport: Fake, systemPrompt = 'CAGE', prompt = 'ASK'): Promise<string> =>
  createCodexQuery(transport.open)({ systemPrompt, prompt })

describe('createCodexQuery', () => {
  it('runs initialize, thread/start and turn/start in that order', async () => {
    const transport = fake([...handshake, completedWith('done')])
    await ask(transport)
    expect(transport.sends.map((sent) => sent.method)).toEqual([
      'initialize',
      'initialized',
      'thread/start',
      'turn/start',
    ])
    expect(transport.sends[2]?.params).toMatchObject({
      approvalPolicy: 'never',
      sandbox: 'read-only',
      ephemeral: true,
      baseInstructions: 'CAGE',
    })
    expect(transport.sends[3]?.params).toEqual({
      threadId: THREAD,
      input: [{ type: 'text', text: 'ASK', text_elements: [] }],
      effort: CODEX_DEFAULT_TUNING.effort,
    })
  })

  it('sends the configured model on thread/start and the effort on turn/start', async () => {
    const transport = fake([...handshake, completedWith('done')])
    await createCodexQuery(transport.open, { model: 'gpt-5.1-codex', effort: 'high' })({
      systemPrompt: 'CAGE',
      prompt: 'ASK',
    })
    expect(transport.sends[2]?.params).toMatchObject({ model: 'gpt-5.1-codex' })
    expect(transport.sends[3]?.params).toMatchObject({ effort: 'high' })
  })

  it('falls back to the pinned defaults when nothing is configured', async () => {
    const transport = fake([...handshake, completedWith('done')])
    await ask(transport)
    expect(transport.sends[2]?.params).toMatchObject({ model: CODEX_DEFAULT_TUNING.model })
    expect(transport.sends[3]?.params).toMatchObject({ effort: CODEX_DEFAULT_TUNING.effort })
  })

  it('lets a configured effort win over the default while the default model stands', async () => {
    const transport = fake([...handshake, completedWith('done')])
    await createCodexQuery(transport.open, { effort: 'minimal' })({
      systemPrompt: 'CAGE',
      prompt: 'ASK',
    })
    expect(transport.sends[2]?.params).toMatchObject({ model: CODEX_DEFAULT_TUNING.model })
    expect(transport.sends[3]?.params).toMatchObject({ effort: 'minimal' })
  })

  it('omits baseInstructions for an empty system prompt', async () => {
    const transport = fake([...handshake, completedWith('done')])
    await ask(transport, '')
    expect(transport.sends[2]?.params).not.toHaveProperty('baseInstructions')
  })

  it('returns the last agent message of the completed turn', async () => {
    const transport = fake([...handshake, completedWith('first', 'last')])
    expect(await ask(transport)).toBe('last')
  })

  it('rejects a turn that failed', async () => {
    const transport = fake([
      ...handshake,
      turnCompleted({ status: 'failed', error: { message: 'model unavailable' }, items: [] }),
    ])
    await expect(ask(transport)).rejects.toThrow('model unavailable')
  })

  it('rejects a turn that was interrupted', async () => {
    const transport = fake([
      ...handshake,
      turnCompleted({ status: 'interrupted', error: null, items: [] }),
    ])
    await expect(ask(transport)).rejects.toThrow('interrupted')
  })

  it('rejects a completed turn that carries no agent message', async () => {
    const transport = fake([...handshake, completedWith()])
    await expect(ask(transport)).rejects.toThrow()
  })

  it('ignores a turn/completed for another thread', async () => {
    const transport = fake([
      ...handshake,
      turnCompleted({ status: 'completed', error: null, items: [message('other')] }, 'thread-2'),
      completedWith('mine'),
    ])
    expect(await ask(transport)).toBe('mine')
  })

  it('rejects on an error notification', async () => {
    const transport = fake([
      ...handshake,
      '{"method":"error","params":{"error":{"message":"rate limited"},"threadId":"t","turnId":"u","willRetry":false}}',
    ])
    await expect(ask(transport)).rejects.toThrow('rate limited')
  })

  it('rejects when a request fails', async () => {
    const transport = fake([
      '{"id":1,"result":{}}',
      '{"id":2,"error":{"code":-32000,"message":"thread refused"}}',
    ])
    await expect(ask(transport)).rejects.toThrow('thread refused')
  })

  it('declines an approval request without ending the turn', async () => {
    const transport = fake([
      ...handshake,
      '{"method":"item/fileChange/requestApproval","id":"r1","params":{}}',
      completedWith('done'),
    ])
    expect(await ask(transport)).toBe('done')
    expect(transport.sends).toHaveLength(5)
    expect(transport.sends[4]).toEqual({ id: 'r1', result: { decision: 'decline' } })
  })

  it('answers an unsupported server request with an error', async () => {
    const transport = fake([
      ...handshake,
      '{"method":"item/tool/call","id":"r2","params":{}}',
      completedWith('done'),
    ])
    expect(await ask(transport)).toBe('done')
    expect(transport.sends).toHaveLength(5)
    expect(transport.sends[4]?.id).toBe('r2')
    expect(transport.sends[4]?.error).toBeDefined()
    expect(transport.sends[4]).not.toHaveProperty('result')
  })

  it('ignores unrelated notifications', async () => {
    const transport = fake([
      ...handshake,
      '{"method":"thread/started","params":{}}',
      '{"method":"mcpServer/startupStatus/updated","params":{}}',
      '{"method":"thread/tokenUsage/updated","params":{}}',
      completedWith('done'),
    ])
    expect(await ask(transport)).toBe('done')
    expect(transport.sends).toHaveLength(4)
  })

  it('rejects when the stream ends first', async () => {
    const transport = fake(handshake, 'codex: not logged in')
    await expect(ask(transport)).rejects.toThrow('codex: not logged in')
  })

  it('closes the transport on success and on rejection', async () => {
    const resolving = fake([...handshake, completedWith('done')])
    await ask(resolving)
    expect(resolving.closes).toBe(1)

    const rejecting = fake(handshake)
    await expect(ask(rejecting)).rejects.toThrow()
    expect(rejecting.closes).toBe(1)
  })
})
