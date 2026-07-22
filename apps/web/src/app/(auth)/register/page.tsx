import Link from 'next/link'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { RegisterSignupOptions } from '@/components/auth/register-signup-options'
import {
  GOOGLE_REGISTER_PENDING_COOKIE,
  decodeGoogleRegisterPendingPreview,
} from '@/lib/auth/google-register-pending'
import { buildPathWithTrialIntent, readTrialIntent } from '@/lib/trial-intent'

export const metadata: Metadata = {
  title: 'Crea il tuo account — Styll',
}

interface PageProps {
  searchParams: Promise<{
    intent?: string | string[] | undefined
    error?: string
    step?: string
    provider?: string
  }>
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams
  const cookieStore = await cookies()
  const intent = readTrialIntent(params.intent)
  const loginHref = buildPathWithTrialIntent('/login', intent)
  const googlePendingPreview = decodeGoogleRegisterPendingPreview(
    cookieStore.get(GOOGLE_REGISTER_PENDING_COOKIE)?.value ?? null,
  )
  const requestedGoogleActivityStep = params.step === 'activity' && params.provider === 'google'
  const canResumeGoogleActivityStep = requestedGoogleActivityStep && googlePendingPreview !== null
  const initialError = params.error
    ? decodeURIComponent(params.error)
    : requestedGoogleActivityStep && !canResumeGoogleActivityStep
      ? 'Registrazione Google scaduta o non valida. Riprova dal primo step.'
      : null

  return (
    <AuthSplitLayout
      caption="Zero commissioni. Il tuo brand. I tuoi dati. Sempre."
      mobileTopRight={
        <Link
          href={loginHref}
          className="text-xs font-medium"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Accedi
        </Link>
      }
    >
      <Link
        href="/"
        className="hidden lg:block text-2xl font-bold tracking-tight mb-2"
        style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
      >
        Styll
      </Link>

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
            🚀
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
              Inizia gratis oggi
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Crea il tuo spazio in pochi minuti. Nessuna carta richiesta.
            </div>
          </div>
        </div>
      </div>

      <header className="mt-4 mb-7 lg:mt-8">
        {initialError && (
          <div
            className="mb-4 rounded-md px-3 py-2 text-xs"
            style={{
              backgroundColor: '#fef2f2',
              color: 'var(--color-danger)',
              border: '1px solid #fecaca',
            }}
          >
            {initialError}
          </div>
        )}
        <h1
          className="font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 'clamp(24px, 5vw, 30px)', letterSpacing: '-0.02em' }}
        >
          Crea il tuo negozio digitale.
        </h1>
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Prima confermi i dati di accesso, poi completi i dati della tua attività nello step finale.
        </p>
      </header>

      <RegisterSignupOptions
        initialStep={canResumeGoogleActivityStep ? 'activity' : 'identity'}
        initialMethod={canResumeGoogleActivityStep ? 'google' : 'credentials'}
        initialFullName={googlePendingPreview?.fullName ?? ''}
        initialEmail={googlePendingPreview?.email ?? ''}
      />

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Hai già un account?{' '}
        <Link
          href={loginHref}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Accedi
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
