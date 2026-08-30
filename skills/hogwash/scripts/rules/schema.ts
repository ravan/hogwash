import { z } from 'zod'
import { HogwashError } from '../errors.js'
import { CategorySchema, PackNameSchema, RuleIdSchema, SeveritySchema } from '../types.js'

export { type Engine, EngineSchema } from '../types.js'

export const EraSchema = z.enum([
  'gpt35',
  'gpt4',
  'gpt5',
  'claude',
  'gemini',
  'grok',
  'deepseek',
  'mixed',
])
export type Era = z.infer<typeof EraSchema>

/** Pack data carries only these flags; `g` is added by compileRule (spec §2.1.2). */
export const RegexFlagSchema = z.enum(['i', 'm', 'u'])
export type RegexFlag = z.infer<typeof RegexFlagSchema>

export const GateSchema = z.enum(['gpt', 'claude', 'gemini'])
export type Gate = z.infer<typeof GateSchema>

export const RegisterWeightsSchema = z
  .object({
    technical: z.number().nonnegative().default(1),
    prose: z.number().nonnegative().default(1),
    marketing: z.number().nonnegative().default(1),
  })
  .prefault({})
export type RegisterWeights = z.infer<typeof RegisterWeightsSchema>

export const RuleExamplesSchema = z.object({
  matching: z.array(z.string().min(1)).min(1),
  clean: z.array(z.string().min(1)).default([]),
})
export type RuleExamples = z.infer<typeof RuleExamplesSchema>

export const StylometricMetricSchema = z.enum([
  'sentence-uniformity',
  'sentence-opener-repetition',
  'paragraph-uniformity',
  'heading-uniformity',
  'lexical-diversity',
  'contraction-rate',
  'punctuation-density',
])
export type StylometricMetric = z.infer<typeof StylometricMetricSchema>

export const BaselinesSchema = z.object({
  technical: z.number().nonnegative(),
  prose: z.number().nonnegative(),
  marketing: z.number().nonnegative(),
})
export type Baselines = z.infer<typeof BaselinesSchema>

const commonFields = {
  id: RuleIdSchema,
  category: CategorySchema,
  era: EraSchema,
  deprecated: z.boolean().default(false),
  gated: GateSchema.nullable().default(null),
  message: z.string().min(1),
  attribution: z.string().min(1),
}

const catalogFields = {
  ...commonFields,
  severity: SeveritySchema,
  weight: z.number().positive(),
  registers: RegisterWeightsSchema,
  reliable: z.boolean().default(false),
  /**
   * A rule that reports but never counts. Loose patterns match legitimate prose
   * as often as machine prose, so every hit is a judgement call rather than a
   * finding. Carried as effectiveWeight 0, which is what keeps it out of the
   * density and off the exit code (§2.5.1).
   */
  advisory: z.boolean().default(false),
  examples: RuleExamplesSchema,
}

export const StylometricRuleSchema = z.object({
  ...commonFields,
  engine: z.literal('stylometric'),
  severity: z.literal('info'),
  metric: StylometricMetricSchema,
  baselines: BaselinesSchema,
})
export type StylometricRule = z.infer<typeof StylometricRuleSchema>

export const ReplacementSchema = z.object({
  /** Alternation source, anchored and matched case-insensitively against the finding's matched text. */
  when: z.string().min(1),
  /** Literal replacement text. Never a pattern, never a capture reference (§6.6). */
  text: z.string(),
})
export type Replacement = z.infer<typeof ReplacementSchema>

export const LexicalRuleSchema = z
  .object({
    ...catalogFields,
    engine: z.literal('lexical'),
    pattern: z.string().min(1),
    flags: z.array(RegexFlagSchema).default([]),
    replacements: z.array(ReplacementSchema).default([]),
  })
  .superRefine((rule, ctx) => {
    try {
      new RegExp(rule.pattern, rule.flags.join(''))
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['pattern'],
        message: 'must be a valid regular expression under its own flags',
      })
    }
    rule.replacements.forEach((entry, index) => {
      try {
        new RegExp(`^(?:${entry.when})$`, 'i')
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['replacements', index, 'when'],
          message: 'must be a valid regular expression',
        })
      }
    })
  })
export type LexicalRule = z.infer<typeof LexicalRuleSchema>

/**
 * A whole-document shape no single wording gives away, checked by code rather
 * than by a model. One check today: a heading in Title Case in a document whose
 * other headings are sentence case.
 */
export const StructuralCheckSchema = z.enum(['title-case-heading'])
export type StructuralCheck = z.infer<typeof StructuralCheckSchema>

export const StructuralRuleSchema = z.object({
  ...catalogFields,
  engine: z.literal('structural'),
  check: StructuralCheckSchema,
})
export type StructuralRule = z.infer<typeof StructuralRuleSchema>

export const RuleSchema = z.discriminatedUnion('engine', [
  LexicalRuleSchema,
  StylometricRuleSchema,
  StructuralRuleSchema,
])
export type Rule = z.infer<typeof RuleSchema>

export const RulePackSchema = z.object({
  name: PackNameSchema,
  version: z.string().min(1),
  attribution: z.string().min(1),
  rules: z.array(RuleSchema).min(1),
})
export type RulePack = z.infer<typeof RulePackSchema>

/** Parses untyped JSON at the I/O boundary; throws HogwashError{kind:'config'}. */
export function loadPack(source: unknown, origin: string): RulePack {
  const result = RulePackSchema.safeParse(source)
  if (result.success) return result.data
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
  throw new HogwashError({
    kind: 'config',
    message: `Invalid rule pack in ${origin}: ${issues}`,
  })
}

export function compileRule(rule: LexicalRule): RegExp {
  return new RegExp(rule.pattern, [...rule.flags, 'g'].join(''))
}
