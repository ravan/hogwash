import { describe, expect, it } from 'bun:test'
import type { StructuralRule } from '../../../skills/hogwash/scripts/rules/schema.js'
import { StructuralRuleSchema } from '../../../skills/hogwash/scripts/rules/schema.js'
import { scanStructure } from '../../../skills/hogwash/scripts/scan/structural.js'

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

const countingRule = (check: string, limit: number | null): StructuralRule =>
  StructuralRuleSchema.parse({
    id: `test.${check}`,
    category: 'rhythm',
    engine: 'structural',
    check,
    limit,
    severity: 'error',
    weight: 2,
    era: 'mixed',
    reliable: true,
    message: 'test',
    attribution: 'test',
    examples: { matching: ['a, b, c'] },
  })

const scanWith = (rule: StructuralRule, text: string): readonly string[] =>
  scanStructure(text, [rule], 'technical').map((finding) => finding.match)

describe('scanStructure over-commaed-sentence', () => {
  const rule = countingRule('over-commaed-sentence', 1)

  it('names the sentence that carries a second comma', () => {
    expect(scanWith(rule, 'The build ran, the tests passed, and it shipped.')).toEqual([
      'The build ran, the tests passed, and it shipped.',
    ])
  })

  it('leaves one comma alone', () => {
    expect(scanWith(rule, 'The build ran, and it shipped.')).toEqual([])
  })

  it('reads a thousands separator as a number, not a clause', () => {
    expect(scanWith(rule, 'It cost 1,200,000 euro.')).toEqual([])
  })

  it('counts each sentence on its own', () => {
    expect(scanWith(rule, 'One, two. Three, four, five.')).toEqual(['Three, four, five.'])
  })

  it('ignores commas inside code', () => {
    expect(scanWith(rule, 'Run `ls -a, -b, -c` first.')).toEqual([])
  })

  it('judges a list item, because a bullet is prose', () => {
    expect(scanWith(rule, '- one, two, three\n')).toEqual(['- one, two, three'])
  })

  it('leaves a heading alone, because a title is not a sentence', () => {
    expect(scanWith(rule, '# One, two, three\n')).toEqual([])
  })

  it('takes the limit from the pack', () => {
    expect(scanWith(countingRule('over-commaed-sentence', 2), 'One, two, three.')).toEqual([])
  })

  it('falls back to one comma when the pack names no limit', () => {
    expect(scanWith(countingRule('over-commaed-sentence', null), 'One, two, three.')).toEqual([
      'One, two, three.',
    ])
  })
})

describe('scanStructure long-paragraph', () => {
  const rule = countingRule('long-paragraph', 3)

  it('names the paragraph that runs past the limit', () => {
    expect(scanWith(rule, 'One. Two. Three. Four.\n')).toEqual(['One. Two. Three. Four.'])
  })

  it('leaves a paragraph at the limit alone', () => {
    expect(scanWith(rule, 'One. Two. Three.\n')).toEqual([])
  })

  it('measures each paragraph on its own', () => {
    expect(scanWith(rule, 'One. Two.\n\nA. B. C. D.\n')).toEqual(['A. B. C. D.'])
  })

  it('does not treat a run of list items as a paragraph', () => {
    expect(scanWith(rule, '- One.\n- Two.\n- Three.\n- Four.\n')).toEqual([])
  })

  it('falls back to three sentences when the pack names no limit', () => {
    expect(scanWith(countingRule('long-paragraph', null), 'One. Two. Three. Four.\n')).toEqual([
      'One. Two. Three. Four.',
    ])
  })
})
