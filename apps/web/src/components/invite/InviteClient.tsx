'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { acceptInvitation, getInvitationDetails } from '@/lib/actions/invitations'

export function InviteClient({
  token,
  userId,
  userEmail,
}: {
  token: string
  userId: string
  userEmail: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<'loading' | 'confirm' | 'processing' | 'success' | 'error'>(
    'loading'
  )
  const [tenantName, setTenantName] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    loadInvitationDetails().catch(() => {
      setErrorMessage("Errore nel caricamento dell'invito. Riprova più tardi.")
      setStep('error')
    })
  }, [token])

  async function loadInvitationDetails() {
    const result = await getInvitationDetails(token)
    if (result.success) {
      setTenantName(result.tenantName || '')
      setRole(result.role || '')
      setStep('confirm')
    } else {
      setErrorMessage(result.error || "Errore nel caricamento dell'invito")
      setStep('error')
    }
  }

  async function handleAccept() {
    setStep('processing')
    const result = await acceptInvitation(token, userId)
    if (result.success) {
      setStep('success')
      // Redirect to member onboarding after 1.5 seconds
      setTimeout(() => {
        router.push(`/onboarding/member?tenant=${result.tenantId}`)
      }, 1500)
    } else {
      setErrorMessage(result.error || 'Errore nell\'accettazione dell\'invito')
      setStep('error')
    }
  }

  const roleLabel = {
    owner: 'Titolare',
    manager: 'Manager',
    staff: 'Staff',
    receptionist: 'Receptionist',
  }[role] || role

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
          padding: '40px',
          maxWidth: '450px',
          width: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        {step === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <Loader2
              size={40}
              style={{
                animation: 'spin 1s linear infinite',
                marginBottom: '20px',
                color: '#666',
              }}
            />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Caricamento invito...
            </h2>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ color: '#666' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111', marginBottom: '12px' }}>
                Benvenuto!
              </h2>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                Sei stato invitato a unirti a <strong>{tenantName}</strong> come <strong>{roleLabel}</strong>.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                <strong>Account</strong>
              </div>
              <div style={{ fontSize: '15px', color: '#111', fontWeight: '500' }}>{userEmail}</div>
            </div>

            <button
              onClick={handleAccept}
              disabled={false}
              style={{
                width: '100%',
                backgroundColor: '#111',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              Accetta invito
            </button>

            <a
              href="/"
              style={{
                display: 'block',
                width: '100%',
                backgroundColor: '#f0f0f0',
                color: '#333',
                padding: '12px 16px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Annulla
            </a>
          </div>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <Loader2
              size={40}
              style={{
                animation: 'spin 1s linear infinite',
                marginBottom: '20px',
                color: '#666',
              }}
            />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Elaborazione invito...
            </h2>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={48} style={{ color: '#059669', marginBottom: '20px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111', marginBottom: '12px' }}>
              Perfetto!
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              Stai per essere reindirizzato al completamento del profilo...
            </p>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: '#dc2626', marginBottom: '20px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626', marginBottom: '12px' }}>
              Errore
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>{errorMessage}</p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                backgroundColor: '#111',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              Torna a Styll
            </a>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
