import { describe, expect, it } from 'bun:test'
import { HogwashError } from '../errors.js'
import { compileRule, LexicalRuleSchema, loadPack, RuleSchema } from './schema.js'

const validRule = {
  id: 'test.demo',
  category: 'residue',
  engine: 'lexical',
  severity: 'warning',
  weight: 2,
  era: 'gpt4',
  message: 'x',
  attribution: 'x',
  pattern: 'abc',
  examples: { matching: ['abc'] },
}

const validStructuralRule = {
  id: 'test.structural',
  category: 'formatting',
  engine: 'structural',
  check: 'title-case-heading',
  severity: 'info',
  weight: 1,
  era: 'gpt4',
  message: 'x',
  attribution: 'x',
  examples: { matching: ['## Abc Def'] },
}

const packWith = (...rules: readonly unknown[]) => ({
  name: 'test-pack',
  version: '0.1.0',
  attribution: 'somewhere',
  rules,
})

const expectConfigFailure = (source: unknown, origin: string): void => {
  try {
    loadPack(source, origin)
  } catch (error) {
    if (!(error instanceof HogwashError)) throw error
    // `error` is now HogwashError; no cast needed below.
    const failure = error.failure
    expect(failure.kind).toBe('config')
    expect(failure.message).toContain(origin)
    return
  }
  throw new Error('loadPack did not throw')
}

describe('loadPack', () => {
  it('materialises every default on a minimal lexical rule', () => {
    const pack = loadPack(packWith(validRule), 'origin.json')
    const rule = pack.rules[0]
    if (rule === undefined || rule.engine !== 'lexical') throw new Error('no lexical rule')
    expect(rule.registers).toEqual({ technical: 1, prose: 1, marketing: 1 })
    expect(rule.flags).toEqual([])
    expect(rule.replacements).toEqual([])
    expect(rule.deprecated).toBe(false)
    expect(rule.reliable).toBe(false)
    expect(rule.gated).toBe(null)
  })

  it('fills the unspecified register multipliers', () => {
    const pack = loadPack(packWith({ ...validRule, registers: { marketing: 0.5 } }), 'origin.json')
    const first = pack.rules[0]
    expect(first?.engine === 'lexical' ? first.registers : null).toEqual({
      technical: 1,
      prose: 1,
      marketing: 0.5,
    })
  })

  it('rejects a rule with no matching example', () => {
    expectConfigFailure(packWith({ ...validRule, examples: { matching: [] } }), 'origin.json')
  })

  it('rejects a pattern that is not a valid regular expression', () => {
    expectConfigFailure(packWith({ ...validRule, pattern: '(' }), 'origin.json')
  })

  it('parses a replacement table', () => {
    const pack = loadPack(
      packWith({ ...validRule, replacements: [{ when: 'delve', text: 'look' }] }),
      'origin.json',
    )
    const rule = pack.rules[0]
    if (rule === undefined || rule.engine !== 'lexical') throw new Error('no lexical rule')
    expect(rule.replacements[0]).toEqual({ when: 'delve', text: 'look' })
  })

  it('rejects an uncompilable replacement pattern', () => {
    try {
      loadPack(packWith({ ...validRule, replacements: [{ when: '(', text: 'x' }] }), 'origin.json')
    } catch (error) {
      if (!(error instanceof HogwashError)) throw error
      expect(error.failure.message).toContain('replacements')
      return
    }
    throw new Error('loadPack did not throw')
  })

  it('rejects the global flag as pack data', () => {
    expectConfigFailure(packWith({ ...validRule, flags: ['g'] }), 'origin.json')
  })

  it('rejects an engine outside the union', () => {
    expectConfigFailure(packWith({ ...validRule, engine: 'stylometric' }), 'origin.json')
  })

  it('rejects a structural rule without a check', () => {
    const { check: _dropped, ...withoutCheck } = validStructuralRule
    expectConfigFailure(packWith(withoutCheck), 'origin.json')
  })

  it('rejects a structural rule whose check is not a known one', () => {
    expectConfigFailure(packWith({ ...validStructuralRule, check: 'no-such-check' }), 'origin.json')
  })

  it('accepts a structural rule and carries no pattern on it', () => {
    const pack = loadPack(packWith(validStructuralRule), 'origin.json')
    const rule = pack.rules[0]
    if (rule === undefined) throw new Error('no rule')
    expect(rule.engine).toBe('structural')
    expect('pattern' in rule).toBe(false)
  })

  it('rejects a rule whose weight is zero', () => {
    expectConfigFailure(packWith({ ...validRule, weight: 0 }), 'origin.json')
  })
})

describe('compileRule', () => {
  it('adds the global flag to the pack flags', () => {
    const rule = LexicalRuleSchema.parse({ ...validRule, pattern: 'a', flags: ['i', 'm'] })
    expect(compileRule(rule).flags).toBe('gim')
  })
})

const validStylometricRule = {
  id: 'rhythm.x',
  category: 'rhythm',
  engine: 'stylometric',
  severity: 'info',
  metric: 'contraction-rate',
  era: 'mixed',
  message: 'm',
  attribution: 'a',
  baselines: { technical: 0, prose: 1, marketing: 1.5 },
}

describe('StylometricRuleSchema', () => {
  it('accepts a well-formed stylometric rule and applies the defaults', () => {
    const parsed = RuleSchema.parse(validStylometricRule)
    expect(parsed.deprecated).toBe(false)
    expect(parsed.gated).toBe(null)
  })

  it('rejects a severity other than info', () => {
    expect(RuleSchema.safeParse({ ...validStylometricRule, severity: 'warning' }).success).toBe(
      false,
    )
  })

  it('rejects baselines missing a register', () => {
    expect(
      RuleSchema.safeParse({
        ...validStylometricRule,
        baselines: { technical: 0, prose: 1 },
      }).success,
    ).toBe(false)
  })

  it('rejects an unknown metric', () => {
    expect(RuleSchema.safeParse({ ...validStylometricRule, metric: 'burstiness' }).success).toBe(
      false,
    )
  })
})
