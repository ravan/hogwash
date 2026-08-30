import { describe, expect, it } from 'bun:test'
import { candidatePath } from '../../skills/hogwash/scripts/candidate.js'

describe('candidatePath', () => {
  it('handles nested, extensionless, and dotted paths', () => {
    expect(candidatePath('docs/post.md')).toBe('docs/post-hogwash.md')
    expect(candidatePath('docs/README')).toBe('docs/README-hogwash')
    expect(candidatePath('.notes')).toBe('.notes-hogwash')
  })
})
