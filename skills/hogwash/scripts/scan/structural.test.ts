import { describe, expect, it } from 'bun:test'
import type { StructuralRule } from '../rules/schema.js'
import { StructuralRuleSchema } from '../rules/schema.js'
import { scanStructure } from './structural.js'

const rule: StructuralRule = StructuralRuleSchema.parse({
  id: 'wiki.structure.title-case-heading',
  category: 'formatting',
  engine: 'structural',
  check: 'title-case-heading',
  severity: 'info',
  weight: 0.5,
  era: 'gpt4',
  reliable: true,
  message: 'Heading in Title Case where the document otherwise uses sentence case.',
  attribution: 'test',
  examples: { matching: ['## Challenges and Future Directions'] },
})

const scan = (text: string): readonly string[] =>
  scanStructure(text, [rule], 'technical').map((finding) => finding.match)

describe('scanStructure title-case-heading', () => {
  it('names the title-case heading among sentence-case ones', () => {
    expect(
      scan('## What the parser reads\n\nOne.\n\n## Challenges and Future Directions\n\nTwo.\n'),
    ).toEqual(['## Challenges and Future Directions'])
  })

  it('stays quiet when every heading is title case', () => {
    expect(scan('## Reading The Parser\n\nOne.\n\n## Future Work Ahead\n\nTwo.\n')).toEqual([])
  })

  it('stays quiet when every heading is sentence case', () => {
    expect(scan('## Reading the parser\n\nOne.\n\n## Future work ahead\n\nTwo.\n')).toEqual([])
  })

  it('reads minor words as neither case, so "of the" proves nothing', () => {
    expect(
      scan('## The shape of the graph\n\nOne.\n\n## Cost of the Retry Loop\n\nTwo.\n'),
    ).toEqual(['## Cost of the Retry Loop'])
  })

  it('leaves an acronym out of the judgement', () => {
    expect(scan('## Reading the parser\n\nOne.\n\n## The HTTP retry budget\n\nTwo.\n')).toEqual([])
  })

  it('needs two judged words, so a two-word heading decides nothing', () => {
    expect(scan('## Parser Internals\n\nOne.\n\n## Future work ahead\n\nTwo.\n')).toEqual([])
  })

  it('reports one finding per title-case heading', () => {
    expect(
      scan(
        '# Reading the parser\n\nOne.\n\n## Challenges and Future Directions\n\nTwo.\n\n## Next Steps Forward\n\nThree.\n',
      ),
    ).toEqual(['## Challenges and Future Directions', '## Next Steps Forward'])
  })

  it('carries the rule weight, so the finding counts towards density', () => {
    const findings = scanStructure(
      '## Reading the parser\n\nOne.\n\n## Cost of the Retry Loop\n\nTwo.\n',
      [rule],
      'technical',
    )
    expect(findings[0]?.effectiveWeight).toBe(0.5)
    expect(findings[0]?.engine).toBe('structural')
  })

  it('finds nothing in a document with no rule to run', () => {
    expect(scanStructure('## Challenges and Future Directions\n', [], 'technical')).toEqual([])
  })
})
