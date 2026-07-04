import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TenantBranding {
  tenant_id: string
  slug: string
  business_name: string
  primary_color: string
  secondary_color: string
  splash_color: string | null
  logo_url: string | null
  font_family: string | null
  status: string
  settings: Record<string, unknown> | null
}

async function fetchTenantBySlug(slug: string): Promise<TenantBranding | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, slug, business_name, primary_color, secondary_color, splash_color, logo_url, font_family, status, settings')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null

  return {
    tenant_id: data.id as string,
    slug: data.slug as string,
    business_name: data.business_name as string,
    primary_color: data.primary_color as string,
    secondary_color: data.secondary_color as string,
    splash_color: (data.splash_color as string | null) ?? null,
    logo_url: (data.logo_url as string | null) ?? null,
    font_family: (data.font_family as string | null) ?? null,
    status: data.status as string,
    settings: (data.settings as Record<string, unknown> | null) ?? null,
  }
}

// unstable_cache: deduplicates across requests (CDN/server cache, 60s TTL).
// React cache(): deduplicates within the same render tree — the 3 callers in
// the PWA layout (generateMetadata, generateViewport, AppLayout) share one hit.
export const getTenantBySlug = cache(
  (slug: string): Promise<TenantBranding | null> =>
    unstable_cache(
      () => fetchTenantBySlug(slug),
      [`tenant-slug-${slug}`],
      { revalidate: 60, tags: [`tenant-${slug}`] },
    )(),
)
