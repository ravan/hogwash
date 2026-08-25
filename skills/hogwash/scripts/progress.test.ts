import { describe, expect, it } from 'bun:test'
import { renderProgressLine } from './progress.js'

describe('renderProgressLine', () => {
  it('prefixes a milestone with the time and command', () => {
    expect(
      renderProgressLine(
        {
          at: '2026-08-26T18:16:35.432',
          command: 'scan',
          message: 'reading 2 files',
          status: 'info',
        },
        false,
      ),
    ).toBe('18:16:35 [scan] reading 2 files')
  })

  it('colours the command and successful milestone only when colour is on', () => {
    const line = {
      at: '2026-08-26T18:16:35.432',
      command: 'fix',
      message: 'complete: 1 file changed',
      status: 'success',
    } as const
    const esc = String.fromCharCode(27)

    expect(renderProgressLine(line, false)).not.toContain(esc)
    expect(renderProgressLine(line, true)).toContain(esc)
    expect(renderProgressLine(line, true)).toContain('[fix]')
  })
})
