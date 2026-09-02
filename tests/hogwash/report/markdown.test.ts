import { expect, it } from 'bun:test'
import { renderMarkdown } from '../../../skills/hogwash/scripts/report/markdown.js'
import { ReportSchema } from '../../../skills/hogwash/scripts/types.js'

it('renders v7 finding columns', () => {
  const report = ReportSchema.parse({
    version: 7,
    createdAt: 'fixed',
    register: 'technical',
    threshold: 25,
    files: [{ path: 'a.md', words: 1, density: 0, fingerprint: 'e3b0c44298fc1c14', findings: [] }],
  })
  const text = renderMarkdown(report)
  expect(text).toContain('## hogwash')
  expect(text).toContain('No findings.')
  expect(text).not.toContain('source model')
})
