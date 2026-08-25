import { describe, expect, it } from 'bun:test'
import { extractJsonObject } from './json.js'

describe('extractJsonObject', () => {
  it('returns a bare object unchanged', () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}')
  })

  it('strips a code fence', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('takes the outermost braces', () => {
    expect(extractJsonObject('noise {"a":{"b":2}} tail')).toBe('{"a":{"b":2}}')
  })

  it('returns null when there is no object', () => {
    expect(extractJsonObject('no braces here')).toBe(null)
  })

  it('returns null when the closing brace precedes the opening one', () => {
    expect(extractJsonObject('} {')).toBe(null)
  })
})
