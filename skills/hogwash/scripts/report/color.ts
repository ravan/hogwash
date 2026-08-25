/** Minimal ANSI styling. No dependency, and every style is a no-op when colour is off. */

export type Style = (text: string) => string

const ESC = String.fromCharCode(27)

const code =
  (open: number, close: number): Style =>
  (text) =>
    `${ESC}[${open}m${text}${ESC}[${close}m`

const plain: Style = (text) => text

export type Palette = {
  readonly bold: Style
  readonly dim: Style
  readonly red: Style
  readonly yellow: Style
  readonly blue: Style
  readonly green: Style
  readonly cyan: Style
  readonly magenta: Style
}

const styled: Palette = {
  bold: code(1, 22),
  dim: code(2, 22),
  red: code(31, 39),
  yellow: code(33, 39),
  blue: code(34, 39),
  green: code(32, 39),
  cyan: code(36, 39),
  magenta: code(35, 39),
}

const flat: Palette = {
  bold: plain,
  dim: plain,
  red: plain,
  yellow: plain,
  blue: plain,
  green: plain,
  cyan: plain,
  magenta: plain,
}

export function palette(color: boolean): Palette {
  return color ? styled : flat
}

const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, 'g')

/** Length of the text a reader sees, with the escape sequences discounted. */
export function visibleWidth(text: string): number {
  return text.replace(ANSI, '').length
}

export function padVisible(text: string, width: number): string {
  const missing = width - visibleWidth(text)
  return missing > 0 ? text + ' '.repeat(missing) : text
}
