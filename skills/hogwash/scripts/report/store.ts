import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { HogwashError } from '../errors.js'
import type { Report } from '../types.js'
import { ReportSchema } from '../types.js'

export const REPORT_DIR = '.hogwash'
export const REPORT_FILE = 'report.json'

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
