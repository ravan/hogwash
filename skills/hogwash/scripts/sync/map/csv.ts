/**
 * RFC 4180 rows: quoted fields, doubled quotes inside them, and commas or
 * newlines inside quotes. A trailing newline yields no extra row.
 */
export function parseCsv(text: string): readonly (readonly string[])[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let started = false

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
    started = false
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      started = true
    } else if (char === ',') {
      started = true
      endField()
    } else if (char === '\n') {
      endRow()
    } else if (char === '\r') {
      if (text[index + 1] === '\n') index += 1
      endRow()
    } else {
      started = true
      field += char
    }
  }
  if (started || field.length > 0 || row.length > 0) endRow()
  return rows
}
