import { z } from 'zod'
import { HogwashError } from '../errors.js'

export const WikiPageSchema = z.object({
  key: z.string().min(1),
  latest: z.object({ id: z.number().int().positive() }),
  license: z.object({ url: z.string().min(1) }),
  source: z.string().min(1),
})
export type WikiPage = z.infer<typeof WikiPageSchema>

/** Parses the REST body at the I/O boundary; throws HogwashError{kind:'config'}. */
export function parsePage(body: string): WikiPage {
  let decoded: unknown
  try {
    decoded = JSON.parse(body)
  } catch (error) {
    throw new HogwashError({
      kind: 'config',
      message: `Invalid page response: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
  const result = WikiPageSchema.safeParse(decoded)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({ kind: 'config', message: `Invalid page response: ${issues}` })
}
