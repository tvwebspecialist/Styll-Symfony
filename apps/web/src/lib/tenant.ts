import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TenantBranding {
  tenant_id: string
  business_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
  font_family: string | null
  status: string
}

async function fetchTenantBySlug(slug: string): Promise<TenantBranding | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('tenants')
    .select('id, business_name, primary_color, secondary_color, logo_url, font_family, status')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) return null

  return {
    tenant_id: data.id as string,
    business_name: data.business_name as string,
    primary_color: data.primary_color as string,
    secondary_color: data.secondary_color as string,
    logo_url: (data.logo_url as string | null) ?? null,
    font_family: (data.font_family as string | null) ?? null,
    status: data.status as string,
  }
}

export function getTenantBySlug(slug: string): Promise<TenantBranding | null> {
  return unstable_cache(
    () => fetchTenantBySlug(slug),
    [`tenant-slug-${slug}`],
    {
      revalidate: 60,
      tags: [`tenant-${slug}`],
    }
  )()
}
