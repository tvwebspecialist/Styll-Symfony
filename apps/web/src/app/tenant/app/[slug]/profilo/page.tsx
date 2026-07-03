import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { ProfileLoginGate } from '../_components/ProfileLoginGate'
import { ProfiloAuthGuard } from './_components/ProfiloAuthGuard'
import { AvatarHero } from './_components/AvatarHero'
import { SettingsList } from './_components/SettingsList'

interface Props {
  params: Promise<{ slug: string }>
}

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

function computeTier(totalPoints: number): {
  tierLabel: Tier
  nextTierLabel: Tier | null
  progress: number
  pointsToNextTier: number | null
} {
  if (totalPoints >= 1000) {
    return { tierLabel: 'Gold', nextTierLabel: null, progress: 100, pointsToNextTier: null }
  }
  if (totalPoints >= 500) {
    const progress = Math.min(100, Math.round(((totalPoints - 500) / 500) * 100))
    return { tierLabel: 'Silver', nextTierLabel: 'Gold', progress, pointsToNextTier: 1000 - totalPoints }
  }
  const progress = Math.min(100, Math.round((totalPoints / 500) * 100))
  return { tierLabel: 'Bronze', nextTierLabel: 'Silver', progress, pointsToNextTier: 500 - totalPoints }
}

export default async function ProfiloPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <ProfiloAuthGuard
        slug={slug}
        tenantId={tenant.tenant_id}
        loginGate={
          <ProfileLoginGate
            slug={slug}
            tenantId={tenant.tenant_id}
            primaryColor={tenant.primary_color}
            logoUrl={tenant.logo_url}
            businessName={tenant.business_name}
          />
        }
      >
        <ProfileLoginGate
          slug={slug}
          tenantId={tenant.tenant_id}
          primaryColor={tenant.primary_color}
          logoUrl={tenant.logo_url}
          businessName={tenant.business_name}
        />
      </ProfiloAuthGuard>
    )
  }

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', tenant.tenant_id)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) {
    return (
      <main className="min-h-screen bg-white px-4 pb-8 pt-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h1 className="text-lg font-extrabold">Profilo non collegato</h1>
            <p className="mt-2 text-sm leading-6">
              Il tuo account è attivo, ma non è ancora collegato a una scheda cliente di{' '}
              {tenant.business_name}.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const now = new Date().toISOString()

  const fetchResults = await Promise.all([
    db
      .from('client_loyalty')
      .select('available_points, total_points')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .maybeSingle(),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .in('status', ['confirmed', 'pending'])
      .gte('start_time', now),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .eq('status', 'completed'),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .eq('status', 'cancelled'),
    db
      .from('profiles')
      .select('avatar_url, full_name, phone, email')
      .eq('id', user.id)
      .maybeSingle(),
  ]).catch(() => null)

  if (!fetchResults) {
    return (
      <main className="min-h-screen bg-white px-4 pb-8 pt-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-red-900">
            <h1 className="text-lg font-extrabold">Qualcosa è andato storto</h1>
            <p className="mt-2 text-sm leading-6">
              Non siamo riusciti a caricare il tuo profilo. Riprova tra qualche momento.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const [loyaltyRes, upcomingRes, completedRes, cancelledRes, profileRes] = fetchResults

  const loyalty = loyaltyRes.data
  const totalPoints = loyalty?.total_points ?? 0
  const availablePoints = loyalty?.available_points ?? 0
  const upcomingCount = upcomingRes.count ?? 0
  const completedCount = completedRes.count ?? 0
  const cancelledCount = cancelledRes.count ?? 0
  const avatarUrl = profileRes.data?.avatar_url ?? null
  const profileFullName = profileRes.data?.full_name ?? client.full_name ?? 'Cliente'
  const profilePhone = profileRes.data?.phone ?? client.phone ?? null
  const profileEmail = profileRes.data?.email ?? client.email ?? null

  const { tierLabel, nextTierLabel, pointsToNextTier, progress } = computeTier(totalPoints)
  const primaryColor = tenant.primary_color ?? '#1a1a1a'

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="flex flex-col gap-3">

          {/* Hero card */}
          <AvatarHero
            userId={user.id}
            avatarUrl={avatarUrl}
            fullName={profileFullName}
            email={profileEmail}
            tierLabel={tierLabel}
            upcoming={upcomingCount}
            completed={completedCount}
            cancelled={cancelledCount}
            availablePoints={availablePoints}
            nextTierLabel={nextTierLabel}
            pointsToNextTier={pointsToNextTier}
            progress={progress}
            puntiPath={tp('/punti')}
            primaryColor={primaryColor}
          />

          {/* Settings */}
          <SettingsList
            appuntamentiPath={tp('/appuntamenti')}
            prodottiPath={tp('/preferiti')}
            puntiPath={tp('/punti')}
            modificaPath={tp('/profilo/modifica')}
            preferenzePath={tp('/profilo/preferenze')}
            privacyPath={tp('/privacy')}
            basePath={tp('')}
            profile={{
              fullName: profileFullName,
              phone: profilePhone,
              email: profileEmail,
            }}
          />

          {/* Version footer */}
          <p className="text-center text-[11px] text-neutral-300 pb-2 mt-1">Styll v1.0</p>

        </div>
      </div>
    </main>
  )
}
