import { expect, it } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readReport, writeReport } from '../../../skills/hogwash/scripts/report/store.js'
import { ReportSchema } from '../../../skills/hogwash/scripts/types.js'

it('round-trips only report v6', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'hogwash-report-'))
  const report = ReportSchema.parse({
    version: 6,
    createdAt: 'fixed',
    register: 'technical',
    threshold: 25,
    files: [],
  })
  await writeReport(cwd, report)
  expect(await readReport(cwd)).toEqual(report)
})
