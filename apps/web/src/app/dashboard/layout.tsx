import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'
import { MobileTopBar } from '@/components/dashboard/MobileTopBar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { MainContent } from '@/components/dashboard/MainContent'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { ShadowModeProvider } from '@/lib/hooks/use-shadow-mode'
import { createAdminClient } from '@/lib/supabase/admin'
import { getImpersonationState, resolveActiveProfile } from '@/lib/tenant-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  // Access is granted only if the user is either:
  //   - an active staff member of a tenant, OR
  //   - a superadmin in tenant-impersonation shadow mode (handled inside helper).
  const db = createAdminClient()
  const impersonation = await getImpersonationState()

  // The dashboard's "current tenant" is the impersonated one in shadow mode,
  // otherwise the user's primary staff_members.tenant_id.
  let primaryTenantId: string | null = impersonation.tenantId
  if (!primaryTenantId) {
    const { data } = await db
      .from('staff_members')
      .select('tenant_id')
      .eq('profile_id', ctx.realUserId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    primaryTenantId = data?.tenant_id ?? null
  }
  if (!primaryTenantId) redirect('/onboarding/step-1')

  const [{ data: tenant }, { data: ownerProfile }, { data: adminProfile }] = await Promise.all([
    db.from('tenants').select('status').eq('id', primaryTenantId).maybeSingle(),
    // Profile shown in the dashboard chrome — the owner in shadow mode, the
    // user's own profile otherwise. `ctx.profileId` already encodes this.
    db
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', ctx.profileId)
      .maybeSingle(),
    // Admin's own profile name, used in the impersonation header.
    ctx.isShadow
      ? db.from('profiles').select('full_name, email').eq('id', ctx.realUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Block suspended tenants for barbers (real session). Superadmin in shadow mode
  // is allowed to inspect a suspended tenant's dashboard for support.
  if (tenant?.status === 'suspended' && !impersonation.active) {
    redirect('/suspended')
  }

  const displayName =
    ownerProfile?.full_name ||
    (ownerProfile?.email as string | null | undefined) ||
    'Utente'

  const adminName =
    (ctx.isShadow &&
      (adminProfile?.full_name ||
        (adminProfile?.email as string | null | undefined))) ||
    'Admin'

  return (
    <ShadowModeProvider
      value={{
        active: ctx.isShadow,
        tenantId: ctx.tenantId,
        tenantName: impersonation.businessName,
        adminName: ctx.isShadow ? adminName : null,
      }}
    >
      <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
        <ImpersonationBanner />
        <TopBar
          fullName={displayName}
          avatarUrl={ownerProfile?.avatar_url ?? null}
          impersonation={
            ctx.isShadow && impersonation.businessName
              ? { adminName, tenantName: impersonation.businessName }
              : null
          }
        />
        <Sidebar />
        <MobileTopBar
          fullName={displayName}
          avatarUrl={ownerProfile?.avatar_url ?? null}
        />
        <BottomNav />
        <MainContent>{children}</MainContent>
      </div>
    </ShadowModeProvider>
  )
}
