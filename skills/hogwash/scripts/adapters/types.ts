/** One configured model call in a fresh, tool-free session. */
export type AgentQuery = (request: {
  readonly systemPrompt: string
  readonly prompt: string
}) => Promise<string>
