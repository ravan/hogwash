import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HogwashError } from '../../../skills/hogwash/scripts/errors.js'
import { installHook } from '../../../skills/hogwash/scripts/hook/install.js'
import { preCommitScript } from '../../../skills/hogwash/scripts/hook/script.js'

const repository = (): string => {
  const cwd = mkdtempSync(join(tmpdir(), 'hogwash-hook-'))
  mkdirSync(join(cwd, '.git', 'hooks'), { recursive: true })
  return cwd
}

const expectIoFailure = async (cwd: string): Promise<HogwashError> => {
  try {
    await installHook(cwd)
  } catch (error) {
    if (!(error instanceof HogwashError)) throw error
    expect(error.failure.kind).toBe('io')
    return error
  }
  throw new Error('installHook did not throw')
}

describe('installHook', () => {
  it('writes the script and returns its path', async () => {
    const cwd = repository()
    const path = await installHook(cwd)
    expect(path).toBe(join(cwd, '.git', 'hooks', 'pre-commit'))
    expect(readFileSync(path, 'utf8')).toBe(preCommitScript())
  })

  it('makes the hook executable', async () => {
    const path = await installHook(repository())
    expect(statSync(path).mode & 0o111).not.toBe(0)
  })

  it('refuses to replace an existing hook', async () => {
    const cwd = repository()
    const path = join(cwd, '.git', 'hooks', 'pre-commit')
    writeFileSync(path, 'old', 'utf8')
    const error = await expectIoFailure(cwd)
    expect(error.message).toContain('already exists')
    expect(readFileSync(path, 'utf8')).toBe('old')
  })

  it('reports a missing hooks directory', async () => {
    await expectIoFailure(mkdtempSync(join(tmpdir(), 'hogwash-nohook-')))
  })
})
