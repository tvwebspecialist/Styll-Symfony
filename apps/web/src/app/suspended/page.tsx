import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldAlert, LogOut } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { signOutAction } from '@/app/admin/actions'

export const dynamic = 'force-dynamic'

export default async function SuspendedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/onboarding/step-1')

  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('status, business_name')
    .eq('id', tenantId)
    .maybeSingle()

  if (tenant?.status !== 'suspended') redirect('/dashboard')

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: '#fff',
          borderRadius: 24,
          padding: '40px 32px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: '#FEF2F2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#1A1A1A',
            margin: '0 0 8px',
          }}
        >
          Abbonamento Sospeso
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
          Il salone <strong>{tenant?.business_name ?? 'selezionato'}</strong> è
          temporaneamente sospeso. Contatta l&apos;assistenza per riattivare
          l&apos;account.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 28,
          }}
        >
          <a
            href="mailto:supporto@styll.app"
            style={{
              background: '#1A1A1A',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Contatta l&apos;assistenza
          </a>
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'transparent',
                color: '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <LogOut size={14} /> Esci
            </button>
          </form>
          <Link
            href="/login"
            style={{
              fontSize: 12,
              color: '#9CA3AF',
              textDecoration: 'none',
              marginTop: 4,
            }}
          >
            Torna al login
          </Link>
        </div>
      </div>
    </div>
  )
}
