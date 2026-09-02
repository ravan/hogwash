import { acceptCandidate, candidatePath, requireCandidate } from './candidate.js'
import { reportFailure, runReport } from './command.js'
import type { AcceptCommand, Command } from './commands.js'
import type { Config } from './config.js'
import { applyOverrides, banListPath, loadConfigDetailed } from './config.js'
import { runConsult } from './consult.js'
import { HogwashError } from './errors.js'
import { installHook } from './hook/install.js'
import { preCommitScript } from './hook/script.js'
import { initProject } from './init.js'
import { readDocuments } from './io.js'
import { idiolectHomeOf, profileCandidates } from './profile.js'
import { type ProgressCommand, reportProgress } from './progress.js'
import { runRedline } from './redline/run.js'
import { buildReport, hasActionable } from './report/build.js'
import { renderTerminal } from './report/render.js'
import { removeBaseline } from './report/store.js'
import { loadBanList, loadBanListIfPresent } from './rules/banlist.js'
import { renderRuleExplanation, renderRuleList } from './rules/explain.js'
import type { LoadedRule } from './rules/packs.js'
import {
  lexicalRules,
  loadBundledPacks,
  selectRules,
  structuralRules,
  stylometricRules,
} from './rules/packs.js'
import { runScan } from './scan/run.js'
import type { ScanFormat, Shell } from './shell.js'
import type { ExitCode, ModelFamily, Register, Severity, Threshold } from './types.js'
import { ModelFamilySchema, RegisterSchema, SeveritySchema, ThresholdSchema } from './types.js'
import { addWaiver, readWaivers } from './waivers.js'

export type { Command, ScanCommand } from './commands.js'
export type { HookAction, ReportFormat, ScanFormat, Shell } from './shell.js'

const USAGE =
  'usage: bun scripts/hogwash.ts scan [--output <terminal|json|sarif>] [--json] [--sarif]\n' +
  '                                   [--verbose] [--short] [--register <name>] [--threshold <n>]\n' +
  '                                   [--fail-on <info|warning|error>] [--baseline] <files...>\n' +
  '       bun scripts/hogwash.ts waive --rule <id> --match <text> --reason <text> [--line <n>] <original>\n' +
  '       bun scripts/hogwash.ts consult --family <claude|codex> <candidate>\n' +
  '       bun scripts/hogwash.ts diff <original>\n' +
  '       bun scripts/hogwash.ts diff-report [--notes <json>] [--out <html>] [--register <name>]\n' +
  '                                          [--open] <original>\n' +
  '       bun scripts/hogwash.ts accept --approved [--register <name>] <original>\n' +
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

const parseSeverity = (value: string | undefined): Severity => {
  const result = SeveritySchema.safeParse(value)
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
  let failOn: Severity | null = null
  let baseline = false
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (argument === '--baseline') {
      baseline = true
    } else if (argument === '--json' || argument === '--sarif') {
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
    } else if (argument === '--fail-on') {
      failOn = parseSeverity(rest[++index])
    } else if (argument === undefined || argument.startsWith('-')) {
      return usageFailure()
    } else {
      files.push(argument)
    }
  }
  if (files.length === 0 || (alias && output)) return usageFailure()
  return {
    kind: 'scan',
    files,
    format,
    verbose,
    failOn,
    baseline,
    overrides: { register, threshold, short },
  }
}

const parseWaive = (rest: readonly string[]): Command => {
  const files: string[] = []
  let rule: string | null = null
  let match: string | null = null
  let reason: string | null = null
  let line: number | null = null
  const value = (index: number): string => {
    const argument = rest[index]
    return argument === undefined || argument.length === 0 ? usageFailure() : argument
  }
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (argument === '--rule') {
      rule = value(++index)
    } else if (argument === '--match') {
      match = value(++index)
    } else if (argument === '--reason') {
      reason = value(++index)
    } else if (argument === '--line') {
      const parsed = Number(value(++index))
      if (!Number.isInteger(parsed) || parsed < 1) return usageFailure()
      line = parsed
    } else if (argument === undefined || argument.startsWith('-')) {
      return usageFailure()
    } else {
      files.push(argument)
    }
  }
  const [original] = files
  if (original === undefined || files.length > 1) return usageFailure()
  if (rule === null || match === null || reason === null) return usageFailure()
  return { kind: 'waive', original, rule, match, reason, line }
}

const parseRedline = (rest: readonly string[]): Command => {
  const files: string[] = []
  let notes: string | null = null
  let out: string | null = null
  let register: Register | null = null
  let open = false
  const value = (rest: readonly string[], index: number): string => {
    const argument = rest[index]
    return argument === undefined || argument.startsWith('-') ? usageFailure() : argument
  }
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (argument === '--notes') {
      notes = value(rest, ++index)
    } else if (argument === '--out') {
      out = value(rest, ++index)
    } else if (argument === '--register') {
      register = parseRegister(rest[++index])
    } else if (argument === '--open') {
      open = true
    } else if (argument === undefined || argument.startsWith('-')) {
      return usageFailure()
    } else {
      files.push(argument)
    }
  }
  const [original] = files
  if (original === undefined || files.length > 1) return usageFailure()
  return { kind: 'redline', original, notes, out, register, open }
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
  const files: string[] = []
  let approved = false
  let register: Register | null = null
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index]
    if (argument === '--approved') {
      approved = true
    } else if (argument === '--register') {
      register = parseRegister(rest[++index])
    } else if (argument === undefined || argument.startsWith('-')) {
      return usageFailure()
    } else {
      files.push(argument)
    }
  }
  const [original] = files
  if (!approved || original === undefined || files.length > 1) return usageFailure()
  return { kind: 'accept', original, approved: true, register }
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
    case 'diff-report':
      return parseRedline(rest)
    case 'waive':
      return parseWaive(rest)
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
  const candidates = profileCandidates(shell.cwd, banListPath(config), idiolectHomeOf(shell))
  const found = banListRequired
    ? await loadBanList(candidates)
    : await loadBanListIfPresent(candidates)
  if (found !== null && found.pack === null) {
    shell.stderr(
      `The ban list ${found.path} holds no entries; scanning without bans. Write one bulleted line for each banned word or phrase.`,
    )
  }
  const banPack = found?.pack ?? null
  return selectRules([...loadBundledPacks(), ...(banPack === null ? [] : [banPack])], {
    packs: banPack === null ? [...config.packs] : [...config.packs, banPack.name],
    gates: config.gates,
    deprecated: config.includeDeprecatedRules,
  })
}

/**
 * The acceptance gate. The candidate is scanned one last time, in memory, with
 * the owner's waivers honoured. Anything still actionable keeps the original in
 * place and comes back as exit 1 with the findings on stdout. A clean candidate
 * replaces the original and its frozen baseline is removed.
 */
async function runAccept(
  command: AcceptCommand,
  config: Config,
  selected: readonly LoadedRule[],
  shell: Shell,
): Promise<ExitCode> {
  const candidate = await requireCandidate(command.original)
  const documents = await readDocuments([candidate])
  const report = buildReport(
    documents,
    {
      lexical: lexicalRules(selected),
      stylometric: stylometricRules(selected),
      structural: structuralRules(selected),
    },
    config,
    shell.now(),
    { waivers: await readWaivers(shell.cwd), cwd: shell.cwd },
  )
  if (hasActionable(report)) {
    shell.stdout(renderTerminal(report, { color: shell.color === true }))
    shell.stderr(
      `${candidate} still has actionable findings; the original is unchanged. Resolve or waive them, then ask for acceptance again.`,
    )
    return 1
  }
  shell.stdout(await acceptCandidate(command.original))
  if (await removeBaseline(shell.cwd, command.original)) {
    shell.stderr(`Removed the frozen baseline for ${command.original}.`)
  }
  return 0
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
          command.action === 'install'
            ? await installHook(shell.cwd, shell.scriptPath)
            : preCommitScript(shell.scriptPath),
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
      case 'redline': {
        const effective = applyOverrides(config, {
          register: command.register,
          threshold: null,
          short: false,
        })
        shell.stdout(
          await runRedline({
            command,
            config: effective,
            selected: await loadRules(shell, effective, fromFile),
            shell,
          }),
        )
        return 0
      }
      case 'waive': {
        const written = await addWaiver(shell.cwd, {
          file: command.original,
          rule: command.rule,
          match: command.match,
          reason: command.reason,
          line: command.line,
        })
        shell.stdout(
          `${written.path}: ${written.total} waiver${written.total === 1 ? '' : 's'}; ${command.rule} "${command.match}" on ${command.original} (also covers ${candidatePath(command.original)})`,
        )
        return 0
      }
      case 'accept': {
        const effective = applyOverrides(config, {
          register: command.register,
          threshold: null,
          short: false,
        })
        return await runAccept(
          command,
          effective,
          await loadRules(shell, effective, fromFile),
          shell,
        )
      }
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
