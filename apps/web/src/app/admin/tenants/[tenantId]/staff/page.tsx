import { createAdminClient } from '@/lib/supabase/admin'
import { StaffClient } from './staff-client'

export const dynamic = 'force-dynamic'

export default async function StaffPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()
  const [{ data: staff }, { data: profiles }] = await Promise.all([
    db
      .from('staff_members')
      .select('id, profile_id, role, bio, is_active, photo_url, created_at, profile:profiles(full_name, email)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    db.from('profiles').select('id, full_name, email').or('user_type.eq.staff,is_superadmin.eq.true').order('full_name', { ascending: true }),
  ])

  return (
    <StaffClient
      tenantId={tenantId}
      initial={(staff ?? []) as never}
      profiles={(profiles ?? []) as never}
    />
  )
}
