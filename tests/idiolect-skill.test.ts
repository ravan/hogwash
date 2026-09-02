import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..', 'skills', 'idiolect')
const read = (path: string): string => readFileSync(join(root, path), 'utf8')

describe('idiolect skill', () => {
  it('declares a trigger-only description and links every bundled resource', () => {
    const skill = read('SKILL.md')
    expect(skill).toMatch(/^---\nname: idiolect\n/)
    expect(skill).toMatch(/description: Use when/)
    for (const path of [
      'references/foundations.md',
      'references/interview.md',
      'references/corpus.md',
      'references/apply.md',
      'references/refine.md',
      'templates/voice.md',
    ]) {
      expect(skill).toContain(`(${path})`)
      expect(read(path).trim().length).toBeGreaterThan(0)
    }
  })

  it('is a user-only slash command that no skill or model invokes', () => {
    const skill = read('SKILL.md')
    const frontmatter = skill.split('---')[1] ?? ''
    expect(frontmatter).toContain('disable-model-invocation: true')
    const hogwash = readFileSync(
      join(import.meta.dir, '..', 'skills', 'hogwash', 'SKILL.md'),
      'utf8',
    )
    expect(hogwash).toContain('/idiolect')
    expect(hogwash).toMatch(/never invoke/i)
    const seed = readFileSync(
      join(import.meta.dir, '..', 'skills', 'hogwash', 'templates', 'ban-list-template.md'),
      'utf8',
    )
    expect(seed.split('\n').filter((line) => /^\s*[-*+]\s+/.test(line))).toEqual([])
  })

  it('defines the sixteen-dimension core profile with confidence tags', () => {
    const template = read('templates/voice.md')
    for (const heading of [
      '## Portrait',
      '## Dimensions',
      '### Tone',
      '### Directness',
      '### Stance',
      '### Texture',
      '## Mechanics',
      '## Function-word fingerprint',
      '## Lexicon',
      '## Heritage and dialect',
      '## Signature moves',
      '## Unknowns and non-rules',
    ]) {
      expect(template).toContain(heading)
    }
    expect(template).toContain('reported')
    expect(read('templates/register.md')).toContain('## Dimension overrides')
    expect(read('templates/evidence.md')).toContain('HOLDOUT')
    const banList = read('templates/ban-list.md')
    expect(banList).toContain('bullets only')
    // Hogwash reads every bullet as a live ban, so the template must ship none.
    expect(banList.split('\n').filter((line) => /^\s*[-*+]\s+/.test(line))).toEqual([])
  })

  it('anchors every interview dimension with example ranges', () => {
    const interview = read('references/interview.md')
    for (let dimension = 1; dimension <= 16; dimension += 1) {
      expect(interview).toMatch(new RegExp(`### ${dimension}\\. `))
    }
    expect(interview.match(/- \*\*1\*\*/g)?.length).toBeGreaterThanOrEqual(16)
    expect(interview.match(/- \*\*5\*\*/g)?.length).toBeGreaterThanOrEqual(16)
    expect(interview).toContain('Phase 6')
    expect(interview.toLowerCase()).toContain('retranslate')
    expect(interview).toContain('What is your role, and what will this voice be used for?')
    expect(interview).toContain('Transpose every base situation')
    expect(interview.toLowerCase()).toContain('measures their imagination, not their voice')
  })

  it('grounds the method in verified research and guards the known failure modes', () => {
    const foundations = read('references/foundations.md')
    for (const anchor of [
      'Mosteller & Wallace',
      'Stamatatos',
      'Pennebaker',
      'Biber',
      'Osgood',
      'Smith & Kendall',
      'Meyer',
      'ecological fallacy',
      'Kobak',
      'Jakesch',
    ]) {
      expect(foundations).toContain(anchor)
    }
    const corpus = read('references/corpus.md')
    expect(corpus).toContain('HOLDOUT')
    expect(corpus).toContain('AI-assisted')
    const refine = read('references/refine.md')
    expect(refine).toContain('observed absence')
    expect(refine.toLowerCase()).toContain('changelog')
  })

  it('ships workflow evals and no trigger evals, because nothing but the owner invokes it', () => {
    const evals = JSON.parse(read('evals/evals.json')) as {
      trigger?: unknown
      invocation: { in_scope: string[]; out_of_scope: string[] }
      workflow: Array<{ readonly mode: string; readonly assertions: string[] }>
    }
    expect(evals).not.toHaveProperty('trigger')
    expect(evals.invocation.in_scope.length).toBeGreaterThan(0)
    expect(evals.invocation.out_of_scope.length).toBeGreaterThan(0)
    expect(evals.workflow[0]?.assertions.join(' ')).toContain('hogwash.json')
    expect(evals.workflow.map((entry) => entry.mode)).toEqual([
      'create',
      'create',
      'apply',
      'critique',
      'refine',
    ])
  })
})
