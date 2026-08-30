import { describe, expect, it } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { HogwashError } from '../../../skills/hogwash/scripts/errors.js'
import {
  BAN_PACK,
  banPackOf,
  loadBanList,
  parseBanList,
} from '../../../skills/hogwash/scripts/rules/banlist.js'

const LIST = [
  '# House ban list',
  '',
  'Words we never ship.',
  '',
  '- delve',
  '- "tapestry" — it says nothing',
  '* rich tapestry',
  '',
  '```md',
  '- not a rule, this is an example',
  '```',
  '',
  '1. it is not X, it is Y - the shape is worn out',
  '',
].join('\n')

describe('parseBanList', () => {
  it('reads one entry per bullet and skips prose and fenced code', () => {
    expect(parseBanList(LIST)).toEqual([
      { term: 'delve', reason: null },
      { term: 'tapestry', reason: 'it says nothing' },
      { term: 'rich tapestry', reason: null },
      { term: 'it is not X, it is Y', reason: 'the shape is worn out' },
    ])
  })

  it('returns nothing for a list with no bullets', () => {
    expect(parseBanList('# Nothing here\n\nJust prose.\n')).toEqual([])
  })
})

describe('banPackOf', () => {
  const pack = banPackOf(parseBanList(LIST), 'ban.md')

  it('gives every entry its own judge rule with a readable id', () => {
    expect(pack.name).toBe(BAN_PACK)
    expect(pack.rules.map((rule) => rule.id)).toEqual([
      'ban/delve',
      'ban/tapestry',
      'ban/rich-tapestry',
      'ban/it-is-not-x-it-is-y',
    ])
    for (const rule of pack.rules) {
      expect(rule.engine).toBe('lexical')
    }
  })

  it('carries the reason into the rule message', () => {
    const rule = pack.rules[1]
    expect(rule?.message).toContain('it says nothing')
  })

  it('keeps two entries with the same slug apart', () => {
    const twice = banPackOf(
      [
        { term: 'delve', reason: null },
        { term: 'Delve!', reason: null },
      ],
      'ban.md',
    )
    expect(twice.rules.map((rule) => rule.id)).toEqual(['ban/delve', 'ban/delve-2'])
  })

  it('rejects a list with no entries', () => {
    expect(() => banPackOf([], 'ban.md')).toThrow(HogwashError)
  })
})

describe('loadBanList', () => {
  it('reads a file from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hogwash-ban-'))
    const path = join(dir, 'ban.md')
    await writeFile(path, '- delve\n', 'utf8')
    const pack = await loadBanList(path)
    expect(pack.rules.map((rule) => rule.id)).toEqual(['ban/delve'])
    expect(pack.attribution).toContain(path)
  })

  it('reports a missing file as a config failure', async () => {
    const path = join(tmpdir(), 'hogwash-ban-does-not-exist.md')
    await expect(loadBanList(path)).rejects.toThrow('no such file')
  })
})
