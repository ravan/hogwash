import { readFile, writeFile } from 'node:fs/promises'
import { HogwashError } from './errors.js'
import type { Document } from './report/build.js'

/** Reads one file into a document, turning any failure into a typed io error. */
export async function readDocument(path: string): Promise<Document> {
  try {
    return { path, text: await readFile(path, 'utf8') }
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be read',
    })
  }
}

export async function writeDocument(path: string, text: string): Promise<void> {
  try {
    await writeFile(path, text, 'utf8')
  } catch (error) {
    throw new HogwashError({
      kind: 'io',
      path,
      message: error instanceof Error ? error.message : 'could not be written',
    })
  }
}

export async function readDocuments(paths: readonly string[]): Promise<Document[]> {
  const documents: Document[] = []
  for (const path of paths) {
    documents.push(await readDocument(path))
  }
  return documents
}
