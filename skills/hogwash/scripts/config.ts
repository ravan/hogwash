import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { ModelsSchema } from './adapters/tuning.js'
import { HogwashError } from './errors.js'
import { GateSchema } from './rules/schema.js'
import { DEFAULT_THRESHOLD } from './scan/density.js'
import { ModelFamilySchema, PackNameSchema, RegisterSchema, ThresholdSchema } from './types.js'

// The packs on by default. `mechanics` is deliberately absent: its punctuation
// and length rules are a writer's house preference rather than a machine-writing
// tell, so a project opts in by naming it here.
const DEFAULT_PACKS = [
  'wikipedia-signs',
  'claudisms',
  'humanizer',
  'stylometry',
  'excess-vocab',
  'vale-ai-tells',
  'slop-gate',
  'unslop',
] as const

export const ProfileSchema = z.strictObject({
  voice: z.string().min(1).default('profiles/default/voice.md'),
  quality: z.string().min(1).default('profiles/default/quality.md'),
  banList: z.string().min(1).default('profiles/default/ban-list.md'),
})
export type Profile = z.infer<typeof ProfileSchema>

export const DiffSchema = z.strictObject({
  command: z.string().min(1),
  args: z.array(z.string()),
  wait: z.boolean(),
})
export type Diff = z.infer<typeof DiffSchema>

export const AdvancedSchema = z.strictObject({
  enabled: z.boolean().default(false),
  useConsultant: z.boolean().default(true),
  useSubagent: z.boolean().default(true),
  consultant: ModelFamilySchema.default('claude'),
  subagent: ModelFamilySchema.default('claude'),
})
export type Advanced = z.infer<typeof AdvancedSchema>

export const WorkflowSchema = z.strictObject({
  maxPasses: z.number().int().positive().default(5),
  diff: DiffSchema.nullable().default({ command: 'code', args: ['--diff'], wait: false }),
  advanced: AdvancedSchema.prefault({}),
})
export type Workflow = z.infer<typeof WorkflowSchema>

export const ConfigSchema = z
  .strictObject({
    register: RegisterSchema.default('technical'),
    threshold: ThresholdSchema.default(DEFAULT_THRESHOLD),
    packs: z.array(PackNameSchema).prefault([...DEFAULT_PACKS]),
    gates: z.array(GateSchema).default([]),
    profile: ProfileSchema.prefault({}),
    workflow: WorkflowSchema.prefault({}),
    includeDeprecatedRules: z.boolean().default(false),
    models: ModelsSchema.prefault({
      claude: { model: 'opus', effort: 'high' },
      codex: { model: 'gpt-5.6-sol', effort: 'high' },
    }),
  })
  .superRefine((config, context) => {
    const advanced = config.workflow.advanced
    if (advanced.enabled && !advanced.useConsultant && !advanced.useSubagent) {
      context.addIssue({
        code: 'custom',
        path: ['workflow', 'advanced', 'enabled'],
        message:
          'is true while useConsultant and useSubagent are both false; turn one mechanism on or set enabled to false',
      })
    }
    const families = new Set(
      [
        advanced.useConsultant ? advanced.consultant : null,
        advanced.useSubagent ? advanced.subagent : null,
      ].filter((family): family is z.infer<typeof ModelFamilySchema> => family !== null),
    )
    for (const family of families) {
      if (config.models[family] !== undefined) continue
      context.addIssue({
        code: 'custom',
        path: ['models', family],
        message: `is required because workflow.advanced configures ${family}`,
      })
    }
  })
export type Config = z.infer<typeof ConfigSchema>

export const CONFIG_FILE = 'hogwash.json'

export type ConfigOverrides = {
  readonly register: Config['register'] | null
  readonly threshold: Config['threshold'] | null
  /** Short-message tuning: drop the packs whose statistics need a long document. */
  readonly short: boolean
}

const SHORT_EXCLUDED_PACKS: ReadonlySet<string> = new Set(['stylometry', 'excess-vocab'])

const ErrnoSchema = z.object({ code: z.string() })
const isMissing = (error: unknown): boolean => ErrnoSchema.safeParse(error).data?.code === 'ENOENT'

/** Read and strictly validate the required project configuration. */
export type LoadedConfig = {
  readonly config: Config
  /** False when hogwash.json is absent and the built-in defaults apply. */
  readonly fromFile: boolean
}

/** Read the project configuration; a missing file means the defaults. */
export async function loadConfigDetailed(cwd: string): Promise<LoadedConfig> {
  const path = join(cwd, CONFIG_FILE)
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if (isMissing(error)) return { config: ConfigSchema.parse({}), fromFile: false }
    throw new HogwashError({
      kind: 'config',
      message: `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new HogwashError({
      kind: 'config',
      message: `Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  const result = ConfigSchema.safeParse(parsed)
  if (result.success) return { config: result.data, fromFile: true }
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({ kind: 'config', message: `Invalid config in ${path}: ${issues}` })
}

/** Read and validate the configuration, applying defaults when the file is missing. */
export async function loadConfig(cwd: string): Promise<Config> {
  return (await loadConfigDetailed(cwd)).config
}

export function defaultConfigJson(): string {
  return `${JSON.stringify(ConfigSchema.parse({}), null, 2)}\n`
}

/** Create the config without overwriting an existing file. */
export async function initConfig(cwd: string): Promise<{ path: string; created: boolean }> {
  const path = join(cwd, CONFIG_FILE)
  try {
    await writeFile(path, defaultConfigJson(), { encoding: 'utf8', flag: 'wx' })
    return { path, created: true }
  } catch (error) {
    if (ErrnoSchema.safeParse(error).data?.code === 'EEXIST') return { path, created: false }
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be written',
    })
  }
}

export const banListPath = (config: Config): string => config.profile.banList

export function applyOverrides(config: Config, overrides: ConfigOverrides): Config {
  return {
    ...config,
    register: overrides.register ?? config.register,
    threshold: overrides.threshold ?? config.threshold,
    packs: overrides.short
      ? config.packs.filter((pack) => !SHORT_EXCLUDED_PACKS.has(pack))
      : config.packs,
  }
}
