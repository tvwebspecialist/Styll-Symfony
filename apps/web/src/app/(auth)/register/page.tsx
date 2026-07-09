import Link from 'next/link'
import type { Metadata } from 'next'
import { MessageCircle, Mail } from 'lucide-react'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { GoogleButton } from '@/components/auth/google-button'
import { RegisterForm } from '@/components/auth/register-form'
import { buildPathWithTrialIntent, readTrialIntent } from '@/lib/trial-intent'
import { validateOnboardingToken } from '@/app/admin/actions-onboarding'

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

// ─── Contact popup shown when no valid token ───────────────────
function ContactGate({ reason }: { reason?: string }) {
  return (
    <AuthSplitLayout
      caption="Zero commissioni. Il tuo brand. I tuoi dati. Sempre."
    >
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <span style={{ fontSize: 28 }}>🔒</span>
        </div>

        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
        >
          Registrazione su invito
        </h1>
        <p
          className="mt-3 text-sm leading-relaxed max-w-xs"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          {reason
            ? reason
            : 'La registrazione è disponibile solo tramite link privato.'}
          {' '}Contattami per ricevere il tuo link personale.
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <a
            href="https://wa.me/3770802075"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: '#25D366',
              color: '#ffffff',
            }}
          >
            <MessageCircle size={18} />
            Scrivimi su WhatsApp
          </a>

          <a
            href="mailto:t.v.webspecialist@gmail.com"
            className="flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition-colors"
            style={{
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-fg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <Mail size={18} />
            Invia un'email
          </a>
        </div>

        <p
          className="mt-8 text-xs"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Già hai un link?{' '}
          <Link
            href="/register"
            className="underline underline-offset-2"
            style={{ color: 'var(--color-fg-secondary)' }}
          >
            Usa il link ricevuto
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  )
}

interface PageProps {
  searchParams: Promise<{ intent?: string | string[] | undefined; error?: string; token?: string }>
}

export default async function RegisterPage({ searchParams }: PageProps) {
  const params = await searchParams

  // ── Token gating ────────────────────────────────────────────
  const rawToken = params.token
  if (!rawToken) {
    return <ContactGate />
  }

  const validation = await validateOnboardingToken(rawToken)
  if (!validation.valid) {
    return <ContactGate reason={validation.error} />
  }

  // ── Valid token → show registration form ─────────────────────
  const intent = readTrialIntent(params.intent)
  const loginHref = buildPathWithTrialIntent('/login', intent)
  const initialError = params.error ? decodeURIComponent(params.error) : null

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
            🚀
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
              Inizia gratis oggi
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              14 giorni di prova. Nessuna carta richiesta.
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
          In 2 minuti. Nessuna carta di credito. Annulli quando vuoi.
        </p>
      </header>

      <GoogleButton label="Continua con Google" intent={intent} />

      <Divider />

      <RegisterForm intent={intent} token={rawToken} />

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
