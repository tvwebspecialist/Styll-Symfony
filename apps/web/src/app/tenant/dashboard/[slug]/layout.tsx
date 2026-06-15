import { notFound, redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'
import { MobileTopBar } from '@/components/dashboard/MobileTopBar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { MainContent } from '@/components/dashboard/MainContent'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { StaffImpersonationBanner } from '@/components/dashboard/StaffImpersonationBanner'
import { ShadowModeProvider } from '@/lib/hooks/use-shadow-mode'
import { TenantProvider } from '@/lib/hooks/use-tenant-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { getImpersonationState, resolveActiveProfileForTenant } from '@/lib/tenant-context'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function loginUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/login'
    : `https://${ROOT_DOMAIN}/login`
}

function onboardingUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/onboarding/step-1'
    : `https://${ROOT_DOMAIN}/onboarding/step-1`
}

function suspendedUrl() {
  return process.env.NODE_ENV === 'development'
    ? '/suspended'
    : `https://${ROOT_DOMAIN}/suspended`
}

function selectTenantUrl(qs?: string) {
  const base =
    process.env.NODE_ENV === 'development'
      ? '/select-tenant'
      : `https://${ROOT_DOMAIN}/select-tenant`
  return qs ? `${base}?${qs}` : base
}

export default async function TenantDashboardLayout({ params, children }: Props) {
  const { slug } = await params

  const tenantBySlug = await getTenantBySlug(slug)
  if (!tenantBySlug) notFound()

  const ctx = await resolveActiveProfileForTenant(tenantBySlug.tenant_id)
  if (!ctx) redirect(loginUrl())

  const db = createAdminClient()
  const impersonation = await getImpersonationState()

  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', ctx.realUserId)
    .maybeSingle()

  const isSuperadmin = !!profile?.is_superadmin
  const { data: allStaffRows } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', ctx.realUserId)
    .eq('is_active', true)
    .is('deleted_at', null)

  const allTenantIds = (allStaffRows ?? []).map((r) => r.tenant_id as string)

  if (allTenantIds.length === 0 && !isSuperadmin) redirect(onboardingUrl())

  // Access guard: user must have access to the tenant selected by URL slug.
  if (!allTenantIds.includes(tenantBySlug.tenant_id) && !isSuperadmin) {
    redirect(selectTenantUrl('error=access_denied'))
  }

  const [{ data: ownerProfile }, { data: adminProfile }, { count: unreadNotifCount }] = await Promise.all([
    db
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', ctx.profileId)
      .maybeSingle(),
    ctx.isShadow
      ? db.from('profiles').select('full_name, email').eq('id', ctx.realUserId).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantBySlug.tenant_id)
      .eq('is_read', false)
      .or(`profile_id.is.null,profile_id.eq.${ctx.profileId}`),
  ])

  if (tenantBySlug.status === 'suspended' && !impersonation.active) {
    redirect(suspendedUrl())
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
    <TenantProvider
      value={{
        tenantId: tenantBySlug.tenant_id,
        tenant: {
          tenantId: tenantBySlug.tenant_id,
          slug: tenantBySlug.slug,
          businessName: tenantBySlug.business_name,
          primaryColor: tenantBySlug.primary_color,
          secondaryColor: tenantBySlug.secondary_color,
          logoUrl: tenantBySlug.logo_url,
          fontFamily: tenantBySlug.font_family,
          status: tenantBySlug.status,
          settings: tenantBySlug.settings,
        },
      }}
    >
      <ShadowModeProvider
        value={{
          active: ctx.isShadow,
          tenantId: ctx.tenantId,
          tenantName: ctx.isShadow ? tenantBySlug.business_name : null,
          adminName: ctx.isShadow ? adminName : null,
        }}
      >
        <div className="dashboard-root" style={{ minHeight: '100vh', background: 'var(--dashboard-root-bg, #F5F5F5)' }}>
          <ImpersonationBanner
            state={{
              active: ctx.isShadow,
              businessName: ctx.isShadow ? tenantBySlug.business_name : null,
            }}
          />
          <StaffImpersonationBanner />
          <TopBar
            fullName={displayName}
            avatarUrl={ownerProfile?.avatar_url ?? null}
            impersonation={
              ctx.isShadow
                ? { adminName, tenantName: tenantBySlug.business_name }
                : null
            }
            unreadCount={unreadNotifCount ?? 0}
          />
          <Sidebar />
          <MobileTopBar
            fullName={displayName}
            avatarUrl={ownerProfile?.avatar_url ?? null}
            unreadCount={unreadNotifCount ?? 0}
          />
          <BottomNav />
          <MainContent>{children}</MainContent>
        </div>
      </ShadowModeProvider>
    </TenantProvider>
  )
}
