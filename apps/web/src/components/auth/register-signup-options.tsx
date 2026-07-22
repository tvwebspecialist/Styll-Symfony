'use client'

import { useState } from 'react'

import { RegisterForm } from '@/components/auth/register-form'

export function RegisterSignupOptions() {
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  return (
    <RegisterForm
      acceptedTerms={acceptedTerms}
      onAcceptedTermsChange={setAcceptedTerms}
    />
  )
}
