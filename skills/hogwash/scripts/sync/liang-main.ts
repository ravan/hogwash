#!/usr/bin/env bun
import { readFileSync } from 'node:fs'
import { HogwashError } from '../errors.js'
import { loadBundledPacks } from '../rules/packs.js'
import {
  importLiangTables,
  LIANG_PACK_PATH,
  LIANG_PROPOSAL_PATH,
  LIANG_TABLES_PATH,
} from './liang.js'
import { writeJson } from './write.js'

try {
  const result = importLiangTables(
    readFileSync(LIANG_TABLES_PATH, 'utf8'),
    readFileSync(LIANG_PACK_PATH, 'utf8'),
    loadBundledPacks(),
  )
  if (result.kind === 'invalid') {
    console.error(`The Liang import failed: ${result.reason}`)
    process.exitCode = 2
  } else {
    writeJson(LIANG_PACK_PATH)(result.packText)
    writeJson(LIANG_PROPOSAL_PATH)(result.proposalText)
    console.log(
      `${result.accepted} edits accepted, ${result.duplicates} duplicates, ${result.dropped} dropped. Wrote ${LIANG_PACK_PATH}: +${result.counts.added} rules.`,
    )
  }
} catch (error) {
  if (!(error instanceof HogwashError)) throw error
  console.error(error.message)
  process.exitCode = 2
}
