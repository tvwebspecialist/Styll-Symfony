import { notFound, redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { TopBar } from '@/components/dashboard/TopBar'
import { MobileTopBar } from '@/components/dashboard/MobileTopBar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { MainContent } from '@/components/dashboard/MainContent'
import { ImpersonationBanner } from '@/components/dashboard/ImpersonationBanner'
import { StaffImpersonationBanner } from '@/components/dashboard/StaffImpersonationBanner'
import { ShadowModeProvider } from '@/lib/hooks/use-shadow-mode'
import { createAdminClient } from '@/lib/supabase/admin'
import { getImpersonationState, resolveActiveProfile } from '@/lib/tenant-context'
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

export default async function TenantDashboardLayout({ params, children }: Props) {
  const { slug } = await params

  const tenantBySlug = await getTenantBySlug(slug)
  if (!tenantBySlug) notFound()

  const ctx = await resolveActiveProfile()
  if (!ctx) redirect(loginUrl())

  const db = createAdminClient()
  const impersonation = await getImpersonationState()

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
  if (!primaryTenantId) redirect(onboardingUrl())

  // Cross-tenant guard: redirect to the correct slug's subdomain
  if (primaryTenantId !== tenantBySlug.tenant_id) {
    const { data: correctTenant } = await db
      .from('tenants')
      .select('slug')
      .eq('id', primaryTenantId)
      .maybeSingle()
    if (correctTenant?.slug) {
      redirect(`https://${correctTenant.slug}-dashboard.${ROOT_DOMAIN}`)
    } else {
      redirect(onboardingUrl())
    }
  }

  const [{ data: tenant }, { data: ownerProfile }, { data: adminProfile }] = await Promise.all([
    db.from('tenants').select('status').eq('id', primaryTenantId).maybeSingle(),
    db
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', ctx.profileId)
      .maybeSingle(),
    ctx.isShadow
      ? db.from('profiles').select('full_name, email').eq('id', ctx.realUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (tenant?.status === 'suspended' && !impersonation.active) {
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
        <StaffImpersonationBanner />
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
