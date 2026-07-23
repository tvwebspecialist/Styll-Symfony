import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { StaffClient } from './staff-client'

export const dynamic = 'force-dynamic'

export default async function StaffPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const data = await fetchSymfonyAdminJson<{
    members: Array<{
      id: string
      profile_id: string
      role: string
      bio: string | null
      is_active: boolean
      created_at: string
      photo_url?: string | null
      profile?: { full_name: string | null; email: string | null } | null
    }>
    profiles: Array<{
      id: string
      full_name: string | null
      email: string | null
    }>
  }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/staff`)

  return (
    <StaffClient
      tenantId={tenantId}
      initial={data.members as never}
      profiles={data.profiles as never}
    />
  )
}
