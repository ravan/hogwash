import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConfigSchema } from '../../skills/hogwash/scripts/config.js'
import { HogwashError } from '../../skills/hogwash/scripts/errors.js'
import { loadProfile } from '../../skills/hogwash/scripts/profile.js'

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
