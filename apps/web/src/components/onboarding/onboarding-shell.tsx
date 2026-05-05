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
  /** Footer custom — di solito i bottoni nav */
  footer?: ReactNode
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
        {/* Sticky header — shows on all viewports */}
        <header className="onboarding-header px-5 py-4 lg:static lg:border-b-0 lg:px-16 lg:pb-0 lg:pt-12">
          <div className="mx-auto max-w-[560px]">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-fg)' }}
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

        {/* Sticky footer with safe-area support */}
        {footer && (
          <div className="onboarding-footer px-5 pt-4 lg:static lg:border-t-0 lg:px-16 lg:pb-12 lg:pt-8">
            <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3">
              {footer}
            </div>
          </div>
        )}
      </div>

      {/* ── Illustration panel (desktop only) ───────────────── */}
      {illustration && (
        <aside
          className="relative hidden flex-col items-center justify-center px-12 py-16 lg:flex lg:w-[40%]"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderLeft: '1px solid var(--color-border)',
          }}
        >
          <div className="w-full max-w-md">{illustration}</div>
        </aside>
      )}
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
