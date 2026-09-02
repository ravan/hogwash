import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ConfigSchema } from '../../skills/hogwash/scripts/config.js'
import { HogwashError } from '../../skills/hogwash/scripts/errors.js'
import { loadProfile, resolveIdiolectHome } from '../../skills/hogwash/scripts/profile.js'

const directory = (): string => mkdtempSync(join(tmpdir(), 'hogwash-profile-'))

describe('loadProfile', () => {
  it('reads all three configured documents', async () => {
    const cwd = directory()
    mkdirSync(join(cwd, 'profiles/default'), { recursive: true })
    writeFileSync(join(cwd, 'profiles/default/voice.md'), 'voice')
    writeFileSync(join(cwd, 'profiles/default/quality.md'), 'quality')
    writeFileSync(join(cwd, 'profiles/default/ban-list.md'), 'ban')
    expect(await loadProfile(cwd, ConfigSchema.parse({}))).toEqual({
      voice: 'voice',
      quality: 'quality',
      banList: 'ban',
    })
  })

  it('rejects missing or empty profile documents', async () => {
    const cwd = directory()
    mkdirSync(join(cwd, 'profiles/default'), { recursive: true })
    writeFileSync(join(cwd, 'profiles/default/voice.md'), '')
    await expect(loadProfile(cwd, ConfigSchema.parse({}))).rejects.toBeInstanceOf(HogwashError)
  })
})

describe('loadProfile home fallback', () => {
  const named = () =>
    ConfigSchema.parse({
      profile: {
        voice: 'profiles/house/voice.md',
        quality: 'profiles/house/quality.md',
        banList: 'profiles/house/ban-list.md',
      },
    })

  it('falls back to ~/.idiolect for a profile path missing from the project', async () => {
    const cwd = directory()
    const home = directory()
    mkdirSync(join(home, '.idiolect/profiles/house'), { recursive: true })
    writeFileSync(join(home, '.idiolect/profiles/house/voice.md'), 'home voice')
    writeFileSync(join(home, '.idiolect/profiles/house/quality.md'), 'home quality')
    writeFileSync(join(home, '.idiolect/profiles/house/ban-list.md'), 'home ban')
    expect(await loadProfile(cwd, named(), join(home, '.idiolect'))).toEqual({
      voice: 'home voice',
      quality: 'home quality',
      banList: 'home ban',
    })
  })

  it('prefers the project copy over the home copy', async () => {
    const cwd = directory()
    const home = directory()
    mkdirSync(join(cwd, 'profiles/house'), { recursive: true })
    mkdirSync(join(home, '.idiolect/profiles/house'), { recursive: true })
    for (const stem of ['voice', 'quality', 'ban-list']) {
      writeFileSync(join(cwd, `profiles/house/${stem}.md`), `project ${stem}`)
      writeFileSync(join(home, `.idiolect/profiles/house/${stem}.md`), `home ${stem}`)
    }
    expect(await loadProfile(cwd, named(), join(home, '.idiolect'))).toEqual({
      voice: 'project voice',
      quality: 'project quality',
      banList: 'project ban-list',
    })
  })

  it('names both tried locations when a profile is missing everywhere', async () => {
    const cwd = directory()
    const home = directory()
    await expect(loadProfile(cwd, named(), join(home, '.idiolect'))).rejects.toThrow(/\.idiolect/)
  })
})

describe('resolveIdiolectHome', () => {
  it('prefers IDIOLECT_HOME over the home directory', () => {
    expect(resolveIdiolectHome('/shared/idiolect', '/Users/me')).toBe('/shared/idiolect')
    expect(resolveIdiolectHome(undefined, '/Users/me')).toBe(join('/Users/me', '.idiolect'))
    expect(resolveIdiolectHome('', '/Users/me')).toBe(join('/Users/me', '.idiolect'))
  })
})
