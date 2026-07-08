import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://styll.it'
const SITEMAP_TENANT_TIMEOUT_MS = 3000

type TenantSlugRow = {
  slug: string
  updated_at: string | null
}

function isAbortLikeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

async function getActiveTenantSlugs(): Promise<TenantSlugRow[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SITEMAP_TENANT_TIMEOUT_MS)

  try {
    const { data, error } = await createAdminClient()
      .from('tenants')
      .select('slug, updated_at')
      .eq('status', 'active')
      .abortSignal(controller.signal)

    if (error || !data) return []

    return (data as TenantSlugRow[])
      .filter((tenant) => tenant.slug)
      .sort((left, right) => left.slug.localeCompare(right.slug, 'en'))
  } catch (error) {
    if (isAbortLikeError(error)) return []
    return []
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  try {
    const tenants = await getActiveTenantSlugs()
    const tenantPages: MetadataRoute.Sitemap = tenants.map((t) => ({
      url: `${SITE_URL}/${t.slug}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }))
    return [...staticPages, ...tenantPages]
  } catch {
    // Graceful degradation: return static pages only
    return staticPages
  }
}
