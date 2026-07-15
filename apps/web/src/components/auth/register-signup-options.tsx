'use client'

import { useState } from 'react'
import { GoogleButton } from '@/components/auth/google-button'
import { RegisterForm } from '@/components/auth/register-form'

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

export function RegisterSignupOptions({
  intent,
  token,
}: {
  intent?: string | null
  token?: string | null
}) {
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  return (
    <>
      <GoogleButton
        acceptedTerms={acceptedTerms}
        intent={intent}
        label="Continua con Google"
        onboardingToken={token}
        oauthFlow="register"
      />

      <Divider />

      <RegisterForm
        acceptedTerms={acceptedTerms}
        intent={intent}
        onAcceptedTermsChange={setAcceptedTerms}
        token={token}
      />
    </>
  )
}
