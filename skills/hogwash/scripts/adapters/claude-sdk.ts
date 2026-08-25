import { query } from '@anthropic-ai/claude-agent-sdk'
import type { ClaudeTuning } from './tuning.js'
import type { AgentQuery } from './types.js'

export function createSdkQuery(tuning: ClaudeTuning = {}): AgentQuery {
  return async (request) => {
    const session = query({
      prompt: request.prompt,
      options: {
        systemPrompt: request.systemPrompt,
        maxTurns: 1,
        allowedTools: [],
        settingSources: [],
        ...(tuning.model === undefined ? {} : { model: tuning.model }),
        ...(tuning.effort === undefined ? {} : { effort: tuning.effort }),
      },
    })
    for await (const message of session) {
      if (message.type !== 'result' || message.subtype !== 'success') continue
      if (message.is_error) throw new Error(message.result)
      return message.result
    }
    throw new Error('the Claude Agent SDK produced no successful result')
  }
}
