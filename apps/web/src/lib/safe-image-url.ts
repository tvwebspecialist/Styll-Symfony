/**
 * SSRF guard for tenant-provided image URLs (e.g. `tenants.logo_url`).
 *
 * Tenant/admin users can write arbitrary strings into `logo_url`. Several
 * server-side routes (pwa-icon, pwa-splash, og, favicon) fetch or redirect to
 * that URL. Without validation a malicious value could point at internal hosts
 * (cloud metadata endpoints, localhost services, private IPs) — a classic SSRF.
 *
 * Legitimate logos are uploaded to Supabase Storage, so the only host we ever
 * need to fetch is the Supabase project domain. We allowlist that host (plus any
 * explicitly configured extra hosts) and require HTTPS.
 *
 * Edge-runtime safe: uses only the WHATWG `URL` API and build-inlined env vars.
 */

function allowedHosts(): Set<string> {
  const hosts = new Set<string>()

  const candidates = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_IMAGE_ALLOWED_ORIGIN,
  ]

  for (const candidate of candidates) {
    const trimmed = candidate?.trim()
    if (!trimmed) continue
    try {
      hosts.add(new URL(trimmed).host)
    } catch {
      // ignore malformed env value
    }
  }

  return hosts
}

/**
 * Returns true only for HTTPS URLs hosted on an allowlisted domain.
 */
export function isAllowedImageUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false

  return allowedHosts().has(url.host)
}

/**
 * Returns the URL if it passes the allowlist, otherwise null.
 * Use this to gate server-side fetch/redirect on tenant-provided image URLs.
 */
export function safeImageUrl(rawUrl: string | null | undefined): string | null {
  return isAllowedImageUrl(rawUrl) ? (rawUrl as string) : null
}
