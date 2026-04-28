import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

export default async function OnboardingCompletePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const { data: ownerStaff } = await supabase
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  let slug = ''
  if (ownerStaff?.tenant_id) {
    const { data: shop } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', ownerStaff.tenant_id)
      .maybeSingle()
    slug = shop?.slug ?? ''
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'tu'
  const publicUrl = slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.app'}/${slug}`
    : ''

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <div
          className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full"
          style={{ backgroundColor: '#000000', color: '#ffffff' }}
        >
          <Check className="h-9 w-9" strokeWidth={3} />
        </div>

        <h1
          className="font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 32 }}
        >
          Sei dentro, {firstName}.
        </h1>
        <p
          className="mt-2 text-base"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          La tua app è attiva. I clienti possono già prenotare.
        </p>

        {publicUrl && (
          <div
            className="mt-8 flex w-full items-center justify-between gap-3 rounded-[12px] px-4 py-3 text-sm"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <code
              className="truncate font-semibold"
              style={{ color: 'var(--color-fg)' }}
            >
              {publicUrl}
            </code>
            <CopyButton value={publicUrl} />
          </div>
        )}

        <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
          <ShareCta>📸 Story Instagram</ShareCta>
          <ShareCta>📱 QR Code</ShareCta>
          <ShareCta>💬 WhatsApp</ShareCta>
        </div>

        <ul
          className="mt-8 flex flex-col gap-2 text-sm"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          {[
            'Negozio configurato',
            'Servizi aggiunti',
            'App attivata',
            'Prova di 14 giorni iniziata',
          ].map((label) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: '#000', color: '#fff' }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {label}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="styll-btn-primary mt-10 inline-flex items-center justify-center px-8 py-4 text-base font-bold"
          style={{ fontSize: 16 }}
        >
          Vai alla dashboard →
        </Link>

        <p
          className="mt-4 text-xs"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Hai clienti da importare? Importa da Fresha o CSV.
        </p>
      </div>
    </main>
  )
}

function ShareCta({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-[12px] border px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-[color:var(--color-bg-secondary)]"
      style={{
        borderColor: 'var(--color-border)',
        color: 'var(--color-fg)',
        backgroundColor: '#ffffff',
      }}
    >
      {children}
    </button>
  )
}

// Client component for clipboard copy
import { CopyButton } from '@/components/onboarding/copy-button'
