import { z } from 'zod'

export const RuleIdSchema = z.string().min(1).brand<'RuleId'>()
export type RuleId = z.infer<typeof RuleIdSchema>

/** Index into the decoded file text, in UTF-16 code units. */
export const RawOffsetSchema = z.number().int().nonnegative().brand<'RawOffset'>()
export type RawOffset = z.infer<typeof RawOffsetSchema>

export const CategorySchema = z.enum(['vocabulary', 'structure', 'rhythm', 'formatting', 'residue'])
export type Category = z.infer<typeof CategorySchema>

export const SeveritySchema = z.enum(['info', 'warning', 'error'])
export type Severity = z.infer<typeof SeveritySchema>

export const EngineSchema = z.enum(['lexical', 'stylometric', 'structural'])
export type Engine = z.infer<typeof EngineSchema>

export const RegisterSchema = z.enum(['technical', 'prose', 'marketing'])
export type Register = z.infer<typeof RegisterSchema>

export const DensitySchema = z.number().nonnegative().brand<'Density'>()
export type Density = z.infer<typeof DensitySchema>

export const ThresholdSchema = z.number().nonnegative().brand<'Threshold'>()
export type Threshold = z.infer<typeof ThresholdSchema>

export const WordCountSchema = z.number().int().nonnegative().brand<'WordCount'>()
export type WordCount = z.infer<typeof WordCountSchema>

export const PackNameSchema = z.string().min(1).brand<'PackName'>()
export type PackName = z.infer<typeof PackNameSchema>

/** The families that have a consultation adapter. */
export const ModelFamilySchema = z.enum(['claude', 'codex'])
export type ModelFamily = z.infer<typeof ModelFamilySchema>

export const PositionSchema = z.strictObject({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
})
export type Position = z.infer<typeof PositionSchema>

/** A report location. `end` is the first position after the match. */
export const LocationSchema = z.strictObject({
  start: PositionSchema,
  end: PositionSchema,
})
export type Location = z.infer<typeof LocationSchema>

/** One deterministic scanner result before line and column positions are attached. */
export const FindingSchema = z.strictObject({
  ruleId: RuleIdSchema,
  start: RawOffsetSchema,
  end: RawOffsetSchema,
  match: z.string().min(1),
  category: CategorySchema,
  severity: SeveritySchema,
  engine: EngineSchema,
  message: z.string().min(1),
  effectiveWeight: z.number().nonnegative(),
  suggestion: z.string().nullable(),
  actionable: z.boolean(),
})
export type Finding = z.infer<typeof FindingSchema>

/**
 * A finding with its position, and whether the owner waived this occurrence
 * (see waivers.ts). A waived finding stays visible, weighs nothing and is not
 * actionable.
 */
export const ReportFindingSchema = FindingSchema.extend({
  location: LocationSchema,
  waived: z.boolean().default(false),
})
export type ReportFinding = z.infer<typeof ReportFindingSchema>

export const FileReportSchema = z.strictObject({
  path: z.string().min(1),
  words: WordCountSchema,
  density: DensitySchema,
  /** Digest of the actionable findings as a (rule, normalised match) multiset; see report/fingerprint.ts. */
  fingerprint: z.string().regex(/^[0-9a-f]{16}$/),
  findings: z.array(ReportFindingSchema),
})
export type FileReport = z.infer<typeof FileReportSchema>

export const ReportSchema = z.strictObject({
  version: z.literal(7),
  /** ISO-8601 instant, supplied by the host. */
  createdAt: z.string().min(1),
  register: RegisterSchema,
  threshold: ThresholdSchema,
  files: z.array(FileReportSchema),
})
export type Report = z.infer<typeof ReportSchema>

export type ExitCode = 0 | 1 | 2
