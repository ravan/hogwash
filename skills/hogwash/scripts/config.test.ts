import { describe, expect, it } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyOverrides, ConfigSchema, defaultConfigJson, loadConfig } from './config.js'
import { HogwashError } from './errors.js'
import { ThresholdSchema } from './types.js'

const directory = (): string => mkdtempSync(join(tmpdir(), 'hogwash-config-'))

describe('strict configuration', () => {
  it('requires hogwash.json', async () => {
    await expect(loadConfig(directory())).rejects.toBeInstanceOf(HogwashError)
  })

  it('fills the runtime defaults', () => {
    const config = ConfigSchema.parse({})
    expect(config.profile).toEqual({
      voice: 'profile/voice.md',
      quality: 'profile/quality.md',
      banList: 'profile/ban-list.md',
    })
    expect(config.workflow).toEqual({
      maxPasses: 5,
      diff: { command: 'code', args: ['--diff'], wait: false },
      advanced: {
        enabled: false,
        useConsultant: true,
        useSubagent: true,
        consultant: 'claude',
        subagent: 'codex',
      },
    })
    expect(config.models).toEqual({
      claude: { model: 'opus', effort: 'high' },
      codex: { model: 'gpt-5.6-sol', effort: 'high' },
    })
    expect(config.includeDeprecatedRules).toBe(false)
  })

  it('generates explicit adviser model settings', () => {
    const generated = JSON.parse(defaultConfigJson())
    expect(generated.workflow.diff).toEqual({ command: 'code', args: ['--diff'], wait: false })
    expect(generated.models).toEqual({
      claude: { model: 'opus', effort: 'high' },
      codex: { model: 'gpt-5.6-sol', effort: 'high' },
    })
    expect(ConfigSchema.parse(generated)).toEqual(generated)
  })

  it('rejects unknown and retired keys at every level', () => {
    for (const value of [
      { banList: 'ban.md' },
      { fixer: 'auto' },
      { sourceModel: 'claude' },
      { agents: ['claude'] },
      { deprecated: false },
      { profile: { voice: 'a', quality: 'b', banList: 'c', extra: true } },
      {
        workflow: {
          advanced: { enabled: false, consultant: 'claude', subagent: 'codex', extra: true },
        },
      },
      { workflow: { advanced: { consultants: ['claude'], subagents: ['codex'] } } },
    ])
      expect(ConfigSchema.safeParse(value).success).toBe(false)
  })

  it('requires model tuning for every configured advice family', () => {
    const missing = ConfigSchema.safeParse({
      workflow: { advanced: { enabled: true, consultant: 'gemini', subagent: 'codex' } },
    })
    expect(missing.success).toBe(false)
    expect(
      ConfigSchema.safeParse({
        workflow: { advanced: { enabled: true, consultant: 'gemini', subagent: 'codex' } },
        models: { gemini: {}, codex: {} },
      }).success,
    ).toBe(true)
  })

  it('skips model tuning for a mechanism that is turned off and rejects advanced with no mechanism', () => {
    expect(
      ConfigSchema.safeParse({
        workflow: {
          advanced: {
            enabled: true,
            useConsultant: false,
            consultant: 'gemini',
            subagent: 'codex',
          },
        },
        models: { codex: {} },
      }).success,
    ).toBe(true)
    expect(
      ConfigSchema.safeParse({
        workflow: {
          advanced: { enabled: true, useConsultant: false, useSubagent: false },
        },
      }).success,
    ).toBe(false)
  })

  it('accepts xhigh reasoning effort for Codex', () => {
    const config = ConfigSchema.parse({
      models: { claude: {}, codex: { effort: 'xhigh' } },
    })
    expect(config.models.codex?.effort).toBe('xhigh')
  })

  it('accepts only an argv diff plan', () => {
    expect(
      ConfigSchema.parse({
        workflow: {
          maxPasses: 3,
          diff: { command: 'zed', args: ['--diff'], wait: false },
          advanced: { enabled: false, consultant: 'claude', subagent: 'codex' },
        },
      }).workflow.diff,
    ).toEqual({ command: 'zed', args: ['--diff'], wait: false })
    expect(
      ConfigSchema.safeParse({ workflow: { diff: { command: 'zed --diff', wait: false } } })
        .success,
    ).toBe(false)
  })

  it('loads valid JSON and applies only scan overrides', async () => {
    const cwd = directory()
    writeFileSync(join(cwd, 'hogwash.json'), '{"register":"marketing","threshold":40}', 'utf8')
    const config = await loadConfig(cwd)
    expect(
      applyOverrides(config, { register: 'prose', threshold: ThresholdSchema.parse(10) }),
    ).toMatchObject({
      register: 'prose',
      threshold: 10,
    })
  })
})
