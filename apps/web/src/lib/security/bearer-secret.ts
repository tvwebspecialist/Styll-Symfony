import { timingSafeEqual } from 'crypto'

export function matchesBearerTokenHeader(
  authorizationHeader: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!authorizationHeader || !secret) return false
  if (!authorizationHeader.startsWith('Bearer ')) return false

  const provided = Buffer.from(authorizationHeader.slice('Bearer '.length).trim())
  const expected = Buffer.from(secret)

  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}
