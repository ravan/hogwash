import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs, run } from '../../../skills/hogwash/scripts/cli.js'
import { HogwashError } from '../../../skills/hogwash/scripts/errors.js'
import { computeHunks, diffTokens } from '../../../skills/hogwash/scripts/redline/align.js'
import { harness } from '../helpers/cli.js'

const joined = (segments: readonly { text: string }[]): string =>
  segments.map((segment) => segment.text).join('')

describe('parseArgs diff-report', () => {
  it('parses every flag around the single original path', () => {
    expect(
      parseArgs([
        'diff-report',
        '--notes',
        'notes.json',
        '--out',
        'report.html',
        '--register',
        'prose',
        '--open',
        'post.md',
      ]),
    ).toEqual({
      kind: 'redline',
      original: 'post.md',
      notes: 'notes.json',
      out: 'report.html',
      register: 'prose',
      open: true,
    })
    expect(parseArgs(['diff-report', 'post.md'])).toEqual({
      kind: 'redline',
      original: 'post.md',
      notes: null,
      out: null,
      register: null,
      open: false,
    })
  })

  it('rejects malformed invocations', () => {
    for (const argv of [
      ['diff-report'],
      ['diff-report', 'a.md', 'b.md'],
      ['diff-report', '--notes'],
      ['diff-report', '--out', '--notes', 'a.md'],
      ['diff-report', '--register', 'poetry', 'a.md'],
    ])
      expect(() => parseArgs(argv)).toThrow(HogwashError)
  })
})

describe('diffTokens', () => {
  it('marks the removed and added words and reconstructs both texts', () => {
    const diff = diffTokens(
      'landing on that layer at the same time. AI has broken it.',
      'landing on that layer at once. AI has broken it.',
    )
    expect(joined(diff.original)).toBe('landing on that layer at the same time. AI has broken it.')
    expect(joined(diff.revised)).toBe('landing on that layer at once. AI has broken it.')
    const removed = diff.original
      .filter((segment) => segment.kind === 'removed')
      .map((segment) => segment.text.trim())
      .join(' ')
    const added = diff.revised
      .filter((segment) => segment.kind === 'added')
      .map((segment) => segment.text.trim())
      .join(' ')
    expect(removed).toContain('same')
    expect(removed).toContain('time.')
    expect(added).toBe('once.')
  })

  it('returns a single unchanged run for identical passages', () => {
    expect(diffTokens('same text here', 'same text here')).toEqual({
      original: [{ kind: 'same', text: 'same text here' }],
      revised: [{ kind: 'same', text: 'same text here' }],
    })
  })
})

describe('computeHunks', () => {
  const original = [
    '# Title',
    '',
    'Intro paragraph stays put.',
    '',
    '## Section two',
    '',
    'We delve into the details at the same time.',
    '',
    'Unchanged tail paragraph.',
    '',
  ].join('\n')

  it('reports one hunk with the original line and nearest heading', () => {
    const revised = original.replace('delve into the details at the same time', 'dig in at once')
    const hunks = computeHunks(original, revised)
    expect(hunks).toHaveLength(1)
    expect(hunks[0]).toMatchObject({ lineStart: 7, lineEnd: 7, section: 'Section two' })
    expect(joined(hunks[0]?.original ?? [])).toBe('We delve into the details at the same time.')
    expect(joined(hunks[0]?.revised ?? [])).toBe('We dig in at once.')
  })

  it('reports pure removals and insertions as one-sided hunks', () => {
    const removedOnly = computeHunks(
      original,
      original.replace('Intro paragraph stays put.\n\n', ''),
    )
    expect(removedOnly).toHaveLength(1)
    expect(removedOnly[0]?.revised).toEqual([])
    expect(removedOnly[0]?.original).toEqual([
      { kind: 'removed', text: 'Intro paragraph stays put.' },
    ])
    const insertedOnly = computeHunks(
      original,
      original.replace('Unchanged tail', 'Brand new paragraph.\n\nUnchanged tail'),
    )
    expect(insertedOnly).toHaveLength(1)
    expect(insertedOnly[0]?.original).toEqual([])
    expect(insertedOnly[0]?.revised).toEqual([{ kind: 'added', text: 'Brand new paragraph.' }])
  })

  it('reports nothing when only whitespace moved', () => {
    const rewrapped = original.replace(
      'We delve into the details at the same time.',
      'We delve into the details\nat the same time.',
    )
    expect(computeHunks(original, rewrapped)).toEqual([])
  })
})

describe('run diff-report', () => {
  const original = [
    '# The post',
    '',
    'It is important to note that the plan works.',
    '',
    'The tail stays the same.',
    '',
  ].join('\n')
  const candidate = ['# The post', '', 'The plan works.', '', 'The tail stays the same.', ''].join(
    '\n',
  )

  it('writes the standalone redline beside the stored reports', async () => {
    const context = harness()
    writeFileSync(join(context.cwd, 'post.md'), original, 'utf8')
    writeFileSync(join(context.cwd, 'post-hogwash.md'), candidate, 'utf8')
    writeFileSync(
      join(context.cwd, 'notes.json'),
      JSON.stringify({
        title: 'The post, redlined',
        factsAltered: 0,
        scores: { readsHuman: [6, 8], contentQuality: [8, 8] },
        waived: [
          { line: 5, rule: 'test.rule', match: 'the same', reason: 'Author quote, kept as is.' },
        ],
      }),
      'utf8',
    )
    const code = await run(
      [
        'diff-report',
        '--notes',
        join(context.cwd, 'notes.json'),
        '--register',
        'prose',
        join(context.cwd, 'post.md'),
      ],
      context.shell,
    )
    expect(code).toBe(0)
    expect(context.stdout).toEqual([join('.hogwash', 'post-diff.html')])
    const written = join(context.cwd, '.hogwash', 'post-diff.html')
    expect(existsSync(written)).toBe(true)
    const html = readFileSync(written, 'utf8')
    expect(html).toContain('<title>The post, redlined</title>')
    expect(html).toContain('<del>')
    expect(html).toContain('<ins>')
    expect(html).toContain('1 finding left standing')
    expect(html).toContain('Author quote, kept as is.')
    expect(html).toContain('reads-human 6&rarr;8')
    expect(html).toContain('The post</span>')
  })

  it('honours --out and runs without notes', async () => {
    const context = harness()
    writeFileSync(join(context.cwd, 'post.md'), original, 'utf8')
    writeFileSync(join(context.cwd, 'post-hogwash.md'), candidate, 'utf8')
    const out = join(context.cwd, 'redline.html')
    const code = await run(
      ['diff-report', '--out', out, join(context.cwd, 'post.md')],
      context.shell,
    )
    expect(code).toBe(0)
    expect(context.stdout).toEqual([out])
    expect(readFileSync(out, 'utf8')).toContain('1 changed passage')
    expect(context.processes).toEqual([])
  })

  it('hands the written report to the system browser when --open is passed', async () => {
    const context = harness()
    writeFileSync(join(context.cwd, 'post.md'), original, 'utf8')
    writeFileSync(join(context.cwd, 'post-hogwash.md'), candidate, 'utf8')
    const code = await run(['diff-report', '--open', join(context.cwd, 'post.md')], context.shell)
    expect(code).toBe(0)
    const launched = context.processes[0]
    expect(context.processes).toHaveLength(1)
    expect(launched?.wait).toBe(false)
    expect(launched?.args[launched.args.length - 1]).toBe(
      join(context.cwd, '.hogwash', 'post-diff.html'),
    )
  })

  it('fails with a typed io error when the candidate is missing', async () => {
    const context = harness()
    writeFileSync(join(context.cwd, 'post.md'), original, 'utf8')
    const code = await run(['diff-report', join(context.cwd, 'post.md')], context.shell)
    expect(code).toBe(2)
    expect(context.stderr.join('\n')).toContain('post-hogwash.md')
  })
})
