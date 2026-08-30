import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../../../../skills/hogwash/scripts/sync/map/csv.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../fixtures/sync/${name}`, import.meta.url), 'utf8')

describe('parseCsv', () => {
  const cases: readonly {
    readonly name: string
    readonly text: string
    readonly rows: readonly (readonly string[])[]
  }[] = [
    {
      name: 'plain rows',
      text: 'a,b\nc,d\n',
      rows: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    },
    {
      name: 'no trailing newline',
      text: 'a,b\nc,d',
      rows: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    },
    { name: 'a comma inside quotes', text: '"x,y",z\n', rows: [['x,y', 'z']] },
    { name: 'a doubled quote', text: '"he said ""hi""",z\n', rows: [['he said "hi"', 'z']] },
    { name: 'a newline inside quotes', text: '"line\none",z\n', rows: [['line\none', 'z']] },
    { name: 'an empty field', text: 'a,,c\n', rows: [['a', '', 'c']] },
    { name: 'an empty document', text: '', rows: [] },
  ]

  for (const entry of cases) {
    it(`reads ${entry.name}`, () => {
      expect(parseCsv(entry.text)).toEqual(entry.rows)
    })
  }

  it('reads the excess-words fixture, comma inside a quoted comment and all', () => {
    const rows = parseCsv(fixture('excess-words.csv'))
    expect(rows).toHaveLength(8)
    expect(rows[0]).toEqual(['', 'word', 'type', 'part_of_speech', 'comment'])
    expect(rows[2]).toEqual([
      '1',
      'delves',
      'style',
      'verb',
      'already carried by wikipedia-signs, so review must skip it',
    ])
  })
})
