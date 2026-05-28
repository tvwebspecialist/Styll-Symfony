import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://styll.it'

async function getActiveTenantSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 3000),
  )
  const query = createAdminClient()
    .from('tenants')
    .select('slug, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })

  const result = await Promise.race([query, timeout])
  const { data, error } = result as Awaited<typeof query>
  if (error || !data) return []
  return data as { slug: string; updated_at: string }[]
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
