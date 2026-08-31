import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { HogwashError } from '../errors.js'

const ScoreSchema = z.number().min(1).max(10)
const MovementSchema = z.tuple([ScoreSchema, ScoreSchema])

/** The judgment fields the rewrite loop supplies; everything else is computed. */
export const NotesSchema = z.strictObject({
  title: z.string().min(1).nullable().default(null),
  subtitle: z.string().min(1).nullable().default(null),
  intro: z.string().min(1).nullable().default(null),
  factsAltered: z.number().int().nonnegative().default(0),
  scores: z
    .strictObject({ readsHuman: MovementSchema, contentQuality: MovementSchema })
    .nullable()
    .default(null),
  waived: z
    .array(
      z.strictObject({
        line: z.number().int().positive(),
        rule: z.string().min(1),
        match: z.string().min(1),
        reason: z.string().min(1),
      }),
    )
    .default([]),
  annotations: z
    .array(z.strictObject({ line: z.number().int().positive(), label: z.string().min(1) }))
    .default([]),
  footer: z.string().min(1).nullable().default(null),
})
export type Notes = z.infer<typeof NotesSchema>

export const emptyNotes = (): Notes => NotesSchema.parse({})

/** Reads the notes JSON at the I/O boundary; throws HogwashError{kind:'io'}. */
export async function readNotes(path: string): Promise<Notes> {
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be read',
    })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  const result = NotesSchema.safeParse(parsed)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({ kind: 'io', path, message: `invalid notes: ${issues}` })
}
