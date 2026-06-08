import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Bell, ChevronRight, Shield, UserRound } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { LogoutButton } from '@/components/pwa/auth/LogoutButton'
import { ProfileLoginGate } from '../_components/ProfileLoginGate'
import { ProfileHeroCard } from '../_components/ProfileHeroCard'
import { LoyaltyProgressCard } from '../_components/LoyaltyProgressCard'
import { StreakCard } from '../_components/StreakCard'
import { BadgeGrid } from '../_components/BadgeGrid'
import { RewardsList } from '../_components/RewardsList'
import { VisitHistory } from '../_components/VisitHistory'
import type { RewardItem } from '../_components/RewardsList'
import type { VisitItem } from '../_components/VisitHistory'

interface Props {
  params: Promise<{ slug: string }>
}

type Tier = 'Bronze' | 'Silver' | 'Gold'

function computeTierProgress(totalPoints: number): {
  tierLabel: Tier
  nextTierLabel: Tier | null
  nextMin: number | null
  progress: number
  pointsToNextTier: number | null
} {
  if (totalPoints >= 1000) {
    return { tierLabel: 'Gold', nextTierLabel: null, nextMin: null, progress: 100, pointsToNextTier: null }
  }
  if (totalPoints >= 500) {
    const progress = Math.min(100, Math.round(((totalPoints - 500) / 500) * 100))
    return { tierLabel: 'Silver', nextTierLabel: 'Gold', nextMin: 1000, progress, pointsToNextTier: 1000 - totalPoints }
  }
  const progress = Math.min(100, Math.round((totalPoints / 500) * 100))
  return { tierLabel: 'Bronze', nextTierLabel: 'Silver', nextMin: 500, progress, pointsToNextTier: 500 - totalPoints }
}

function getInitials(value: string | null | undefined): string {
  return (
    (value ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CL'
  )
}

type Rel<T> = T | T[] | null | undefined

function readRel<T>(value: Rel<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type ServiceRel = { services: Rel<{ name: string | null }> } | null
type StaffRel = { profile: Rel<{ full_name: string | null }> } | null
type RawVisit = {
  id: string
  start_time: string
  staff: Rel<StaffRel>
  appointment_services: ServiceRel[] | null
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

  // ── Guest state — full-screen login gate ────────────────────────────────────
  if (!user) {
    return <ProfileLoginGate slug={slug} tenantId={tenant.tenant_id} />
  }

  // ── Authenticated: fetch client record ──────────────────────────────────────
  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id, full_name, email, phone, created_at')
    .eq('tenant_id', tenant.tenant_id)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) {
    return (
      <main className="min-h-screen bg-[#F7F7F7] px-5 pb-8 pt-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-900">
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

  // ── Parallel data fetch ──────────────────────────────────────────────────────
  const fetchResults = await Promise.all([
    db
      .from('client_loyalty')
      .select('available_points, total_points, current_streak, longest_streak')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .maybeSingle(),
    db
      .from('loyalty_configs')
      .select('template')
      .eq('tenant_id', tenant.tenant_id)
      .is('ended_at', null)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('rewards')
      .select('id, name, description, reward_type, points_cost')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .order('points_cost', { ascending: true }),
    db
      .from('appointments')
      .select(
        'id, start_time, appointment_services(services(name)), staff:staff_members(profile:profiles(full_name))',
      )
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(5),
    db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .eq('status', 'completed'),
    db
      .from('appointments')
      .select('start_time')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .eq('status', 'completed')
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]).catch(() => null)

  if (!fetchResults) {
    return (
      <main className="min-h-screen bg-[#F7F7F7] px-5 pb-8 pt-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-900">
            <h1 className="text-lg font-extrabold">Qualcosa è andato storto</h1>
            <p className="mt-2 text-sm leading-6">
              Non siamo riusciti a caricare il tuo profilo. Riprova tra qualche momento.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const [loyaltyRes, loyaltyConfigRes, rewardsRes, visitsRes, visitCountRes, firstVisitRes] =
    fetchResults

  // ── Loyalty state ────────────────────────────────────────────────────────────
  const loyalty = loyaltyRes.data
  const totalPoints = loyalty?.total_points ?? 0
  const availablePoints = loyalty?.available_points ?? 0
  const currentStreak = loyalty?.current_streak ?? 0
  const longestStreak = loyalty?.longest_streak ?? 0

  const template = (loyaltyConfigRes.data?.template ?? 'classic') as
    | 'classic'
    | 'streak_master'
    | 'vip_club'

  const rewards = (rewardsRes.data ?? []) as RewardItem[]

  // ── Visit history with earned points ─────────────────────────────────────────
  const rawVisits = (visitsRes.data ?? []) as RawVisit[]
  const visitIds = rawVisits.map((v) => v.id)

  const txRes =
    visitIds.length > 0
      ? await db
          .from('loyalty_transactions')
          .select('appointment_id, points')
          .eq('tenant_id', tenant.tenant_id)
          .eq('client_id', client.id)
          .in('appointment_id', visitIds)
          .eq('type', 'earn')
      : { data: [] as { appointment_id: string | null; points: number }[] }

  const pointsByVisit = new Map<string, number>()
  for (const tx of txRes.data ?? []) {
    if (tx.appointment_id) {
      pointsByVisit.set(
        tx.appointment_id,
        (pointsByVisit.get(tx.appointment_id) ?? 0) + tx.points,
      )
    }
  }

  const visits: VisitItem[] = rawVisits.map((v) => ({
    id: v.id,
    startTime: v.start_time,
    serviceNames: (v.appointment_services ?? [])
      .map((as) => readRel(as?.services)?.name)
      .filter((n): n is string => Boolean(n)),
    staffName: readRel(readRel(v.staff)?.profile)?.full_name ?? 'Staff',
    pointsEarned: pointsByVisit.get(v.id) ?? 0,
  }))

  const visitCount = visitCountRes.count ?? 0
  const firstVisitYear = firstVisitRes.data?.start_time
    ? new Date(firstVisitRes.data.start_time).getFullYear()
    : null

  const { tierLabel, nextTierLabel, pointsToNextTier, progress } =
    computeTierProgress(totalPoints)

  const showStreak = template !== 'classic'
  const showBadges = template === 'vip_club'

  return (
    <main className="min-h-screen bg-[#F7F7F7] px-5 pb-8 pt-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {/* A — Hero */}
        <ProfileHeroCard
          initials={getInitials(client.full_name)}
          avatarUrl={null}
          fullName={client.full_name ?? 'Cliente'}
          tier={tierLabel}
          visitCount={visitCount}
          firstVisitYear={firstVisitYear}
        />

        {/* B — Loyalty progress */}
        <LoyaltyProgressCard
          availablePoints={availablePoints}
          totalPoints={totalPoints}
          tierLabel={tierLabel}
          nextTierLabel={nextTierLabel}
          pointsToNextTier={pointsToNextTier}
          progress={progress}
        />

        {/* C — Streak (solo se template ≠ classic) */}
        {showStreak && <StreakCard currentStreak={currentStreak} longestStreak={longestStreak} />}

        {/* D + E — Rewards (sezione D: prossimo, sezione E: riscattabili) */}
        <RewardsList
          rewards={rewards}
          availablePoints={availablePoints}
          puntiPath={tp('/punti')}
        />

        {/* F — Badge (solo se vip_club) */}
        {showBadges && <BadgeGrid badges={[]} isVipClub={showBadges} />}

        {/* G — Storico visite */}
        <VisitHistory visits={visits} />

        {/* H — Impostazioni profilo */}
        <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] divide-y divide-neutral-100">
          <Link
            href={tp('/profilo/dati')}
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <UserRound className="size-5 text-neutral-400" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">Modifica contatti</span>
            </div>
            <ChevronRight className="size-4 text-neutral-400" aria-hidden="true" />
          </Link>

          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4"
            aria-label="Preferenze notifiche"
          >
            <div className="flex items-center gap-3">
              <Bell className="size-5 text-neutral-400" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">Preferenze notifiche</span>
            </div>
            <ChevronRight className="size-4 text-neutral-400" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="flex w-full items-center justify-between px-5 py-4"
            aria-label="Privacy e dati"
          >
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-neutral-400" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-700">Privacy e dati</span>
            </div>
            <ChevronRight className="size-4 text-neutral-400" aria-hidden="true" />
          </button>

          <div className="px-5">
            <LogoutButton basePath={tp('')} />
          </div>
        </section>
      </div>
    </main>
  )
}
