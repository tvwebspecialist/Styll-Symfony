'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function MemberOnboardingComplete() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    const timer = setTimeout(() => {
      router.push('/dashboard/team')
    }, 2000)
    return () => clearTimeout(timer)
  }, [router])

  if (!hydrated) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '60px 40px',
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <CheckCircle size={60} style={{ color: '#059669', marginBottom: '24px' }} />
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111',
            marginBottom: '12px',
          }}
        >
          Perfetto!
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '32px',
            lineHeight: '1.5',
          }}
        >
          Hai completato l'onboarding. Stai per essere reindirizzato al team.
        </p>
      </div>
    </div>
  )
}
