import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { harness } from '../tests/helpers/cli.js'
import { run } from './cli.js'

describe('init', () => {
  it('creates the config and the three profile files', async () => {
    const created = harness()
    expect(await run(['init'], created.shell)).toBe(0)
    const config = JSON.parse(readFileSync(join(created.cwd, 'hogwash.json'), 'utf8'))
    expect(config.includeDeprecatedRules).toBe(false)
    expect(config.workflow.diff).toEqual({ command: 'code', args: ['--diff'], wait: false })
    expect(config.workflow.advanced).toEqual({
      enabled: false,
      useConsultant: true,
      useSubagent: true,
      consultant: 'claude',
      subagent: 'codex',
    })
    expect(config.models).toEqual({
      claude: { model: 'opus', effort: 'high' },
      codex: { model: 'gpt-5.6-sol', effort: 'high' },
    })
    for (const path of ['voice.md', 'quality.md', 'ban-list.md']) {
      expect(existsSync(join(created.cwd, 'profile', path))).toBe(true)
    }
  })

  it('keeps existing profiles when it runs again', async () => {
    const created = harness()
    await run(['init'], created.shell)
    writeFileSync(join(created.cwd, 'profile', 'voice.md'), 'custom voice')
    expect(await run(['init'], created.shell)).toBe(0)
    expect(readFileSync(join(created.cwd, 'profile', 'voice.md'), 'utf8')).toBe('custom voice')
  })

  it('never installs a skill directory', async () => {
    const created = harness()
    await run(['init'], created.shell)
    expect(existsSync(join(created.cwd, '.agents'))).toBe(false)
  })

  it('rejects the removed --skill flag', async () => {
    const created = harness()
    expect(await run(['init', '--skill'], created.shell)).toBe(2)
  })
})

describe('retained surfaces', () => {
  it('lists rules, renders reports, and prints the hook', async () => {
    const created = harness()
    expect(await run(['rules'], created.shell)).toBe(0)
    expect(created.stdout.join('\n')).toContain('residue.oaicite')
    created.stdout.length = 0
    const target = created.copyOf('oaicite-residue.md')
    await run(['scan', target], created.shell)
    created.stdout.length = 0
    expect(await run(['report', '--md'], created.shell)).toBe(1)
    expect(created.stdout[0]).toContain('| location | offsets | rule |')
    created.stdout.length = 0
    expect(await run(['hook'], created.shell)).toBe(0)
    expect(created.stdout[0]).toContain('hogwash scan')
  })
})
