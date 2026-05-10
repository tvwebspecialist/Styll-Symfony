import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveActiveProfile, getActiveTenantId } from '@/lib/tenant-context'
import { TeamMemberCard } from '@/components/dashboard/team/TeamMemberCard'

export const dynamic = 'force-dynamic'

type StaffRole = 'manager' | 'staff' | 'receptionist'

interface StaffRow {
  id: string
  role: StaffRole
  fullName: string
  avatarUrl: string | null
}

export default async function TeamPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [staffRes, currentStaffRes] = await Promise.all([
    db
      .from('staff_members')
      .select('id, role, profiles(full_name, avatar_url)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .neq('role', 'owner')
      .order('role', { ascending: true }),
    user
      ? db
          .from('staff_members')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rawStaff = staffRes.data ?? []
  const currentRole = (currentStaffRes.data as { role?: string } | null)?.role ?? null
  const showImpersonateButton = currentRole === 'owner' || currentRole === 'manager'

  const staffMembers: StaffRow[] = rawStaff.map((sm) => {
    const profile = (sm.profiles as { full_name?: string | null; avatar_url?: string | null } | null) ?? {}
    return {
      id: sm.id,
      role: sm.role as StaffRole,
      fullName: profile.full_name ?? 'Senza nome',
      avatarUrl: profile.avatar_url ?? null,
    }
  })

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="max-w-lg mb-10">
        <div className="flex items-center gap-2">
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#9ca3af',
              flexShrink: 0,
            }}
          />
          <span className="text-xs uppercase tracking-widest text-gray-400">Team</span>
        </div>
        <h1 className="font-light text-4xl tracking-tight text-gray-900 mt-2">Il tuo team</h1>
        <p className="text-sm text-gray-400 mt-2">
          Visualizza come un membro del team per vedere esattamente la sua esperienza.
        </p>
      </div>

      {/* Grid */}
      {staffMembers.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            border: '2px dashed #e5e7eb',
            borderRadius: 16,
            color: '#9ca3af',
            fontSize: 14,
          }}
        >
          Nessun membro nel team
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {staffMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              staffMemberId={member.id}
              name={member.fullName}
              role={member.role}
              avatarUrl={member.avatarUrl}
              showImpersonateButton={showImpersonateButton}
            />
          ))}
        </div>
      )}
    </div>
  )
}
