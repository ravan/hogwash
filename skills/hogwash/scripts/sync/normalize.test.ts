import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { normalizeWikitext } from './normalize.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../../tests/fixtures/sync/${name}`, import.meta.url), 'utf8')

describe('normalizeWikitext', () => {
  it('drops comments', () => {
    expect(normalizeWikitext('a<!-- x -->b\n')).toBe('ab\n')
  })

  it('drops self-closing and paired references', () => {
    expect(normalizeWikitext('a<ref name="s" />b<ref>note</ref>c\n')).toBe('abc\n')
  })

  it('drops a template with no parameters', () => {
    expect(normalizeWikitext('{{cob}}keep\n')).toBe('keep\n')
  })

  it('drops named parameters and keeps positional ones', () => {
    expect(normalizeWikitext('{{cot|bg=#fff|expand=yes|From here}}\n')).toBe('From here\n')
  })

  it('keeps a text parameter and strips its nested template', () => {
    expect(normalizeWikitext('{{tmbox|image=none|text=Watch: {{strong|delve}}}}\n')).toBe(
      'Watch: delve\n',
    )
  })

  it('reduces wiki links to their label', () => {
    expect(normalizeWikitext('See [[Wikipedia:Puffery|puffery]] and [[Kumba]].\n')).toBe(
      'See puffery and Kumba.\n',
    )
  })

  it('reduces external links to their label', () => {
    expect(normalizeWikitext('A [https://e.com/r 2025 report] and [https://e.com/raw].\n')).toBe(
      'A 2025 report and .\n',
    )
  })

  it('drops html tags and quote markup', () => {
    expect(normalizeWikitext("<div class=\"n\">''x'' and '''y'''</div>\n")).toBe('x and y\n')
  })

  it('resolves html entities', () => {
    expect(normalizeWikitext('a&nbsp;b &amp; c\n')).toBe('a b & c\n')
  })

  it('drops tables', () => {
    expect(normalizeWikitext('{| class="w"\n! T\n|-\n| delve\n|}\nafter\n')).toBe('after\n')
  })

  it('folds line endings, collapses spaces and drops blank lines', () => {
    expect(normalizeWikitext('a\r\n\r\n   b   \n\n')).toBe('a\nb\n')
  })

  it('normalizes the whole fixture page to the expected snapshot', () => {
    const page: { readonly source: string } = JSON.parse(fixture('page.json'))
    expect(normalizeWikitext(page.source)).toBe(fixture('page.expected.txt'))
  })
})
