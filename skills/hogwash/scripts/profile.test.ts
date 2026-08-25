import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConfigSchema } from './config.js'
import { HogwashError } from './errors.js'
import { loadProfile } from './profile.js'

const directory = (): string => mkdtempSync(join(tmpdir(), 'hogwash-profile-'))

describe('loadProfile', () => {
  it('reads all three configured documents', async () => {
    const cwd = directory()
    mkdirSync(join(cwd, 'profile'))
    writeFileSync(join(cwd, 'profile/voice.md'), 'voice')
    writeFileSync(join(cwd, 'profile/quality.md'), 'quality')
    writeFileSync(join(cwd, 'profile/ban-list.md'), 'ban')
    expect(await loadProfile(cwd, ConfigSchema.parse({}))).toEqual({
      voice: 'voice',
      quality: 'quality',
      banList: 'ban',
    })
  })

  it('rejects missing or empty profile documents', async () => {
    const cwd = directory()
    mkdirSync(join(cwd, 'profile'))
    writeFileSync(join(cwd, 'profile/voice.md'), '')
    await expect(loadProfile(cwd, ConfigSchema.parse({}))).rejects.toBeInstanceOf(HogwashError)
  })
})
