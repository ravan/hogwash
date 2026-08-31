import type { Config } from './config.js'
import { HogwashError } from './errors.js'
import { readDocument } from './io.js'
import { loadProfile } from './profile.js'
import type { Shell } from './shell.js'
import type { ModelFamily } from './types.js'

export const CONSULT_VERSION = 1

const SYSTEM_PROMPT =
  'Give read-only writing advice. Do not claim to edit files, run scans, or own the rewrite loop. Address the host agent that asked the question.'

function promptFor(input: {
  readonly question: string
  readonly candidate: string
  readonly voice: string
  readonly quality: string
  readonly banList: string
}): string {
  return [
    '# Question',
    input.question,
    '# Candidate',
    input.candidate,
    '# Voice profile',
    input.voice,
    '# Quality and style profile',
    input.quality,
    '# Ban list',
    input.banList,
  ].join('\n\n')
}

/** Make exactly one configured model call and return its advice. */
export async function runConsult(input: {
  readonly family: ModelFamily
  readonly candidate: string
  readonly config: Config
  readonly shell: Shell
}): Promise<void> {
  const { family, config, shell } = input
  if (!config.workflow.advanced.enabled) {
    throw new HogwashError({ kind: 'config', message: 'Advanced workflow advice is disabled.' })
  }
  if (!config.workflow.advanced.useConsultant) {
    throw new HogwashError({
      kind: 'config',
      message: 'The consultant mechanism is turned off (workflow.advanced.useConsultant is false).',
    })
  }
  if (config.workflow.advanced.consultant !== family) {
    throw new HogwashError({
      kind: 'config',
      message: `${family} is not configured as a consultant.`,
    })
  }
  const query = shell.queryFor(family, config.models)
  if (query === null) {
    throw new HogwashError({
      kind: 'adapter',
      family,
      message: 'no consultation adapter is available',
    })
  }
  const question = (await shell.readStdin()).trim()
  if (question.length === 0) {
    throw new HogwashError({
      kind: 'usage',
      message: 'consult requires a non-empty question on stdin',
    })
  }
  const document = await readDocument(input.candidate)
  if (document.text.trim().length === 0) {
    throw new HogwashError({ kind: 'io', path: input.candidate, message: 'candidate is empty' })
  }
  const profile = await loadProfile(shell.cwd, config, shell.home)
  let advice: string
  try {
    advice = await query({
      systemPrompt: SYSTEM_PROMPT,
      prompt: promptFor({ question, candidate: document.text, ...profile }),
    })
  } catch (error) {
    throw new HogwashError({
      kind: 'adapter',
      family,
      message: error instanceof Error ? error.message : String(error),
    })
  }
  if (advice.trim().length === 0) {
    throw new HogwashError({
      kind: 'adapter',
      family,
      message: 'the consultation returned no advice',
    })
  }
  shell.stdout(JSON.stringify({ version: CONSULT_VERSION, family, advice }))
}
