import { acceptCandidate, requireCandidate } from './candidate.js'
import { reportFailure, runReport } from './command.js'
import type { Command } from './commands.js'
import type { Config } from './config.js'
import { applyOverrides, banListPath, loadConfigDetailed } from './config.js'
import { runConsult } from './consult.js'
import { HogwashError } from './errors.js'
import { installHook } from './hook/install.js'
import { preCommitScript } from './hook/script.js'
import { initProject } from './init.js'
import { profileCandidates } from './profile.js'
import { type ProgressCommand, reportProgress } from './progress.js'
import { loadBanList, loadBanListIfPresent } from './rules/banlist.js'
import { renderRuleExplanation, renderRuleList } from './rules/explain.js'
import type { LoadedRule } from './rules/packs.js'
import { loadBundledPacks, selectRules } from './rules/packs.js'
import { runScan } from './scan/run.js'
import type { ScanFormat, Shell } from './shell.js'
import type { ExitCode, ModelFamily, Register, Threshold } from './types.js'
import { ModelFamilySchema, RegisterSchema, ThresholdSchema } from './types.js'

export type { Command, ScanCommand } from './commands.js'
export type { HookAction, ReportFormat, ScanFormat, Shell } from './shell.js'

const USAGE =
  'usage: bun scripts/hogwash.ts scan [--output <terminal|json|sarif>] [--json] [--sarif]\n' +
  '                                   [--verbose] [--short] [--register <name>] [--threshold <n>] <files...>\n' +
  '       bun scripts/hogwash.ts consult --family <claude|codex|gemini> <candidate>\n' +
  '       bun scripts/hogwash.ts diff <original>\n' +
  '       bun scripts/hogwash.ts accept --approved <original>\n' +
  '       bun scripts/hogwash.ts rules [--explain <rule-id>]\n' +
  '       bun scripts/hogwash.ts report [--md]\n' +
  '       bun scripts/hogwash.ts hook [--install]\n' +
  '       bun scripts/hogwash.ts init'

const usageFailure = (): never => {
  throw new HogwashError({ kind: 'usage', message: USAGE })
}

const parseRegister = (value: string | undefined): Register => {
  const result = RegisterSchema.safeParse(value)
  return result.success ? result.data : usageFailure()
}

const parseThreshold = (value: string | undefined): Threshold => {
  const parsed = value === undefined ? Number.NaN : Number(value)
  const result = ThresholdSchema.safeParse(Number.isFinite(parsed) ? parsed : undefined)
  return result.success ? result.data : usageFailure()
}

const parseScanOutput = (value: string | undefined): ScanFormat => {
  switch (value) {
    case 'terminal':
    case 'json':
    case 'sarif':
      return value
    default:
      return usageFailure()
  }
}

const parseScan = (rest: readonly string[]): Command => {
  const files: string[] = []
  let format: ScanFormat = 'terminal'
  let alias = false
  let output = false
  let verbose = false
  let short = false
  let register: Register | null = null
  let threshold: Threshold | null = null
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (argument === '--json' || argument === '--sarif') {
      format = argument === '--json' ? 'json' : 'sarif'
      alias = true
    } else if (argument === '--output') {
      index += 1
      format = parseScanOutput(rest[index])
      output = true
    } else if (argument === '--verbose') {
      verbose = true
    } else if (argument === '--short') {
      short = true
    } else if (argument === '--register') {
      register = parseRegister(rest[++index])
    } else if (argument === '--threshold') {
      threshold = parseThreshold(rest[++index])
    } else if (argument === undefined || argument.startsWith('-')) {
      return usageFailure()
    } else {
      files.push(argument)
    }
  }
  if (files.length === 0 || (alias && output)) return usageFailure()
  return { kind: 'scan', files, format, verbose, overrides: { register, threshold, short } }
}

const parseFamily = (value: string | undefined): ModelFamily => {
  const result = ModelFamilySchema.safeParse(value)
  return result.success ? result.data : usageFailure()
}

const parseConsult = (rest: readonly string[]): Command => {
  if (rest.length !== 3 || rest[0] !== '--family') return usageFailure()
  const candidate = rest[2]
  if (candidate === undefined || candidate.startsWith('-')) return usageFailure()
  return { kind: 'consult', family: parseFamily(rest[1]), candidate }
}

const parseOnePath = (kind: 'diff', rest: readonly string[]): Command => {
  const [original, ...extra] = rest
  if (original === undefined || original.startsWith('-') || extra.length > 0) return usageFailure()
  return { kind, original }
}

const parseAccept = (rest: readonly string[]): Command => {
  if (rest.length !== 2 || rest[0] !== '--approved') return usageFailure()
  const original = rest[1]
  if (original === undefined || original.startsWith('-')) return usageFailure()
  return { kind: 'accept', original, approved: true }
}

const parseRules = (rest: readonly string[]): Command => {
  if (rest.length === 0) return { kind: 'rules', explain: null }
  const [flag, id, ...extra] = rest
  if (flag !== '--explain' || id === undefined || extra.length > 0) return usageFailure()
  return { kind: 'rules', explain: id }
}

const parseReport = (rest: readonly string[]): Command => {
  if (rest.length === 0) return { kind: 'report', format: 'terminal' }
  return rest.length === 1 && rest[0] === '--md' ? { kind: 'report', format: 'md' } : usageFailure()
}

const parseHook = (rest: readonly string[]): Command => {
  if (rest.length === 0) return { kind: 'hook', action: 'print' }
  return rest.length === 1 && rest[0] === '--install'
    ? { kind: 'hook', action: 'install' }
    : usageFailure()
}

export function parseArgs(argv: readonly string[]): Command {
  const [command, ...rest] = argv
  switch (command) {
    case 'scan':
      return parseScan(rest)
    case 'consult':
      return parseConsult(rest)
    case 'diff':
      return parseOnePath('diff', rest)
    case 'accept':
      return parseAccept(rest)
    case 'rules':
      return parseRules(rest)
    case 'report':
      return parseReport(rest)
    case 'hook':
      return parseHook(rest)
    case 'init':
      return rest.length === 0 ? { kind: 'init' } : usageFailure()
    default:
      return usageFailure()
  }
}

async function loadRules(
  shell: Shell,
  config: Config,
  banListRequired: boolean,
): Promise<readonly LoadedRule[]> {
  const candidates = profileCandidates(shell.cwd, banListPath(config), shell.home)
  const banPack = banListRequired
    ? await loadBanList(candidates)
    : await loadBanListIfPresent(candidates)
  return selectRules([...loadBundledPacks(), ...(banPack === null ? [] : [banPack])], {
    packs: banPack === null ? [...config.packs] : [...config.packs, banPack.name],
    gates: config.gates,
    deprecated: config.includeDeprecatedRules,
  })
}

async function runDiff(original: string, config: Config, shell: Shell): Promise<void> {
  const candidate = await requireCandidate(original)
  const viewer = config.workflow.diff
  if (viewer === null) {
    throw new HogwashError({ kind: 'config', message: 'workflow.diff is not configured.' })
  }
  await shell.runProcess(viewer.command, [...viewer.args, original, candidate], viewer.wait)
}

export async function run(argv: readonly string[], shell: Shell): Promise<ExitCode> {
  try {
    const command = parseArgs(argv)
    if (command.kind === 'init') {
      for (const path of await initProject(shell.cwd)) shell.stdout(path)
      return 0
    }
    const progressCommand: ProgressCommand | null = command.kind === 'scan' ? 'scan' : null
    if (progressCommand !== null) {
      reportProgress(shell, progressCommand, 'loading configuration', 'info')
    }
    const { config, fromFile } = await loadConfigDetailed(shell.cwd)
    if (progressCommand !== null && !fromFile) {
      reportProgress(shell, progressCommand, 'no hogwash.json; scanning with defaults', 'info')
    }
    switch (command.kind) {
      case 'report':
        return await runReport(command.format, shell)
      case 'hook':
        shell.stdout(
          command.action === 'install' ? await installHook(shell.cwd) : preCommitScript(),
        )
        return 0
      case 'scan': {
        reportProgress(shell, 'scan', 'loading rules', 'info')
        const effective = applyOverrides(config, command.overrides)
        return await runScan({
          command,
          config: effective,
          selected: await loadRules(shell, effective, fromFile),
          shell,
        })
      }
      case 'consult':
        await runConsult({ ...command, config, shell })
        return 0
      case 'diff':
        await runDiff(command.original, config, shell)
        return 0
      case 'accept':
        shell.stdout(await acceptCandidate(command.original))
        return 0
      case 'rules': {
        const selected = await loadRules(shell, config, fromFile)
        shell.stdout(
          command.explain === null
            ? renderRuleList(selected)
            : renderRuleExplanation(selected, command.explain),
        )
        return 0
      }
    }
  } catch (error) {
    return reportFailure(error, shell.stderr)
  }
}
