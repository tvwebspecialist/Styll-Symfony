import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { GoogleButton } from '@/components/auth/google-button'
import { LoginForm } from '@/components/auth/login-form'
import { LoginIllustration } from '@/components/illustrations'

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

export default function LoginPage() {
  return (
    <AuthSplitLayout
      illustration={<LoginIllustration />}
      caption="Accedi al tuo spazio. Tutto pronto per la prossima prenotazione."
      mobileTopRight={
        <Link
          href="/register"
          className="text-xs font-medium"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Registrati
        </Link>
      }
    >
      <Link
        href="/"
        className="hidden lg:block text-2xl font-bold tracking-tight"
        style={{ color: 'var(--color-fg)' }}
      >
        Styll
      </Link>

      {/* Mobile hero — hidden su desktop */}
      <div className="mb-6 lg:hidden">
        <div
          style={{
            background: 'var(--color-bg-secondary)',
            borderRadius: 16,
            padding: '20px 20px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#222222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: 20 }}>✂️</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#222222' }}>
              Bentornato su Styll
            </div>
            <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
              Il tuo salone ti aspetta.
            </div>
          </div>
        </div>
      </div>

      <header className="mt-6 mb-7">
        <h1
          className="auth-heading font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 26 }}
        >
          Bentornato.
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Accedi al tuo spazio.
        </p>
      </header>

      <GoogleButton label="Continua con Google" />

      <Divider />

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Non hai un account?{' '}
        <Link
          href="/register"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Registrati
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
