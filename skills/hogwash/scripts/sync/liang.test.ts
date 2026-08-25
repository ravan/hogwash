import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { loadPack } from '../rules/schema.js'
import { importLiangTables, LIANG_ORIGIN } from './liang.js'

const tables = readFileSync('data/liang-2024-tables.tsv', 'utf8')
const packText = readFileSync('tests/fixtures/sync/liang-pack.json', 'utf8')
const packs = [loadPack(JSON.parse(packText), 'tests/fixtures/sync/liang-pack.json')]
const fixtureRules = JSON.parse(packText).rules.length

describe('LIANG_ORIGIN', () => {
  it('attributes every rule to the paper it was transcribed from', () => {
    expect(LIANG_ORIGIN.attribution('top 100 adverbs')).toBe(
      'Liang et al., ICML 2024, PMLR 235:29575, top 100 adverbs (ranked word list, transcribed with attribution)',
    )
    expect(LIANG_ORIGIN.pack).toBe('excess-vocab')
    expect(LIANG_ORIGIN.idPolicy).toEqual({ kind: 'prefixed', prefix: 'xv.' })
    expect(LIANG_ORIGIN.registers).toEqual({ technical: 1, prose: 1, marketing: 1 })
  })
})

describe('importLiangTables', () => {
  const result = importLiangTables(tables, packText, packs)

  it('reviews every mapped edit into an accepted or a duplicate', () => {
    expect(result.kind).toBe('imported')
    if (result.kind !== 'imported') return
    expect(result.dropped).toBe(180)
    expect(result.accepted).toBe(18)
    expect(result.duplicates).toBe(2)
    expect(result.rejected).toBe(2)
    expect(result.counts.added).toBe(18)
    expect(result.counts.deprecated).toBe(0)
    expect(result.counts.retimed).toBe(0)
  })

  it('adds exactly the accepted rules, all under the liang prefix', () => {
    if (result.kind !== 'imported') throw new Error('expected an imported outcome')
    const after = JSON.parse(result.packText).rules
    expect(after).toHaveLength(fixtureRules + result.accepted)
    const liang = after.filter((rule: { id: string }) => rule.id.startsWith('xv.liang.'))
    expect(liang).toHaveLength(result.accepted)
  })

  it('leaves the duplicated words out of the added rules', () => {
    if (result.kind !== 'imported') throw new Error('expected an imported outcome')
    const ids = JSON.parse(result.packText).rules.map((rule: { id: string }) => rule.id)
    expect(ids).not.toContain('xv.liang.commendable')
    expect(ids).not.toContain('xv.liang.meticulously')
  })

  it('accepts nothing the second time and leaves the pack text alone', () => {
    if (result.kind !== 'imported') throw new Error('expected an imported outcome')
    const again = importLiangTables(tables, result.packText, packs)
    expect(again.kind).toBe('imported')
    if (again.kind !== 'imported') return
    expect(again.accepted).toBe(0)
    expect(again.rejected).toBe(20)
    expect(again.counts.added).toBe(0)
    expect(again.packText).toBe(result.packText)
  })

  it('renders a proposal covering every mapped edit', () => {
    if (result.kind !== 'imported') throw new Error('expected an imported outcome')
    const proposal = JSON.parse(result.proposalText)
    expect(proposal.version).toBe(1)
    expect(proposal.family).toBe(null)
    expect(proposal.dropped).toBe(180)
    expect(proposal.accepted.length + proposal.rejected.length).toBe(20)
  })

  it('gives a deeply equal outcome for the same inputs twice', () => {
    expect(importLiangTables(tables, packText, packs)).toEqual(
      importLiangTables(tables, packText, packs),
    )
  })

  it('refuses a table the mapper cannot read', () => {
    expect(importLiangTables('rank\tpos\tword\n1\tnoun\tthing\n', packText, packs).kind).toBe(
      'invalid',
    )
  })

  it('refuses a pack text that is not JSON', () => {
    expect(importLiangTables(tables, '{ not json', packs).kind).toBe('invalid')
  })
})
