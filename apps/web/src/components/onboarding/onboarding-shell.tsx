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
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <main className="flex flex-1 flex-col px-6 py-8 lg:w-[60%] lg:px-16 lg:py-12">
        <header className="flex flex-col gap-4">
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
              Step {stepNumber} — {stepLabel}
            </span>
          </div>

          <ProgressBar current={stepNumber} total={totalSteps} />
        </header>

        <div className="mx-auto mt-12 flex w-full max-w-[560px] flex-1 flex-col">
          <h1
            className="font-bold tracking-tight"
            style={{ color: 'var(--color-fg)', fontSize: 32, lineHeight: 1.15 }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-2 text-sm"
              style={{ color: 'var(--color-fg-secondary)', fontSize: 15 }}
            >
              {subtitle}
            </p>
          )}

          <div className="mt-8 flex-1">{children}</div>

          {footer && <div className="mt-12 flex items-center justify-between">{footer}</div>}
        </div>
      </main>

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
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const idx = i + 1
          const done = idx < current
          const active = idx === current
          return (
            <span
              key={idx}
              aria-hidden
              className="h-[3px] flex-1 rounded-full transition-colors"
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
      <span
        className="text-[11px] font-medium"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        {current} di {total}
      </span>
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
          className="inline-flex items-center rounded-[12px] border px-5 py-3 text-sm font-medium transition-colors hover:bg-[color:var(--color-bg-secondary)]"
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
          className="styll-btn-primary px-6 py-3 text-sm"
        >
          {nextLoading ? 'Salvataggio…' : nextLabel}
        </button>
      </div>
    </>
  )
}

export type { WorkMode }
