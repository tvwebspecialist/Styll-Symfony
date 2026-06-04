'use client'

import { useState, useTransition } from 'react'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { registerClient, mergeClientProfile, resendVerificationEmail } from '@/lib/actions/client-auth'
import { createGuestBooking } from '@/lib/actions/create-booking'
import { savePendingBooking, clearPendingBooking } from '@/lib/pwa-pending-booking'

interface Props {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  serviceIds: string[]
  date: string
  time: string
  primaryColor?: string
  onSuccess: (appointmentId: string) => void
}

type Tab = 'register' | 'login'
type Screen = 'form' | 'verify-email'

function mapLoginError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid') || m.includes('credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return "Verifica prima l'email per accedere."
  if (m.includes('too many') || m.includes('rate')) return 'Troppe richieste. Riprova tra qualche minuto.'
  return 'Qualcosa è andato storto. Riprova.'
}

export function BookingAuthStep({
  slug,
  tenantId,
  locationId,
  staffId,
  serviceIds,
  date,
  time,
  primaryColor,
  onSuccess,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const [tab, setTab] = useState<Tab>('register')
  const [screen, setScreen] = useState<Screen>('form')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  function fieldStyle(key: string) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 12,
      border: `1.5px solid ${focusedField === key ? brandColor : '#E0E0E0'}`,
      background: 'white',
      fontSize: 15,
      color: '#111',
      outline: 'none',
      boxSizing: 'border-box' as const,
    }
  }

  function handleRegister() {
    setError('')
    const fn = firstName.trim()
    const ln = lastName.trim()
    const ph = regPhone.trim()
    const em = regEmail.trim().toLowerCase()
    const pw = regPassword

    if (!fn || !ln) { setError('Inserisci nome e cognome.'); return }
    if (ph.length < 6) { setError('Inserisci un numero di telefono valido.'); return }
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setError('Inserisci un indirizzo email valido.'); return }
    if (pw.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return }

    const fullName = `${fn} ${ln}`

    startTransition(async () => {
      savePendingBooking({
        slug, tenantId, locationId, staffId, serviceIds, date, time,
        fullName, phone: ph, email: em, pendingAuth: true,
      })

      const result = await registerClient({
        tenantId, email: em, password: pw, fullName, phone: ph,
        tenantSlug: slug, marketingConsent: false,
      })

      if (!result.success) {
        clearPendingBooking()
        if (result.type === 'already_exists') {
          setTab('login')
          setLoginEmail(em)
          setError('Hai già un account con questa email. Accedi per procedere.')
          return
        }
        setError(result.error)
        return
      }

      setVerificationEmail(em)
      setScreen('verify-email')
    })
  }

  function handleLogin() {
    setError('')
    const em = loginEmail.trim().toLowerCase()
    if (!em || !loginPassword) { setError('Compila tutti i campi.'); return }

    startTransition(async () => {
      const pwa = createPwaClient()
      const { data, error: authError } = await pwa.auth.signInWithPassword({
        email: em,
        password: loginPassword,
      })

      if (authError) { setError(mapLoginError(authError.message)); return }
      if (!data.user || !data.session) { setError('Qualcosa è andato storto. Riprova.'); return }

      const cookieClient = createClient()
      await cookieClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      const { data: profile } = await cookieClient
        .from('profiles').select('user_type').eq('id', data.user.id).single()

      if (profile?.user_type !== 'client') {
        await pwa.auth.signOut({ scope: 'local' })
        await cookieClient.auth.signOut({ scope: 'local' })
        setError('Questo portale è riservato ai clienti.')
        return
      }

      const meta = data.user.user_metadata ?? {}
      const fullName = typeof meta.full_name === 'string' ? meta.full_name : ''
      const phone = typeof meta.phone === 'string' ? meta.phone : ''

      try {
        await mergeClientProfile({
          tenantId, profileId: data.user.id,
          email: data.user.email ?? em,
          phone, fullName,
          marketingConsent: Boolean(meta.marketing_consent),
        })
      } catch { /* non-blocking */ }

      if (!phone) {
        setError('Il tuo profilo non ha un numero di telefono. Aggiornalo nel profilo e riprova.')
        return
      }

      const result = await createGuestBooking({
        slug, tenantId, locationId, staffId, serviceIds, date, time,
        fullName: fullName || em, phone,
        email: data.user.email ?? em,
        notes: '', marketingConsent: false, productIds: [],
      })

      if (!result.success || !result.appointmentId) {
        setError(result.error ?? 'Non siamo riusciti a confermare la prenotazione.')
        return
      }

      onSuccess(result.appointmentId)
    })
  }

  function handleResend() {
    startTransition(async () => {
      await resendVerificationEmail({ email: verificationEmail, tenantSlug: slug })
    })
  }

  if (screen === 'verify-email') {
    return (
      <div
        style={{
          margin: 16,
          padding: 24,
          background: 'white',
          borderRadius: 20,
          textAlign: 'center',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
          paddingBottom: 32,
        }}
      >
        <div style={{ fontSize: 40 }}>✉️</div>
        <h2 style={{ margin: '12px 0 0', fontSize: 18, fontWeight: 800, color: '#111' }}>
          Controlla la tua email
        </h2>
        <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: '1.6', color: 'rgba(0,0,0,0.55)' }}>
          Abbiamo inviato un link a{' '}
          <strong style={{ color: '#111' }}>{verificationEmail}</strong>.
          Clicca il link per attivare il tuo account e completare la prenotazione.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={handleResend}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            border: `1.5px solid ${brandColor}`,
            background: 'white',
            fontSize: 15,
            fontWeight: 700,
            color: brandColor,
            cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          Reinvia email
        </button>
        <button
          type="button"
          onClick={() => { setScreen('form'); clearPendingBooking() }}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'transparent',
            fontSize: 14,
            color: 'rgba(0,0,0,0.45)',
            cursor: 'pointer',
          }}
        >
          ← Cambia email
        </button>
      </div>
    )
  }

  const primaryBtnStyle: CSSProperties = {
    marginTop: 4,
    width: '100%',
    padding: '16px',
    borderRadius: 14,
    border: 'none',
    background: isPending ? `${brandColor}99` : brandColor,
    fontSize: 15,
    fontWeight: 700,
    color: 'white',
    cursor: isPending ? 'not-allowed' : 'pointer',
  }

  return (
    <div style={{ margin: 16, paddingBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          background: '#F0F0F0',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
          gap: 4,
        }}
      >
        {(['register', 'login'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError('') }}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              background: tab === t ? 'white' : 'transparent',
              color: tab === t ? '#111' : 'rgba(0,0,0,0.4)',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t === 'register' ? 'Registrati' : 'Accedi'}
          </button>
        ))}
      </div>

      {error ? (
        <div
          style={{
            margin: '0 0 12px',
            padding: '10px 14px',
            background: '#FEF2F2',
            borderRadius: 10,
            fontSize: 13,
            color: '#DC2626',
          }}
        >
          {error}
        </div>
      ) : null}

      {tab === 'register' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onFocus={() => setFocusedField('firstName')}
              onBlur={() => setFocusedField(null)}
              placeholder="Nome"
              style={fieldStyle('firstName')}
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onFocus={() => setFocusedField('lastName')}
              onBlur={() => setFocusedField(null)}
              placeholder="Cognome"
              style={fieldStyle('lastName')}
            />
          </div>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={regPhone}
            onChange={(e) => setRegPhone(e.target.value)}
            onFocus={() => setFocusedField('regPhone')}
            onBlur={() => setFocusedField(null)}
            placeholder="Telefono"
            style={fieldStyle('regPhone')}
          />
          <input
            type="email"
            autoComplete="email"
            value={regEmail}
            onChange={(e) => setRegEmail(e.target.value)}
            onFocus={() => setFocusedField('regEmail')}
            onBlur={() => setFocusedField(null)}
            placeholder="Email"
            style={fieldStyle('regEmail')}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            onFocus={() => setFocusedField('regPassword')}
            onBlur={() => setFocusedField(null)}
            placeholder="Password (min. 8 caratteri)"
            style={fieldStyle('regPassword')}
          />
          <button type="button" disabled={isPending} onClick={handleRegister} style={primaryBtnStyle}>
            {isPending ? 'Attendere...' : 'Crea account e prenota →'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            autoComplete="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            onFocus={() => setFocusedField('loginEmail')}
            onBlur={() => setFocusedField(null)}
            placeholder="Email"
            style={fieldStyle('loginEmail')}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onFocus={() => setFocusedField('loginPassword')}
            onBlur={() => setFocusedField(null)}
            placeholder="Password"
            style={fieldStyle('loginPassword')}
          />
          <button type="button" disabled={isPending} onClick={handleLogin} style={primaryBtnStyle}>
            {isPending ? 'Attendere...' : 'Accedi e prenota →'}
          </button>
        </div>
      )}
    </div>
  )
}
