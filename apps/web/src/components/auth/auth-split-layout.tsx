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
      className="flex min-h-screen flex-col lg:flex-row"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Header mobile */}
      <div
        className="flex items-center justify-between border-b px-6 py-4 lg:hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <Link
          href="/"
          className="text-lg font-bold tracking-tight"
          style={{ color: 'var(--color-fg)' }}
        >
          Styll
        </Link>
        {mobileTopRight}
      </div>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-6 py-12 lg:w-[60%] lg:px-12">
        <div className="w-full" style={{ maxWidth: 440 }}>
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
