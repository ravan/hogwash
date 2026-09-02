import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { candidatePath } from './candidate.js'
import { HogwashError } from './errors.js'
import { REPORT_DIR } from './report/store.js'
import type { ReportFinding } from './types.js'

export const WAIVERS_FILE = 'waivers.json'

/**
 * One owner decision: this occurrence of this rule stays, and here is why.
 * `file` is the original the owner reviewed; the waiver also covers that
 * original's candidate, since the loop scans the candidate. A waiver covers one
 * occurrence, so two identical matches need two entries.
 */
export const WaiverSchema = z.strictObject({
  file: z.string().min(1),
  rule: z.string().min(1),
  match: z.string().min(1),
  reason: z.string().min(1),
  /** Where the owner saw it. Used to pick between identical matches; null when unknown. */
  line: z.number().int().positive().nullable().default(null),
})
export type Waiver = z.infer<typeof WaiverSchema>

export const WaiversFileSchema = z.strictObject({
  version: z.literal(1),
  waivers: z.array(WaiverSchema),
})

export const waiversPath = (cwd: string): string => join(cwd, REPORT_DIR, WAIVERS_FILE)

const ErrnoSchema = z.object({ code: z.string() })

/** Reads `.hogwash/waivers.json`; a missing file is an empty list, a broken one is an io error. */
export async function readWaivers(cwd: string): Promise<readonly Waiver[]> {
  const path = waiversPath(cwd)
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    if (ErrnoSchema.safeParse(error).data?.code === 'ENOENT') return []
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
  const result = WaiversFileSchema.safeParse(parsed)
  if (result.success) return result.data.waivers
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({ kind: 'io', path, message: `invalid waivers: ${issues}` })
}

export async function writeWaivers(cwd: string, waivers: readonly Waiver[]): Promise<string> {
  const path = waiversPath(cwd)
  try {
    await mkdir(join(cwd, REPORT_DIR), { recursive: true })
    await writeFile(path, `${JSON.stringify({ version: 1, waivers }, null, 2)}\n`, 'utf8')
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be written',
    })
  }
  return path
}

/** Appends one waiver and returns the file path and the new total. */
export async function addWaiver(
  cwd: string,
  waiver: Waiver,
): Promise<{ readonly path: string; readonly total: number }> {
  const waivers = [...(await readWaivers(cwd)), waiver]
  return { path: await writeWaivers(cwd, waivers), total: waivers.length }
}

/** The stop rule's normalisation: trim, collapse whitespace, lower-case. */
export const normaliseMatch = (text: string): string =>
  text.trim().replace(/\s+/g, ' ').toLowerCase()

/** The waivers that apply to one scanned document: its own, plus those of the original it is a candidate for. */
export function waiversFor(
  waivers: readonly Waiver[],
  documentPath: string,
  cwd: string,
): readonly Waiver[] {
  const target = resolve(cwd, documentPath)
  return waivers.filter((waiver) => {
    const original = resolve(cwd, waiver.file)
    return original === target || resolve(cwd, candidatePath(original)) === target
  })
}

/**
 * Marks waived findings. Each waiver consumes exactly one finding with the same
 * rule and normalised match: the one on its recorded line when that exists,
 * otherwise the first unwaived one in document order. A waived finding stays
 * in the report but carries no weight and is not actionable.
 */
export function applyWaivers(
  findings: readonly ReportFinding[],
  waivers: readonly Waiver[],
): readonly ReportFinding[] {
  const waived = new Set<number>()
  const matches = (finding: ReportFinding, waiver: Waiver): boolean =>
    finding.ruleId === waiver.rule && normaliseMatch(finding.match) === normaliseMatch(waiver.match)
  for (const waiver of waivers) {
    const candidates = findings
      .map((finding, index) => ({ finding, index }))
      .filter(({ finding, index }) => !waived.has(index) && matches(finding, waiver))
    const onLine =
      waiver.line === null
        ? undefined
        : candidates.find(({ finding }) => finding.location.start.line === waiver.line)
    const chosen = onLine ?? candidates[0]
    if (chosen !== undefined) waived.add(chosen.index)
  }
  return findings.map((finding, index) =>
    waived.has(index)
      ? { ...finding, waived: true, actionable: false, effectiveWeight: 0 }
      : { ...finding, waived: false },
  )
}
