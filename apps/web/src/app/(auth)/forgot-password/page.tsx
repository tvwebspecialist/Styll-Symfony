import Link from 'next/link'
import type { Metadata } from 'next'

import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { ForgotIllustration } from '@/components/illustrations'

export const metadata: Metadata = {
  title: 'Recupera password — Styll',
}

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout
      illustration={<ForgotIllustration />}
      caption="Ti rispediamo dentro in un click."
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

      <header className="mt-6 mb-7">
        <h1
          className="auth-heading font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', fontSize: 26 }}
        >
          Password dimenticata?
        </h1>
        <p
          className="mt-1.5 text-sm"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Inserisci la tua email e ti invieremo un link per reimpostarla.
        </p>
      </header>

      <ForgotPasswordForm />

      <p
        className="mt-6 text-center text-sm"
        style={{ color: 'var(--color-fg-secondary)' }}
      >
        Te la sei ricordata?{' '}
        <Link
          href="/login"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg)' }}
        >
          Torna al login
        </Link>
      </p>
    </AuthSplitLayout>
  )
}
