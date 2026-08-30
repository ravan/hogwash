import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HogwashError } from '../errors.js'
import {
  AdjudicationSchema,
  CORPUS_MANIFEST_PATH,
  CorpusManifestSchema,
  loadCorpus,
} from './corpus.js'

const root = fileURLToPath(new URL('../../', import.meta.url))

const manifest = (): unknown => JSON.parse(readFileSync(join(root, CORPUS_MANIFEST_PATH), 'utf8'))

const temporaryRoot = (manifestText: string | null): string => {
  const directory = mkdtempSync(join(tmpdir(), 'hogwash-eval-'))
  if (manifestText !== null) {
    const path = join(directory, CORPUS_MANIFEST_PATH)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, manifestText, 'utf8')
  }
  return directory
}

describe('CorpusManifestSchema', () => {
  it('parses the shipped manifest', () => {
    const parsed = CorpusManifestSchema.parse(manifest())
    expect(parsed.classes).toHaveLength(14)
    const names = parsed.classes.map((entry) => entry.name)
    expect(new Set(names).size).toBe(names.length)
    expect(parsed.classes.find((entry) => entry.name === 'ai-claude')?.items).toHaveLength(3)
    expect(parsed.classes.find((entry) => entry.name === 'ai-gpt')?.items).toHaveLength(2)
  })

  it('rejects an unknown manifest version', () => {
    const bumped = { ...(manifest() as Record<string, unknown>), version: 2 }
    expect(CorpusManifestSchema.safeParse(bumped).success).toBe(false)
  })
})

describe('AdjudicationSchema', () => {
  it('parses an adjudication file', () => {
    const source = readFileSync(
      join(root, 'tests/fixtures/eval/adjudications/pastiche-non-native.json'),
      'utf8',
    )
    const parsed = AdjudicationSchema.parse(JSON.parse(source))
    expect(parsed.falsePositives).toHaveLength(1)
    expect(parsed.missed).toEqual([])
    expect(parsed.falsePositives[0]).toEqual({
      ruleId: 'opener.throat-clearing',
      quote: 'it is worth noting',
    })
  })
})

describe('loadCorpus', () => {
  it('loads every declared class, collected or not', () => {
    const classes = loadCorpus(root)
    expect(classes).toHaveLength(14)
    expect(classes.map((entry) => entry.name)).toEqual(
      CorpusManifestSchema.parse(manifest()).classes.map((entry) => entry.name),
    )
    expect(classes.find((entry) => entry.name === 'ai-gpt')?.items).toHaveLength(2)
    expect(classes.find((entry) => entry.name === 'pastiche-technical')?.items).toHaveLength(2)
  })

  it('carries each item text and adjudication', () => {
    const loaded = loadCorpus(root).find((entry) => entry.name === 'pastiche-technical')
    const first = loaded?.items[0]
    if (first === undefined) throw new Error('no human-technical item')
    expect(first.text.startsWith('# Quarterly review: warehouse receiving process')).toBe(true)
    expect(first.adjudication.falsePositives).toHaveLength(0)
    expect(first.item.register).toBe('technical')
  })

  it('reports a missing document', () => {
    const directory = temporaryRoot(
      JSON.stringify({
        version: 1,
        classes: [
          {
            name: 'ghost',
            kind: 'control',
            items: [
              {
                path: 'nope.md',
                register: 'technical',
                provenance: 'test',
                adjudication: 'nope.json',
              },
            ],
          },
        ],
      }),
    )
    try {
      loadCorpus(directory)
      expect.unreachable('expected loadCorpus to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(HogwashError)
      expect((error as HogwashError).failure.kind).toBe('io')
    }
  })

  it('reports an unreadable manifest', () => {
    try {
      loadCorpus(temporaryRoot(null))
      expect.unreachable('expected loadCorpus to throw')
    } catch (error) {
      expect((error as HogwashError).failure.kind).toBe('io')
    }
    try {
      loadCorpus(temporaryRoot('{}'))
      expect.unreachable('expected loadCorpus to throw')
    } catch (error) {
      expect((error as HogwashError).failure.kind).toBe('config')
    }
  })
})
