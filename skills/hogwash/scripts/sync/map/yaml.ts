import { HogwashError } from '../../errors.js'

/** One Vale style file, read down to the fields the importer uses. */
export type ValeStyle = {
  readonly extends: string
  readonly message: string
  /** Declared `scope:`, in either scalar or block-sequence form. */
  readonly scoped: boolean
  /** Declared `exceptions:`. */
  readonly exceptions: boolean
  /** The `tokens:` block sequence in file order; empty when there is none. */
  readonly tokens: readonly string[]
}

const configError = (message: string): HogwashError => new HogwashError({ kind: 'config', message })

const KEY = /^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/
const ITEM = /^\s+-\s+(.*)$/
const FORBIDDEN = /[\t\n]/

function readDoubleQuoted(text: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw configError(`The Vale style has an unreadable double-quoted scalar ${text}.`)
  }
  if (typeof parsed !== 'string') {
    throw configError(`The Vale style has an unreadable double-quoted scalar ${text}.`)
  }
  return parsed
}

function unquote(text: string): string {
  if (text.length >= 2 && text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replaceAll("''", "'")
  }
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    return readDoubleQuoted(text)
  }
  return text
}

/** Throws HogwashError{kind:'config'} when the body leaves the Vale subset. */
export function readValeStyle(body: string): ValeStyle {
  let declaredExtends: string | null = null
  let message: string | null = null
  let scoped = false
  let exceptions = false
  const tokens: string[] = []
  let block: string | null = null

  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed === '---' || trimmed.startsWith('#')) continue
    const key = KEY.exec(line)
    if (key !== null) {
      const name = key[1] ?? ''
      const scalar = (key[2] ?? '').trim()
      block = scalar === '' ? name : null
      if (name === 'scope') scoped = true
      if (name === 'exceptions') exceptions = true
      if (name === 'extends' && scalar !== '') declaredExtends = unquote(scalar)
      if (name === 'message' && scalar !== '') message = unquote(scalar)
      continue
    }
    if (block !== 'tokens') continue
    const item = ITEM.exec(line)
    if (item !== null) tokens.push(unquote((item[1] ?? '').trim()))
  }

  if (declaredExtends === null) throw configError('A Vale style declares no extends:.')
  if (message === null) throw configError('A Vale style declares no message:.')
  if (FORBIDDEN.test(message)) {
    throw configError(`The Vale message "${message}" holds a tab or a newline.`)
  }
  for (const token of tokens) {
    if (FORBIDDEN.test(token)) {
      throw configError(`The Vale token "${token}" holds a tab or a newline.`)
    }
  }
  return { extends: declaredExtends, message, scoped, exceptions, tokens }
}
