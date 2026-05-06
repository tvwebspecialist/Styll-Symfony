import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenantId } from '@/lib/actions/vendite'
import { countAtRisk, listAtRiskClients } from '@/lib/data/clients-with-churn'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = await getCurrentTenantId()
  if (!tenantId) return null

  const [atRiskCount, atRiskRes] = await Promise.all([
    countAtRisk(tenantId),
    listAtRiskClients(tenantId, 5),
  ])
  const atRisk = atRiskRes.data ?? []

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: 0 }}>
        Dashboard
      </h1>

      <Link
        href="/clienti"
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: 20, borderRadius: 16,
          background: '#FFFFFF', border: '1px solid #F0F0F0',
          textDecoration: 'none', color: 'inherit',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/Churn_red.png" alt="" width={48} height={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#B0B0B0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Clienti a rischio
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#222222', lineHeight: 1.1 }}>
            {atRiskCount}
          </div>
          <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
            Hanno saltato la loro frequenza abituale
          </div>
        </div>
      </Link>

      {atRisk.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F0F0F0', padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>
            Top {atRisk.length} a rischio
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atRisk.map((row) => (
              <Link
                key={row.client_id}
                href={`/clienti/${row.client_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  textDecoration: 'none', color: 'inherit',
                  background: '#FAFAFA',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.churn_status === 'red' ? '/img/Churn_red.png' : '/img/Churn_yellow.png'}
                  alt=""
                  width={28}
                  height={28}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {(row.client as { full_name?: string } | null)?.full_name ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#B0B0B0' }}>
                    {row.days_since_last_visit} giorni fa
                    {row.avg_frequency_days
                      ? ` • di solito ogni ${Math.round(row.avg_frequency_days)}`
                      : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
