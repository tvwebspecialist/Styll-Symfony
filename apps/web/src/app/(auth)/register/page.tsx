import Link from 'next/link'
import type { Metadata } from 'next'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { GoogleButton } from '@/components/auth/google-button'
import { RegisterForm } from '@/components/auth/register-form'
import { RegisterIllustration } from '@/components/illustrations'

export const metadata: Metadata = {
  title: 'Crea il tuo account — Styll',
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

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      illustration={<RegisterIllustration />}
      caption="Zero commissioni. Il tuo brand. I tuoi dati. Sempre."
      mobileTopRight={
        <Link
          href="/login"
          className="text-xs font-medium"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Accedi
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
            <span style={{ color: '#fff', fontSize: 20 }}>🚀</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#222222' }}>
              Inizia gratis oggi
            </div>
            <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
              14 giorni di prova. Nessuna carta richiesta.
            </div>
          </div>
        </div>
      </div>

      <header className="mt-6 mb-7">
        <h1
          className="auth-heading font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 26 }}
        >
          Inizia gratis.
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          14 giorni di prova. Nessuna carta richiesta.
        </p>
      </header>

      <GoogleButton label="Continua con Google" />

      <Divider />

      <RegisterForm />

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Hai già un account?{' '}
        <Link
          href="/login"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Accedi
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
