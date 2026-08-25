import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { HogwashError } from '../errors.js'
import { RegisterSchema, RuleIdSchema } from '../types.js'

export const CorpusClassNameSchema = z.string().min(1).brand<'CorpusClassName'>()
export type CorpusClassName = z.infer<typeof CorpusClassNameSchema>

export const CorpusClassKindSchema = z.enum(['positive', 'control'])
export type CorpusClassKind = z.infer<typeof CorpusClassKindSchema>

export const CorpusItemSchema = z.object({
  path: z.string().min(1),
  register: RegisterSchema,
  provenance: z.string().min(1),
  adjudication: z.string().min(1),
})
export type CorpusItem = z.infer<typeof CorpusItemSchema>

export const CorpusClassSchema = z.object({
  name: CorpusClassNameSchema,
  kind: CorpusClassKindSchema,
  items: z.array(CorpusItemSchema),
})

export const CorpusManifestSchema = z.object({
  version: z.literal(1),
  classes: z.array(CorpusClassSchema).min(1),
})
export type CorpusManifest = z.infer<typeof CorpusManifestSchema>

export const AdjudicatedSpanSchema = z.object({
  ruleId: RuleIdSchema,
  quote: z.string().min(1),
})
export type AdjudicatedSpan = z.infer<typeof AdjudicatedSpanSchema>

export const AdjudicationSchema = z.object({
  note: z.string().min(1),
  falsePositives: z.array(AdjudicatedSpanSchema),
  missed: z.array(AdjudicatedSpanSchema),
})
export type Adjudication = z.infer<typeof AdjudicationSchema>

export const CORPUS_MANIFEST_PATH = 'tests/fixtures/eval/corpus.json'

export type LoadedItem = {
  readonly item: CorpusItem
  readonly text: string
  readonly adjudication: Adjudication
}

/** A class with no items is declared but not collected. */
export type LoadedClass = {
  readonly name: CorpusClassName
  readonly kind: CorpusClassKind
  readonly items: readonly LoadedItem[]
}

function read(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

function parseJson(path: string, source: string): unknown {
  try {
    return JSON.parse(source)
  } catch (error) {
    throw new HogwashError({
      kind: 'config',
      message: `Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}

function parseWith<T>(schema: z.ZodType<T>, path: string, value: unknown): T {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({ kind: 'config', message: `Invalid corpus in ${path}: ${issues}` })
}

/** Reads the manifest and every item it names, relative to `root`.
 *  Throws HogwashError{kind:'config'} on a bad manifest, {kind:'io'} on a
 *  missing document or adjudication. */
export function loadCorpus(root: string): readonly LoadedClass[] {
  const manifestPath = join(root, CORPUS_MANIFEST_PATH)
  const manifest = parseWith(
    CorpusManifestSchema,
    manifestPath,
    parseJson(manifestPath, read(manifestPath)),
  )
  return manifest.classes.map((entry) => ({
    name: entry.name,
    kind: entry.kind,
    items: entry.items.map((item) => {
      const adjudicationPath = join(root, item.adjudication)
      return {
        item,
        text: read(join(root, item.path)),
        adjudication: parseWith(
          AdjudicationSchema,
          adjudicationPath,
          parseJson(adjudicationPath, read(adjudicationPath)),
        ),
      }
    }),
  }))
}
