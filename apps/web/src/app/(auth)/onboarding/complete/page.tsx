import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { CopyButton } from '@/components/onboarding/copy-button'

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
  let businessName = ''
  if (ownerStaff?.tenant_id) {
    const { data: shop } = await supabase
      .from('tenants')
      .select('slug, business_name')
      .eq('id', ownerStaff.tenant_id)
      .maybeSingle()
    slug = shop?.slug ?? ''
    businessName = shop?.business_name ?? ''
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'tu'
  const publicUrl = slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.app'}/${slug}`
    : ''

  const checklist = [
    { label: 'Negozio configurato', done: true },
    { label: 'Servizi aggiunti', done: true },
    { label: 'Orari impostati', done: true },
    { label: 'App pubblicata e attiva', done: true },
    { label: 'Prova di 14 giorni iniziata', done: true },
  ]

  return (
    <main
      className="flex min-h-[100dvh] flex-col"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* CSS animations */}
      <style>{`
        @keyframes complete-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes complete-scale-in {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes complete-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes phone-slide-up {
          from { opacity: 0; transform: translateY(40px) rotateX(8deg); }
          to   { opacity: 1; transform: translateY(0) rotateX(0deg); }
        }
        @keyframes checklist-item {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .complete-anim, .phone-anim, .checklist-anim { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-center px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
        >
          Styll
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="flex w-full max-w-lg flex-col items-center">

          {/* ── Hero section ── */}
          <div
            className="complete-anim"
            style={{
              width: '100%',
              background: 'linear-gradient(160deg, #0d0d1a 0%, #111126 100%)',
              borderRadius: 28,
              overflow: 'hidden',
              marginBottom: 28,
              position: 'relative',
              animationName: 'complete-scale-in',
              animationDuration: '480ms',
              animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              animationFillMode: 'both',
            }}
          >
            {/* Glow decorations */}
            <div style={{
              position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(233,69,96,0.18) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px 28px' }}>
              {/* Animated check */}
              <div
                className="complete-anim"
                style={{
                  width: 56, height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E94560, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  animationName: 'complete-scale-in',
                  animationDuration: '400ms',
                  animationDelay: '150ms',
                  animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  animationFillMode: 'both',
                }}
              >
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
                  <path d="M5 13l5 5 11-11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h1
                className="complete-anim"
                style={{
                  fontSize: 'clamp(24px, 6vw, 32px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  marginBottom: 8,
                  animationName: 'complete-fade-up',
                  animationDuration: '400ms',
                  animationDelay: '200ms',
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'both',
                }}
              >
                Sei dentro, {firstName}. 🎉
              </h1>

              <p
                className="complete-anim"
                style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.65,
                  marginBottom: 24,
                  animationName: 'complete-fade-up',
                  animationDuration: '400ms',
                  animationDelay: '280ms',
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'both',
                }}
              >
                La tua app è attiva.{' '}
                <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                  {businessName || 'Il tuo negozio'} è online e i clienti possono già prenotare.
                </span>
              </p>

              {/* Mini PWA preview inside the dark card */}
              <div
                className="phone-anim"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  animationName: 'phone-slide-up',
                  animationDuration: '560ms',
                  animationDelay: '320ms',
                  animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                  animationFillMode: 'both',
                }}
              >
                {/* App bar */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    {businessName || 'Il tuo salone'}
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E94560, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                    {firstName.charAt(0)}
                  </div>
                </div>
                {/* App content */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Servizi disponibili</div>
                  {[
                    { name: 'Taglio Classico', price: '€18', dur: '30m' },
                    { name: 'Taglio + Barba', price: '€28', dur: '45m' },
                  ].map(s => (
                    <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.dur}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>{s.price}</span>
                        <div style={{ background: '#E94560', borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#fff' }}>Prenota</div>
                      </div>
                    </div>
                  ))}
                  {/* Loyalty bar */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14 }}>🏆</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Loyalty attiva · 0 punti</div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: '5%', background: '#E94560', borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Public URL ── */}
          {publicUrl && (
            <div
              className="complete-anim"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderRadius: 14,
                padding: '12px 16px',
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                marginBottom: 12,
                animationName: 'complete-fade-up',
                animationDuration: '400ms',
                animationDelay: '440ms',
                animationTimingFunction: 'ease-out',
                animationFillMode: 'both',
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

          {/* ── Share CTAs ── */}
          <div
            className="complete-anim"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              width: '100%',
              marginBottom: 20,
              animationName: 'complete-fade-up',
              animationDuration: '400ms',
              animationDelay: '500ms',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'both',
            }}
          >
            {(['📸 Story', '📱 QR Code', '💬 WhatsApp'] as const).map((label) => (
              <button
                key={label}
                type="button"
                style={{
                  borderRadius: 12,
                  border: '1.5px solid var(--color-border)',
                  padding: '10px 4px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-fg)',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'background 150ms, border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff' }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Checklist ── */}
          <ul
            style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', marginBottom: 8 }}
          >
            {checklist.map((item, i) => (
              <li
                key={item.label}
                className="checklist-anim"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 12,
                  padding: '10px 14px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  animationName: 'checklist-item',
                  animationDuration: '320ms',
                  animationDelay: `${540 + i * 60}ms`,
                  animationTimingFunction: 'ease-out',
                  animationFillMode: 'both',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#000',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--color-fg)' }}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Sticky CTA footer ── */}
      <div
        className="onboarding-footer px-6 pt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <Link
          href="/dashboard"
          className="tap-target styll-btn-primary flex w-full items-center justify-center gap-2 py-4 text-base font-bold"
        >
          Vai alla dashboard
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <p
          className="mt-3 pb-1 text-center text-xs"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Hai clienti da importare? Importa da Fresha o CSV dalla dashboard.
        </p>
      </div>
    </main>
  )
}
