import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { HogwashError } from '../../../skills/hogwash/scripts/errors.js'
import { parsePage } from '../../../skills/hogwash/scripts/sync/page.js'

const fixture = (name: string): string =>
  readFileSync(new URL(`../fixtures/sync/${name}`, import.meta.url), 'utf8')

describe('parsePage', () => {
  it('reads the fixture page', () => {
    const page = parsePage(fixture('page.json'))
    expect(page.key).toBe('Wikipedia:Signs of AI writing')
    expect(page.latest.id).toBe(1371235958)
    expect(page.license.url).toBe('https://creativecommons.org/licenses/by-sa/4.0/deed.en')
  })

  it('rejects a body that is not JSON', () => {
    try {
      parsePage('not json')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(HogwashError)
      expect(error instanceof HogwashError && error.failure.kind).toBe('config')
    }
  })

  it('rejects a body missing the source', () => {
    try {
      parsePage('{"key":"x"}')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(HogwashError)
      expect(error instanceof HogwashError && error.failure.kind).toBe('config')
      expect(error instanceof Error && error.message).toContain('source')
    }
  })
})
