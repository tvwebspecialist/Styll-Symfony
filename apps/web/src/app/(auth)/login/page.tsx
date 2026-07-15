import Link from 'next/link'
import type { Metadata } from 'next'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { GoogleButton } from '@/components/auth/google-button'
import { LoginForm } from '@/components/auth/login-form'
import { buildPathWithTrialIntent, readTrialIntent } from '@/lib/trial-intent'

export const metadata: Metadata = {
  title: 'Accedi — Styll',
}

function Divider() {
  return (
    <div
      className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em]"
      style={{ color: 'var(--color-fg-muted)' }}
      aria-hidden
    >
      <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
      oppure
      <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{
    intent?: string | string[] | undefined
    error?: string | string[] | undefined
    redirectTo?: string | string[] | undefined
  }>
}

function firstString(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const intent = readTrialIntent(params.intent)
  const registerHref = buildPathWithTrialIntent('/register', intent)
  const initialError = firstString(params.error)
  const redirectTo = firstString(params.redirectTo)

  return (
    <AuthSplitLayout
      caption="Il tuo salone ti aspetta. Tutto pronto per la prossima prenotazione."
      mobileTopRight={
        <Link
          href={registerHref}
          className="text-xs font-medium"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Registrati
        </Link>
      }
    >
      {/* Desktop Styll link */}
      <Link
        href="/"
        className="hidden lg:block text-2xl font-bold tracking-tight mb-2"
        style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
      >
        Styll
      </Link>

      {/* Mobile hero */}
      <div className="mb-6 mt-2 lg:hidden">
        <div
          style={{
            background: 'linear-gradient(135deg, #0d0d1a, #1a1a2e)',
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 20,
            }}
          >
            ✂️
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
              Bentornato su Styll
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Il tuo salone ti aspetta.
            </div>
          </div>
        </div>
      </div>

      <header className="mt-4 mb-7 lg:mt-8">
        <h1
          className="font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 'clamp(24px, 5vw, 30px)', letterSpacing: '-0.02em' }}
        >
          Bentornato.
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Accedi per gestire appuntamenti, clienti e loyalty.
        </p>
      </header>

      <GoogleButton intent={intent} label="Continua con Google" oauthFlow="login" />

      <Divider />

      <LoginForm initialError={initialError} redirectTo={redirectTo} />

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Non hai un account?{' '}
        <Link
          href={registerHref}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Inizia gratis →
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
