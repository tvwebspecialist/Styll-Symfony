import { notFound, redirect } from 'next/navigation'
import type { Metadata, Viewport } from 'next'
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
import { NotificationCountProvider } from '@/contexts/NotificationCountContext'
import { NotificationOnboardingDashboard } from '@/components/dashboard/NotificationOnboardingDashboard'
import { CookieBanner } from '@/components/shared/CookieBanner'

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    return { title: 'Dashboard | Styll' }
  }

  const iconVersion = tenant.logo_url
    ? encodeURIComponent(tenant.logo_url).slice(-8)
    : '0'
  const faviconUrl = `/api/favicon?slug=${encodeURIComponent(slug)}`
  const appleTouchIcon = `/api/pwa-icon?slug=${encodeURIComponent(slug)}&v=${iconVersion}&size=180`

  return {
    title: `${tenant.business_name} | Dashboard`,
    manifest: `/api/dashboard-manifest?slug=${encodeURIComponent(slug)}`,
    icons: {
      icon: [
        { url: faviconUrl, type: 'image/svg+xml' },
        { url: faviconUrl, sizes: '32x32' },
        { url: faviconUrl, sizes: '64x64' },
      ],
      apple: [{ url: appleTouchIcon, sizes: '180x180', type: 'image/png' }],
      shortcut: faviconUrl,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.business_name,
    },
  }
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Viewport> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  return {
    themeColor: tenant?.primary_color ?? '#222222',
    viewportFit: 'cover',
  }
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

  const [{ data: ownerProfile }, { data: adminProfile }, { count: unreadNotifCount }, { data: currentStaffRow }] = await Promise.all([
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
    db
      .from('staff_members')
      .select('role')
      .eq('tenant_id', tenantBySlug.tenant_id)
      .eq('profile_id', ctx.realUserId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
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

  const canAccessManagementSurfaces =
    isSuperadmin || currentStaffRow?.role === 'owner' || currentStaffRow?.role === 'manager'

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
        <NotificationCountProvider
          initialCount={unreadNotifCount ?? 0}
          tenantId={tenantBySlug.tenant_id}
          profileId={ctx.profileId}
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
            />
            <Sidebar canAccessManagementSurfaces={canAccessManagementSurfaces} />
            <MobileTopBar
              fullName={displayName}
              avatarUrl={ownerProfile?.avatar_url ?? null}
            />
            <BottomNav canAccessManagementSurfaces={canAccessManagementSurfaces} />
            <MainContent>{children}</MainContent>
            <NotificationOnboardingDashboard
              primaryColor={tenantBySlug.primary_color ?? '#111111'}
              logoUrl={tenantBySlug.logo_url}
              businessName={tenantBySlug.business_name}
              tenantId={tenantBySlug.tenant_id}
            />
            <CookieBanner
              privacyPath="/cookie"
              brandColor={tenantBySlug.primary_color ?? '#1A1A1A'}
            />
          </div>
        </NotificationCountProvider>
      </ShadowModeProvider>
    </TenantProvider>
  )
}
