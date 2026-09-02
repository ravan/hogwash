import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { requireCandidate } from '../candidate.js'
import type { RedlineCommand } from '../commands.js'
import type { Config } from '../config.js'
import { HogwashError } from '../errors.js'
import { readDocuments } from '../io.js'
import { buildReport } from '../report/build.js'
import type { LoadedRule } from '../rules/packs.js'
import { lexicalRules, structuralRules, stylometricRules } from '../rules/packs.js'
import type { Shell } from '../shell.js'
import { readWaivers } from '../waivers.js'
import { computeHunks } from './align.js'
import { buildView, renderRedline } from './html.js'
import { emptyNotes, readNotes } from './notes.js'

/** Scan both files, diff them, render the standalone HTML redline; returns the path written. */
export async function runRedline(input: {
  readonly command: RedlineCommand
  readonly config: Config
  readonly selected: readonly LoadedRule[]
  readonly shell: Shell
}): Promise<string> {
  const { command, config, selected, shell } = input
  const candidate = await requireCandidate(command.original)
  const documents = await readDocuments([command.original, candidate])
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
  const [originalDoc, candidateDoc] = documents
  const [originalFile, candidateFile] = report.files
  if (
    originalDoc === undefined ||
    candidateDoc === undefined ||
    originalFile === undefined ||
    candidateFile === undefined
  ) {
    throw new HogwashError({ kind: 'io', path: command.original, message: 'could not be scanned' })
  }
  const notes = command.notes === null ? emptyNotes() : await readNotes(command.notes)
  const view = buildView({
    originalPath: command.original,
    candidatePath: candidate,
    register: config.register,
    threshold: config.threshold,
    original: originalFile,
    candidate: candidateFile,
    hunks: computeHunks(originalDoc.text, candidateDoc.text),
    notes,
  })
  const stem = basename(command.original, extname(command.original))
  const display = command.out ?? join('.hogwash', `${stem}-diff.html`)
  const target = isAbsolute(display) || command.out !== null ? display : join(shell.cwd, display)
  try {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, renderRedline(view), 'utf8')
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path: target,
      message: error instanceof Error ? error.message : 'could not be written',
    })
  }
  if (command.open) {
    const opener = browserOpener(process.platform)
    await shell.runProcess(opener.command, [...opener.args, target], false)
  }
  return display
}

/** The platform command that hands a file to the default browser. */
export const browserOpener = (
  platform: NodeJS.Platform,
): { readonly command: string; readonly args: readonly string[] } =>
  platform === 'darwin'
    ? { command: 'open', args: [] }
    : platform === 'win32'
      ? { command: 'cmd', args: ['/c', 'start', ''] }
      : { command: 'xdg-open', args: [] }
