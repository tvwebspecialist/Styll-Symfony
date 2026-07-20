const JSON_LD_ESCAPE_RE = /[<>&\u2028\u2029]/g

export function serializeJsonLd(value: unknown): string {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw new TypeError('JSON-LD payload must be JSON-serializable.')
  }

  return serialized.replace(JSON_LD_ESCAPE_RE, (char) => {
    switch (char) {
      case '<':
        return '\\u003c'
      case '>':
        return '\\u003e'
      case '&':
        return '\\u0026'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
      default:
        return char
    }
  })
}
