'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type OnboardingLocation = { name: string; address: string | null; photo_url: string | null }
type OnboardingStaff    = { full_name: string; photo_url: string | null; specialization: string | null }

export async function getOnboardingData(tenantId: string): Promise<{
  locations: OnboardingLocation[]
  staff:     OnboardingStaff[]
}> {
  const db = createAdminClient()

  const [locRes, staffRes] = await Promise.all([
    db.from('locations')
      .select('name, address, photos')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(3),
    db.from('staff_members')
      .select('photo_url, specialization, profile:profiles(full_name, avatar_url)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(4),
  ])

  type LocRow   = { name: string; address: string | null; photos: string[] | null }
  type StaffRow = { photo_url: string | null; specialization: string | null; profile: { full_name: string; avatar_url: string | null } | null }

  const locations: OnboardingLocation[] = ((locRes.data ?? []) as LocRow[]).map(loc => ({
    name:      loc.name,
    address:   loc.address,
    photo_url: loc.photos?.[0] ?? null,
  }))

  const staff: OnboardingStaff[] = ((staffRes.data ?? []) as StaffRow[]).map(s => ({
    full_name:      s.profile?.full_name ?? 'Barbiere',
    photo_url:      s.photo_url ?? s.profile?.avatar_url ?? null,
    specialization: s.specialization,
  }))

  return { locations, staff }
}
