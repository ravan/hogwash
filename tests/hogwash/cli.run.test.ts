import { describe, expect, it } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { candidatePath } from '../../skills/hogwash/scripts/candidate.js'
import { run } from '../../skills/hogwash/scripts/cli.js'
import { ConfigSchema } from '../../skills/hogwash/scripts/config.js'
import { ReportSchema } from '../../skills/hogwash/scripts/types.js'
import { harness, readWrittenReport } from './helpers/cli.js'

describe('scan', () => {
  it('emits a v6 report with 1-based, end-exclusive locations and actionability', async () => {
    const created = harness()
    const target = join(created.cwd, 'draft.md')
    writeFileSync(target, 'Start.\nWe delve into it.\n', 'utf8')
    expect(await run(['scan', '--output', 'json', target], created.shell)).toBe(1)
    const report = ReportSchema.parse(JSON.parse(created.stdout[0] ?? ''))
    expect(report.version).toBe(6)
    const finding = report.files[0]?.findings.find((entry) => entry.ruleId === 'ban/delve')
    expect(finding).toMatchObject({
      start: 10,
      end: 15,
      actionable: true,
      location: { start: { line: 2, column: 4 }, end: { line: 2, column: 9 } },
    })
    expect(finding).not.toHaveProperty('tier')
    expect(finding).not.toHaveProperty('votes')
    expect(finding).not.toHaveProperty('selfReport')
    expect(report).not.toHaveProperty('sourceModel')
    expect(report).not.toHaveProperty('agents')
  })

  it('keeps advisory findings visible and non-actionable', async () => {
    const created = harness()
    const target = created.copyOf('corpus/ai-subtle.md')
    await run(['scan', '--output', 'json', target], created.shell)
    const report = ReportSchema.parse(readWrittenReport(created.cwd))
    const advisory = report.files[0]?.findings.filter((finding) => !finding.actionable) ?? []
    expect(advisory.length).toBeGreaterThan(0)
  })
})

describe('scan --short', () => {
  it('runs without hogwash.json, resolving the ban list through the home .idiolect', async () => {
    const created = harness()
    rmSync(join(created.cwd, 'hogwash.json'))
    rmSync(join(created.cwd, 'profile'), { recursive: true })
    mkdirSync(join(created.home, '.idiolect', 'profile'), { recursive: true })
    writeFileSync(
      join(created.home, '.idiolect', 'profile', 'ban-list.md'),
      '- delve \u2014 filler\n',
      'utf8',
    )
    const target = join(created.cwd, 'draft.md')
    writeFileSync(target, 'We delve into it.\n', 'utf8')
    expect(await run(['scan', '--short', '--output', 'json', target], created.shell)).toBe(1)
    const report = ReportSchema.parse(JSON.parse(created.stdout[0] ?? ''))
    const rules = report.files[0]?.findings.map((finding) => finding.ruleId) ?? []
    expect(rules).toContain('ban/delve')
  })

  it('scans with bundled defaults when hogwash.json and every profile are missing', async () => {
    const created = harness()
    rmSync(join(created.cwd, 'hogwash.json'))
    rmSync(join(created.cwd, 'profile'), { recursive: true })
    const target = join(created.cwd, 'draft.md')
    writeFileSync(target, 'It is a game-changer.\n', 'utf8')
    expect(await run(['scan', '--output', 'json', target], created.shell)).toBe(1)
    const report = ReportSchema.parse(JSON.parse(created.stdout[0] ?? ''))
    const rules = report.files[0]?.findings.map((finding) => finding.ruleId) ?? []
    expect(rules).toContain('marketing.buzzword')
    expect(created.stderr.join('\n')).toContain('defaults')
  })

  it('keeps the ban list mandatory when hogwash.json exists', async () => {
    const created = harness()
    rmSync(join(created.cwd, 'profile'), { recursive: true })
    const target = join(created.cwd, 'draft.md')
    writeFileSync(target, 'Hello.\n', 'utf8')
    expect(await run(['scan', target], created.shell)).toBe(2)
    expect(created.stderr.join('\n')).toContain('ban list')
  })

  it('selects fewer rules than a full scan', async () => {
    const full = harness()
    const short = harness()
    for (const created of [full, short]) {
      writeFileSync(join(created.cwd, 'draft.md'), 'Hello.\n', 'utf8')
    }
    await run(['scan', join(full.cwd, 'draft.md')], full.shell)
    await run(['scan', '--short', join(short.cwd, 'draft.md')], short.shell)
    const active = (lines: readonly string[]): number => {
      const line = lines.find((entry) => entry.includes('active rules'))
      return Number(/with (\d+) active rules/.exec(line ?? '')?.[1] ?? Number.NaN)
    }
    expect(active(short.stderr)).toBeLessThan(active(full.stderr))
  })
})

describe('consult', () => {
  it('makes one selected call with the candidate and every profile and writes nothing', async () => {
    const calls: { systemPrompt: string; prompt: string }[] = []
    const created = harness((_family, models) => {
      expect(models.claude).toEqual({ model: 'claude-opus-5', effort: 'high' })
      return async (request) => {
        calls.push(request)
        return 'Change the opening sentence.'
      }
    })
    created.writeConfig(
      ConfigSchema.parse({
        workflow: { advanced: { enabled: true, consultant: 'claude', subagent: 'codex' } },
        models: {
          claude: { model: 'claude-opus-5', effort: 'high' },
          codex: {},
        },
      }),
    )
    const candidate = join(created.cwd, 'draft-hogwash.md')
    writeFileSync(candidate, 'Candidate text.\n', 'utf8')
    created.setStdin('Does this opening work?')
    expect(await run(['consult', '--family', 'claude', candidate], created.shell)).toBe(0)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.prompt).toContain('Candidate text.')
    expect(calls[0]?.prompt).toContain('Write plainly.')
    expect(calls[0]?.prompt).toContain('Keep facts intact.')
    expect(calls[0]?.prompt).toContain('delve')
    expect(JSON.parse(created.stdout[0] ?? '')).toEqual({
      version: 1,
      family: 'claude',
      advice: 'Change the opening sentence.',
    })
    expect(readFileSync(candidate, 'utf8')).toBe('Candidate text.\n')
    expect(existsSync(join(created.cwd, '.hogwash'))).toBe(false)
  })

  it('rejects empty questions, disabled advice, missing candidates, and unavailable adapters', async () => {
    const disabled = harness(() => async () => 'advice')
    expect(await run(['consult', '--family', 'claude', 'missing.md'], disabled.shell)).toBe(2)
    expect(disabled.stderr.join('\n')).toContain('disabled')

    const wrongFamily = harness(() => async () => 'advice')
    wrongFamily.writeConfig(
      ConfigSchema.parse({
        workflow: { advanced: { enabled: true, consultant: 'claude', subagent: 'codex' } },
      }),
    )
    expect(await run(['consult', '--family', 'codex', 'missing.md'], wrongFamily.shell)).toBe(2)
    expect(wrongFamily.stderr.join('\n')).toContain('not configured as a consultant')

    const consultantOff = harness(() => async () => 'advice')
    consultantOff.writeConfig(
      ConfigSchema.parse({
        workflow: {
          advanced: {
            enabled: true,
            useConsultant: false,
            consultant: 'claude',
            subagent: 'codex',
          },
        },
      }),
    )
    expect(await run(['consult', '--family', 'claude', 'missing.md'], consultantOff.shell)).toBe(2)
    expect(consultantOff.stderr.join('\n')).toContain('consultant mechanism is turned off')

    const unavailable = harness()
    unavailable.writeConfig(
      ConfigSchema.parse({
        workflow: { advanced: { enabled: true, consultant: 'claude', subagent: 'codex' } },
        models: { claude: {}, codex: {} },
      }),
    )
    const candidate = join(unavailable.cwd, 'draft-hogwash.md')
    writeFileSync(candidate, 'Candidate.')
    unavailable.setStdin('Question?')
    expect(await run(['consult', '--family', 'claude', candidate], unavailable.shell)).toBe(2)
    expect(unavailable.stderr.join('\n')).toContain('no consultation adapter')

    const empty = harness(() => async () => 'advice')
    empty.writeConfig(
      ConfigSchema.parse({
        workflow: { advanced: { enabled: true, consultant: 'claude', subagent: 'codex' } },
        models: { claude: {}, codex: {} },
      }),
    )
    writeFileSync(join(empty.cwd, 'draft-hogwash.md'), 'Candidate.')
    expect(
      await run(
        ['consult', '--family', 'claude', join(empty.cwd, 'draft-hogwash.md')],
        empty.shell,
      ),
    ).toBe(2)
    expect(empty.stderr.join('\n')).toContain('non-empty question')
  })
})

describe('diff and accept', () => {
  it('opens only the configured argv against the derived candidate', async () => {
    const created = harness()
    created.writeConfig(
      ConfigSchema.parse({
        workflow: {
          maxPasses: 5,
          diff: { command: 'zed', args: ['--diff'], wait: false },
          advanced: { enabled: false, consultant: 'claude', subagent: 'codex' },
        },
      }),
    )
    const original = join(created.cwd, 'nested', 'post.md')
    const candidate = candidatePath(original)
    mkdirSync(join(created.cwd, 'nested'))
    writeFileSync(original, 'before')
    writeFileSync(candidate, 'after')
    expect(await run(['diff', original], created.shell)).toBe(0)
    expect(created.processes).toEqual([
      { command: 'zed', args: ['--diff', original, candidate], wait: false },
    ])
    expect(readFileSync(original, 'utf8')).toBe('before')
    expect(readFileSync(candidate, 'utf8')).toBe('after')
    expect(existsSync(join(created.cwd, '.hogwash'))).toBe(false)
  })

  it('atomically replaces the original only after approval and leaves no sibling', async () => {
    const created = harness()
    const original = join(created.cwd, 'post.md')
    const candidate = candidatePath(original)
    writeFileSync(original, 'before')
    writeFileSync(candidate, 'after')
    expect(await run(['accept', '--approved', original], created.shell)).toBe(0)
    expect(readFileSync(original, 'utf8')).toBe('after')
    expect(existsSync(candidate)).toBe(false)
    expect(existsSync(join(created.cwd, '.hogwash'))).toBe(false)
  })

  it('rejects missing candidates and an unconfigured diff viewer', async () => {
    const created = harness()
    expect(await run(['diff', join(created.cwd, 'post.md')], created.shell)).toBe(2)
    expect(await run(['accept', '--approved', join(created.cwd, 'post.md')], created.shell)).toBe(2)
  })
})
