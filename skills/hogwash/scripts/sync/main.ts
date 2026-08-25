#!/usr/bin/env bun
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createSdkQuery } from '../adapters/claude-sdk.js'
import { openCodexTransport } from '../adapters/codex-app-server.js'
import { createCodexQuery } from '../adapters/codex-client.js'
import type { AgentQuery } from '../adapters/types.js'
import { HogwashError } from '../errors.js'
import { loadBundledPacks } from '../rules/packs.js'
import { runAll, selectedSources } from './all.js'
import type { SyncArgs, SyncFamily } from './args.js'
import { parseSyncArgs } from './args.js'
import type { Drafter } from './draft.js'
import { createDrafter } from './draft.js'
import { renderPrBody } from './pr.js'
import type { SyncOutcome } from './run.js'
import { runSync } from './run.js'
import type { SourcePart, SyncSource } from './source.js'
import { USER_AGENT } from './source.js'
import { writeJson } from './write.js'

const queryFor = (family: SyncFamily): AgentQuery => {
  switch (family) {
    case 'claude':
      return createSdkQuery()
    case 'codex':
      return createCodexQuery(openCodexTransport)
  }
}

const fetchPart = async (part: SourcePart): Promise<string> => {
  const response = await fetch(part.url, {
    headers: { 'user-agent': USER_AGENT, accept: part.accept },
  })
  if (!response.ok) throw new Error(`The page request failed with status ${response.status}.`)
  if (!part.gzip) return await response.text()
  // A server that already applied Content-Encoding: gzip hands back plain
  // text, so the magic number decides, not the part flag.
  const bytes = Buffer.from(await response.arrayBuffer())
  const gzipped = bytes[0] === 0x1f && bytes[1] === 0x8b
  return (gzipped ? gunzipSync(bytes) : bytes).toString('utf8')
}

const fetchBodies = (source: SyncSource) => async (): Promise<readonly string[]> => {
  const bodies: string[] = []
  if (source.fetch.kind === 'fixed') {
    for (const part of source.fetch.parts) bodies.push(await fetchPart(part))
    return bodies
  }
  const indexBody = await fetchPart(source.fetch.index)
  bodies.push(indexBody)
  for (const part of source.fetch.expand(indexBody)) bodies.push(await fetchPart(part))
  return bodies
}

// A structured source resolves before anything agent-shaped, and no drafter is
// ever constructed for it: spec §6.1 says no agent exists in that path.
const runFor = (
  args: SyncArgs,
  draft: Drafter | null,
): ((source: SyncSource) => Promise<SyncOutcome>) => {
  const packs = loadBundledPacks()
  return (source) =>
    runSync({
      family: args.family,
      mode: source.kind === 'prose' && args.detectOnly ? 'detect' : 'write',
      source,
      packs,
      fetchBodies: fetchBodies(source),
      readSnapshot: () =>
        existsSync(source.snapshotPath) ? readFileSync(source.snapshotPath, 'utf8') : null,
      writeSnapshot: (text) => writeFileSync(source.snapshotPath, text),
      writeProposal: writeJson(source.proposalPath),
      readPack: () => (existsSync(source.packPath) ? readFileSync(source.packPath, 'utf8') : null),
      writePack: writeJson(source.packPath),
      draft,
      log: (line) => console.error(line),
    })
}

try {
  const args = parseSyncArgs(process.argv.slice(2))
  const sources = selectedSources(args.selection)
  const anyProse = sources.some((source) => source.kind === 'prose')
  if (!anyProse) {
    if (args.familyGiven) {
      console.error('--family applies to prose sources only, and was ignored.')
    }
    if (args.detectOnly) {
      console.error('--detect-only applies to prose sources only, and was ignored.')
    }
  }

  let draft: Drafter | null = null
  if (anyProse && !args.detectOnly) {
    const query = queryFor(args.family)
    try {
      const reply = await query({ systemPrompt: '', prompt: 'Answer with the single word ready.' })
      if (reply.trim().length === 0) throw new Error('the query returned an empty reply')
      draft = createDrafter(query)
    } catch (error) {
      console.error(
        `The ${args.family} agent is not available: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  const outcome = await runAll({
    sources,
    run: runFor(args, draft),
    report: (line) => console.log(line),
  })
  if (args.prBodyPath !== null) writeFileSync(args.prBodyPath, renderPrBody(outcome.results))
  process.exitCode = outcome.exitCode
} catch (error) {
  if (!(error instanceof HogwashError)) throw error
  console.error(error.message)
  process.exitCode = 2
}
