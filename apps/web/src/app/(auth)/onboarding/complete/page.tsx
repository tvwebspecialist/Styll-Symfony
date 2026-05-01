import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'

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

  const checklist = [
    'Negozio configurato',
    'Servizi aggiunti',
    'App attivata',
    'Prova di 14 giorni iniziata',
  ]

  return (
    <main
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* ── Header bar ───────────────────────────────────── */}
      <div
        className="flex items-center justify-center px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--color-fg)' }}
        >
          Styll
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-md flex-col items-center text-center">
          {/* Success icon */}
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: '#000000', color: '#ffffff' }}
          >
            <Check className="h-10 w-10" strokeWidth={2.5} />
          </div>

          <h1
            className="font-bold tracking-tight"
            style={{ color: 'var(--color-fg)', fontSize: 'clamp(26px, 7vw, 36px)' }}
          >
            Sei dentro, {firstName}.
          </h1>
          <p
            className="mt-3 text-base leading-relaxed"
            style={{ color: 'var(--color-fg-secondary)', fontSize: 15 }}
          >
            La tua app è attiva.{' '}
            <span style={{ color: 'var(--color-fg)' }}>I clienti possono già prenotare.</span>
          </p>

          {/* Public URL card */}
          {publicUrl && (
            <div
              className="mt-8 flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <code
                className="flex-1 truncate text-left text-sm font-semibold"
                style={{ color: 'var(--color-fg)' }}
              >
                {publicUrl}
              </code>
              <CopyButton value={publicUrl} />
            </div>
          )}

          {/* Share CTAs */}
          <div className="mt-5 grid w-full grid-cols-3 gap-2">
            {(['📸 Story', '📱 QR Code', '💬 WhatsApp'] as const).map((label) => (
              <ShareCta key={label}>{label}</ShareCta>
            ))}
          </div>

          {/* Checklist */}
          <ul className="mt-8 flex w-full flex-col gap-2.5 text-left">
            {checklist.map((label) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-[12px] px-4 py-3"
                style={{ backgroundColor: 'var(--color-bg-secondary)' }}
              >
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#000', color: '#fff' }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Sticky CTA footer ─────────────────────────────── */}
      <div
        className="onboarding-footer px-6 pt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          href="/dashboard"
          className="tap-target styll-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base font-bold"
        >
          Vai alla dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p
          className="mt-3 pb-1 text-center text-xs"
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
      className="tap-target rounded-[12px] border py-2.5 text-xs font-semibold transition-colors hover:bg-[color:var(--color-bg-secondary)]"
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

import { CopyButton } from '@/components/onboarding/copy-button'
