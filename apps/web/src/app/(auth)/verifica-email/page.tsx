import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { VerifyEmailForm } from '@/components/auth/verify-email-form'

export const metadata: Metadata = {
  title: 'Verifica email — Styll',
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain || !local) return email
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

interface PageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function VerificaEmailPage({ searchParams }: PageProps) {
  const params = await searchParams
  const email = params.email?.trim().toLowerCase()
  if (!email) redirect('/register')

  const masked = maskEmail(email)

  return (
    <AuthSplitLayout
      illustration={
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            padding: '40px 0',
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: '#222222',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 44,
            }}
          >
            ✉️
          </div>
          <p
            style={{
              fontSize: 15,
              color: 'var(--color-fg-secondary)',
              textAlign: 'center',
              maxWidth: 260,
              lineHeight: 1.5,
            }}
          >
            Controlla la posta in arrivo e inserisci il codice a 6 cifre.
          </p>
        </div>
      }
      caption="Il codice è valido per 15 minuti."
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
              fontSize: 20,
            }}
          >
            ✉️
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#222222' }}>
              Controlla la tua email
            </div>
            <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
              Codice inviato a {masked}
            </div>
          </div>
        </div>
      </div>

      <header className="mt-6 mb-7">
        <h1
          className="auth-heading font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 26 }}
        >
          Verifica la tua email.
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--color-fg-secondary)' }}>
          Abbiamo inviato un codice a{' '}
          <strong style={{ color: 'var(--color-fg)' }}>{masked}</strong>.
        </p>
      </header>

      <VerifyEmailForm email={email} />

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Email sbagliata?{' '}
        <Link
          href="/register"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Torna alla registrazione
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
