'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { WorkMode } from '@/types/database'

interface OnboardingShellProps {
  stepNumber: number
  totalSteps: number
  stepLabel: string
  title: string
  subtitle?: string
  illustration?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Phone mockup shown in the illustration panel */
function PanelPhoneMockup({ stepNumber }: { stepNumber: number }) {
  const stepContent = [
    // Step 1 - info base
    {
      screen: (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: '60%' }} />
          <div style={{ height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
          <div style={{ height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
          <div style={{ height: 48, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }} />
          <div style={{ marginTop: 4, height: 40, background: 'rgba(233,69,96,0.5)', borderRadius: 10 }} />
        </div>
      ),
      label: 'Info del negozio',
    },
    // Step 2 - work mode
    {
      screen: (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: '50%' }} />
          <div style={{ height: 80, background: 'rgba(255,255,255,0.12)', borderRadius: 10, border: '2px solid rgba(233,69,96,0.5)' }}>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>✓ Lavoro da solo</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Un calendario, massima semplicità</div>
            </div>
          </div>
          <div style={{ height: 80, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Ho un team</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Più barbieri, più calendari</div>
            </div>
          </div>
        </div>
      ),
      label: 'Come lavori',
    },
    // Step 3 - services
    {
      screen: (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: '55%', marginBottom: 4 }} />
          {['Taglio Classico · €18 · 30m', 'Taglio + Barba · €28 · 45m', 'Barba · €14 · 20m'].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: i < 2 ? 'rgba(233,69,96,0.15)' : 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', border: i < 2 ? '1px solid rgba(233,69,96,0.3)' : '1px solid transparent' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: i < 2 ? '#E94560' : 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
                {i < 2 && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 9, color: i < 2 ? '#ffffff' : 'rgba(255,255,255,0.5)' }}>{s}</span>
            </div>
          ))}
        </div>
      ),
      label: 'Servizi selezionati',
    },
    // Step 4 - hours
    {
      screen: (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, width: '45%', marginBottom: 4 }} />
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((d, i) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '6px 10px' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', width: 20 }}>{d}</span>
              <div style={{ width: 24, height: 12, borderRadius: 99, background: i < 5 ? '#10B981' : 'rgba(255,255,255,0.15)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', margin: '1px', marginLeft: i < 5 ? 13 : 1, transition: 'margin 200ms' }} />
              </div>
              <span style={{ fontSize: 9, color: i < 5 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', marginLeft: 2 }}>
                {i < 5 ? '09:00 – 19:00' : 'Chiuso'}
              </span>
            </div>
          ))}
        </div>
      ),
      label: 'Orari impostati',
    },
  ]

  const content = stepContent[Math.min(stepNumber - 1, stepContent.length - 1)]

  return (
    <div style={{ width: '100%', maxWidth: 200, margin: '0 auto' }}>
      {/* Phone frame */}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        overflow: 'hidden',
      }}>
        {/* Status bar */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Styll</div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[6, 8, 10, 12, 10, 7].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: 'rgba(255,255,255,0.3)', borderRadius: 1, alignSelf: 'flex-end' }} />
            ))}
          </div>
        </div>
        {/* Screen content */}
        {content?.screen}
      </div>
      {/* Label */}
      {content?.label && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12, fontWeight: 500 }}>
          {content.label}
        </p>
      )}
    </div>
  )
}

export function OnboardingShell({
  stepNumber,
  totalSteps,
  stepLabel,
  title,
  subtitle,
  illustration,
  children,
  footer,
}: OnboardingShellProps) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col lg:flex-row"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:w-[60%]">
        {/* Sticky header */}
        <header className="onboarding-header px-5 py-4 lg:static lg:border-b-0 lg:px-16 lg:pb-0 lg:pt-12">
          <div className="mx-auto max-w-[560px]">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
              >
                Styll
              </Link>
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--color-fg-muted)' }}
              >
                {stepNumber} / {totalSteps}
              </span>
            </div>
            <ProgressBar current={stepNumber} total={totalSteps} />
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-7 lg:px-16 lg:pt-10">
          <div className="mx-auto max-w-[560px]">
            <p
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: 'var(--color-fg-muted)' }}
            >
              {stepLabel}
            </p>
            <h1
              className="font-bold tracking-tight"
              style={{
                color: 'var(--color-fg)',
                fontSize: 'clamp(22px, 6vw, 32px)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: 'var(--color-fg-secondary)', fontSize: 14 }}
              >
                {subtitle}
              </p>
            )}
            <div className="mt-7">{children}</div>
          </div>
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="onboarding-footer px-5 pt-4 lg:static lg:border-t-0 lg:px-16 lg:pb-12 lg:pt-8">
            <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3">
              {footer}
            </div>
          </div>
        )}
      </div>

      {/* ── Dark illustration panel (desktop only) ───────────── */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:w-[40%] flex-col"
        style={{
          background: 'linear-gradient(160deg, #0d0d1a 0%, #111126 60%, #0f0f20 100%)',
        }}
      >
        {/* Decorative glows */}
        <div style={{
          position: 'absolute', top: -100, right: -80, width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,69,96,0.12) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '48px 40px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 'auto' }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 99,
                  background: i + 1 <= stepNumber
                    ? 'linear-gradient(90deg, #E94560, #7C3AED)'
                    : 'rgba(255,255,255,0.1)',
                  transition: 'background 300ms',
                }}
              />
            ))}
          </div>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            {/* Phone preview or custom illustration */}
            {illustration ? (
              <div style={{ width: '100%', maxWidth: 260, margin: '0 auto' }}>
                {illustration}
              </div>
            ) : (
              <PanelPhoneMockup stepNumber={stepNumber} />
            )}

            {/* Copy */}
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.45,
                letterSpacing: '-0.01em',
                marginBottom: 8,
              }}>
                {stepNumber === 1 && 'Il tuo negozio, la tua identità.'}
                {stepNumber === 2 && 'Setup su misura per te.'}
                {stepNumber === 3 && 'Servizi pronti in un tap.'}
                {stepNumber === 4 && 'Orari impostati, calendario operativo.'}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                {stepNumber === 1 && 'Nome, città e tipo di attività. Meno di 60 secondi.'}
                {stepNumber === 2 && 'Solo o in team — il setup si adatta al tuo modo di lavorare.'}
                {stepNumber === 3 && 'Template precompilati per barbieri. Modifica prezzi e durate quando vuoi.'}
                {stepNumber === 4 && 'Template Lun–Sab 9:00–19:00 già pronto. Cambia solo quello che serve.'}
              </p>
            </div>
          </div>

          {/* Bottom social proof */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{ display: 'flex' }}>
              {['M', 'A', 'S'].map((initial, i) => (
                <div key={i} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: ['#7C3AED', '#059669', '#E94560'][i],
                  border: '2px solid rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#ffffff',
                  marginLeft: i > 0 ? -6 : 0,
                  position: 'relative', zIndex: 3 - i,
                }}>
                  {initial}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              Setup medio: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>7 minuti</strong>
            </span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const idx = i + 1
          const done = idx < current
          const active = idx === current
          return (
            <span
              key={idx}
              aria-hidden
              className="h-[3px] flex-1 rounded-full transition-all duration-300"
              style={{
                backgroundColor: done
                  ? 'var(--color-fg)'
                  : active
                    ? 'var(--color-fg-secondary)'
                    : 'var(--color-border)',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

interface NavFooterProps {
  backHref?: string
  nextLabel?: string
  nextDisabled?: boolean
  nextLoading?: boolean
  onNext?: () => void
  rightSlot?: ReactNode
  nextType?: 'button' | 'submit'
}

export function NavFooter({
  backHref,
  nextLabel = 'Avanti →',
  nextDisabled,
  nextLoading,
  onNext,
  rightSlot,
  nextType = 'button',
}: NavFooterProps) {
  return (
    <>
      {backHref ? (
        <Link
          href={backHref}
          className="tap-target inline-flex items-center rounded-[12px] border px-5 py-3 text-sm font-medium transition-colors hover:bg-[color:var(--color-bg-secondary)]"
          style={{
            color: 'var(--color-fg-secondary)',
            borderColor: 'var(--color-border)',
            backgroundColor: 'transparent',
          }}
        >
          ← Indietro
        </Link>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        {rightSlot}
        <button
          type={nextType}
          onClick={onNext}
          disabled={nextDisabled || nextLoading}
          className="tap-target styll-btn-primary px-6 py-3 text-sm"
          style={{ minHeight: 52 }}
        >
          {nextLoading ? 'Salvataggio…' : nextLabel}
        </button>
      </div>
    </>
  )
}

export type { WorkMode }
