import Link from 'next/link'
import type { ReactNode } from 'react'

interface AuthSplitLayoutProps {
  /** Sezione mobile-only mostrata in cima (es. link al register) */
  mobileTopRight?: ReactNode
  /** Illustrazione SVG mostrata sul pannello destro (grigio) */
  illustration: ReactNode
  /** Caption opzionale sotto l'illustrazione */
  caption?: string
  children: ReactNode
}

export function AuthSplitLayout({
  mobileTopRight,
  illustration,
  caption,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div
      className="flex flex-col lg:flex-row"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header mobile */}
      <div
        className="flex items-center justify-between px-5 lg:hidden"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
          paddingBottom: 16,
        }}
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
        >
          Styll
        </Link>
        {mobileTopRight && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 100,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {mobileTopRight}
          </div>
        )}
      </div>

      {/* Form */}
      <main
        className="flex flex-1 flex-col lg:w-[60%] lg:items-center lg:justify-center lg:px-12"
        style={{ overflowY: 'auto' }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: 440,
            padding: '32px 24px',
            paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          }}
        >
          {children}
        </div>
      </main>

      {/* Pannello destro grigio con illustrazione */}
      <aside
        className="relative hidden flex-col items-center justify-center lg:flex lg:w-[40%]"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <div className="flex w-full max-w-md flex-col items-center gap-8 px-10">
          <div className="w-full">{illustration}</div>
          {caption && (
            <p
              className="text-center text-sm leading-relaxed"
              style={{ color: 'var(--color-fg-secondary)', maxWidth: 320 }}
            >
              {caption}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}
