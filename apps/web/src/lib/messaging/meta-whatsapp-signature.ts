import { createHmac, timingSafeEqual } from 'node:crypto'

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | null | undefined,
): boolean {
  if (!appSecret) return true
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false

  const provided = Buffer.from(signatureHeader.trim())
  const expectedDigest = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const expected = Buffer.from(`sha256=${expectedDigest}`)

  if (provided.length !== expected.length) return false

  return timingSafeEqual(provided, expected)
}
