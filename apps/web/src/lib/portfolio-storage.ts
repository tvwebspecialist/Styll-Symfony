import { createAdminClient } from '@/lib/supabase/admin'

export const PORTFOLIO_BUCKET = 'portfolio'
export const PORTFOLIO_SIGNED_URL_TTL_SECONDS = 60 * 60

export function buildPortfolioStoragePath(tenantId: string, extension: string): string {
  const sanitizedExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
  return `tenants/${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${sanitizedExt}`
}

export function extractPortfolioStoragePath(
  storedValue: string | null | undefined
): string | null {
  if (!storedValue) return null

  const trimmed = storedValue.trim()
  if (!trimmed) return null

  if (!trimmed.includes('://')) {
    return trimmed.replace(/^\/+/, '')
  }

  try {
    const url = new URL(trimmed)
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/portfolio\/(.+)$/
    )
    if (!match?.[1]) return null
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export async function createPortfolioSignedUrl(
  db: ReturnType<typeof createAdminClient>,
  storedValue: string | null | undefined,
  expiresIn: number = PORTFOLIO_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  const path = extractPortfolioStoragePath(storedValue)
  if (!path) return null

  const { data, error } = await db.storage
    .from(PORTFOLIO_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('[portfolio-storage] createSignedUrl failed:', error.message, { path })
    return null
  }

  return data.signedUrl
}
