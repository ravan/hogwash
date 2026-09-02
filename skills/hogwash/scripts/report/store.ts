import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { z } from 'zod'
import { HogwashError } from '../errors.js'
import type { Report } from '../types.js'
import { ReportSchema } from '../types.js'

export const REPORT_DIR = '.hogwash'
export const REPORT_FILE = 'report.json'

const ErrnoSchema = z.object({ code: z.string() })
const isMissing = (error: unknown): boolean => ErrnoSchema.safeParse(error).data?.code === 'ENOENT'

/** `.hogwash/<stem>-baseline.json`: the frozen first scan of one original. */
export const baselinePath = (cwd: string, original: string): string =>
  join(cwd, REPORT_DIR, `${basename(original, extname(original))}-baseline.json`)

/**
 * Freezes a one-file report as that file's baseline. An existing baseline is
 * kept untouched — a baseline is frozen once per rewrite cycle, and only
 * `accept` (or the owner) removes it.
 */
export async function writeBaseline(
  cwd: string,
  report: Report,
): Promise<{ readonly path: string; readonly created: boolean }> {
  const file = report.files[0]
  if (file === undefined || report.files.length !== 1) {
    throw new HogwashError({
      kind: 'usage',
      message: 'a baseline freezes exactly one file',
    })
  }
  const path = baselinePath(cwd, file.path)
  try {
    await mkdir(join(cwd, REPORT_DIR), { recursive: true })
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
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

/** Removes a file's baseline; a missing baseline is not an error. */
export async function removeBaseline(cwd: string, original: string): Promise<boolean> {
  const path = baselinePath(cwd, original)
  try {
    await rm(path)
    return true
  } catch (error) {
    if (isMissing(error)) return false
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be removed',
    })
  }
}

export async function writeReport(cwd: string, report: Report): Promise<void> {
  const directory = join(cwd, REPORT_DIR)
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

/** Reads the stored report at the I/O boundary; throws HogwashError{kind:'io'}. */
export async function readReport(cwd: string): Promise<Report> {
  const path = join(cwd, REPORT_DIR, REPORT_FILE)
  const fail = (reason: string): never => {
    throw new HogwashError({ kind: 'io', path, message: reason })
  }
  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'could not be read')
  }
  try {
    return ReportSchema.parse(JSON.parse(source))
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'is not a hogwash report')
  }
}
