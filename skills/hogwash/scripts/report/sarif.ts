import type { LoadedRule } from '../rules/packs.js'
import type { Register, Report, ReportFinding, Severity, Threshold } from '../types.js'
import type { Document } from './build.js'

export type SarifLevel = 'error' | 'warning' | 'note'

export type SarifRegion = {
  readonly startLine: number
  readonly startColumn: number
  readonly endLine: number
  readonly endColumn: number
  readonly charOffset: number
  readonly charLength: number
  readonly snippet: { readonly text: string }
}

export type SarifResult = {
  readonly ruleId: string
  readonly level: SarifLevel
  readonly message: { readonly text: string }
  readonly locations: readonly [
    {
      readonly physicalLocation: {
        readonly artifactLocation: { readonly uri: string; readonly uriBaseId: '%SRCROOT%' }
        readonly region: SarifRegion
      }
    },
  ]
  readonly properties: {
    readonly actionable: boolean
    readonly engine: string
    readonly category: string
  }
}

export type SarifReportingDescriptor = {
  readonly id: string
  readonly name: string
  readonly shortDescription: { readonly text: string }
  readonly defaultConfiguration: { readonly level: SarifLevel }
  readonly properties: {
    readonly category: string
    readonly engine: string
    readonly era: string
    readonly attribution: string
    readonly packAttribution: string
  }
}

export type SarifLog = {
  readonly $schema: string
  readonly version: '2.1.0'
  readonly runs: readonly [
    {
      readonly tool: {
        readonly driver: {
          readonly name: 'hogwash'
          readonly informationUri: string
          readonly rules: readonly SarifReportingDescriptor[]
        }
      }
      readonly results: readonly SarifResult[]
      readonly properties: {
        readonly register: Register
        readonly threshold: Threshold
        readonly createdAt: string
      }
    },
  ]
}

export const SARIF_SCHEMA_URL = 'https://json.schemastore.org/sarif-2.1.0.json'
export const SARIF_INFORMATION_URI = 'https://www.npmjs.com/package/hogwash'

const levelOf = (severity: Severity): SarifLevel =>
  severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'note'

const regionOf = (finding: ReportFinding): SarifRegion => ({
  startLine: finding.location.start.line,
  startColumn: finding.location.start.column,
  endLine: finding.location.end.line,
  endColumn: finding.location.end.column,
  charOffset: finding.start,
  charLength: finding.end - finding.start,
  snippet: { text: finding.match },
})

const descriptorOf = (loaded: LoadedRule): SarifReportingDescriptor => ({
  id: loaded.rule.id,
  name: loaded.rule.id,
  shortDescription: { text: loaded.rule.message },
  defaultConfiguration: { level: levelOf(loaded.rule.severity) },
  properties: {
    category: loaded.rule.category,
    engine: loaded.rule.engine,
    era: loaded.rule.era,
    attribution: loaded.rule.attribution,
    packAttribution: loaded.packAttribution,
  },
})

export function buildSarif(
  report: Report,
  _documents: readonly Document[],
  rules: readonly LoadedRule[],
): SarifLog {
  const known = new Map(rules.map((loaded) => [String(loaded.rule.id), loaded]))
  const results: SarifResult[] = report.files.flatMap((file) =>
    file.findings.map((finding) => ({
      ruleId: finding.ruleId,
      level: levelOf(finding.severity),
      message: { text: finding.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: file.path.replaceAll('\\', '/'), uriBaseId: '%SRCROOT%' },
            region: regionOf(finding),
          },
        },
      ],
      properties: {
        actionable: finding.actionable,
        engine: finding.engine,
        category: finding.category,
      },
    })),
  )
  const descriptors: SarifReportingDescriptor[] = []
  const seen = new Set<string>()
  for (const result of results) {
    if (seen.has(result.ruleId)) continue
    const loaded = known.get(result.ruleId)
    if (loaded === undefined) continue
    seen.add(result.ruleId)
    descriptors.push(descriptorOf(loaded))
  }
  return {
    $schema: SARIF_SCHEMA_URL,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: { name: 'hogwash', informationUri: SARIF_INFORMATION_URI, rules: descriptors },
        },
        results,
        properties: {
          register: report.register,
          threshold: report.threshold,
          createdAt: report.createdAt,
        },
      },
    ],
  }
}

export const renderSarif = (log: SarifLog): string => `${JSON.stringify(log, null, 2)}\n`
