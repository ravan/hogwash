import { z } from 'zod'

/** Effort levels the Claude Agent SDK accepts as its `effort` query option. */
export const ClaudeEffortSchema = z.enum(['low', 'medium', 'high', 'xhigh', 'max'])
export type ClaudeEffort = z.infer<typeof ClaudeEffortSchema>

/** Reasoning effort levels the codex app-server accepts on turn/start. */
export const CodexEffortSchema = z.enum(['minimal', 'low', 'medium', 'high', 'xhigh'])
export type CodexEffort = z.infer<typeof CodexEffortSchema>

const ModelNameSchema = z.string().min(1)

export const ClaudeTuningSchema = z.strictObject({
  model: ModelNameSchema.optional(),
  effort: ClaudeEffortSchema.optional(),
})
export type ClaudeTuning = z.infer<typeof ClaudeTuningSchema>

export const CodexTuningSchema = z.strictObject({
  model: ModelNameSchema.optional(),
  effort: CodexEffortSchema.optional(),
})
export type CodexTuning = z.infer<typeof CodexTuningSchema>

/** What the codex adapter sends when neither hogwash.json nor a flag names one. */
export const CODEX_DEFAULT_TUNING = {
  model: 'gpt-5.6-sol',
  effort: 'high',
} as const satisfies Required<CodexTuning>

/** Gemini has no adapter yet, so only the model name is accepted for it. */
export const GeminiTuningSchema = z.strictObject({ model: ModelNameSchema.optional() })
export type GeminiTuning = z.infer<typeof GeminiTuningSchema>

/** Per-family model and effort settings; an absent family means adapter defaults. */
export const ModelsSchema = z.strictObject({
  claude: ClaudeTuningSchema.optional(),
  codex: CodexTuningSchema.optional(),
  gemini: GeminiTuningSchema.optional(),
})
export type Models = z.infer<typeof ModelsSchema>

/** Field-level merge: an override for one family never clears another family's file value. */
export function mergeModels(base: Models, overrides: Models): Models {
  return {
    ...base,
    ...(overrides.claude === undefined ? {} : { claude: { ...base.claude, ...overrides.claude } }),
    ...(overrides.codex === undefined ? {} : { codex: { ...base.codex, ...overrides.codex } }),
    ...(overrides.gemini === undefined ? {} : { gemini: { ...base.gemini, ...overrides.gemini } }),
  }
}
