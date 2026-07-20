import { Suspense } from 'react'
import { requireSuperadmin } from '@/app/admin/actions'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SkeletonCard } from '@/components/admin/skeleton'
import { getAdminSiteAnalytics } from '@/lib/admin/site-analytics-queries'
import { AdminAnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

const VALID_PERIODS = [7, 30, 90] as const
type ValidPeriod = (typeof VALID_PERIODS)[number]

function parsePeriod(raw: string | string[] | undefined): ValidPeriod {
  const n = parseInt(typeof raw === 'string' ? raw : '30', 10)
  return (VALID_PERIODS.includes(n as ValidPeriod) ? n : 30) as ValidPeriod
}

async function AnalyticsContent({ period }: { period: ValidPeriod }) {
  const data = await getAdminSiteAnalytics(period)
  return <AdminAnalyticsClient data={data} />
}

function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SkeletonCard className="h-72 lg:col-span-2" />
        <SkeletonCard className="h-72" />
      </div>
      <SkeletonCard className="h-96" />
    </div>
  )
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminAnalyticsPage({ searchParams }: PageProps) {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return <p className="text-sm" style={{ color: 'var(--admin-accent)' }}>Accesso negato.</p>
  }

  const params = await searchParams
  const period = parsePeriod(params.days)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Analytics' }]} />
        <h1
          className="mt-1 text-2xl font-bold tracking-tight"
          style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
        >
          Analytics cross-tenant
        </h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Traffico aggregato di tutta la piattaforma · solo rollup giornalieri
        </p>
      </div>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent period={period} />
      </Suspense>
    </div>
  )
}
