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
        className="text-2xl font-bold tracking-tight"
        style={{ color: 'var(--color-fg)' }}
      >
        Styll
      </Link>

      <header className="mt-6 mb-7">
        <h1
          className="font-bold tracking-tight"
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
