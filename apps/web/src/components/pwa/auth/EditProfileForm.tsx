'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientProfile } from '@/lib/actions/pwa-auth'

interface EditProfileFormProps {
  tenantId: string
  basePath: string
  initialValues: {
    fullName: string
    email: string
    dateOfBirth: string
    preferredContactChannel: string
  }
}

const CHANNEL_OPTIONS = [
  { value: 'push', label: 'Push' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
]

export function EditProfileForm({ tenantId, basePath, initialValues }: EditProfileFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialValues.fullName)
  const [email, setEmail] = useState(initialValues.email)
  const [dateOfBirth, setDateOfBirth] = useState(initialValues.dateOfBirth)
  const [preferredContactChannel, setPreferredContactChannel] = useState(
    initialValues.preferredContactChannel,
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setLoading(true)
    setMessage(null)

    const result = await updateClientProfile(tenantId, {
      fullName,
      email,
      dateOfBirth,
      preferredContactChannel,
    })

    setLoading(false)

    if (!result.success) {
      setMessage({ kind: 'error', text: result.error ?? 'Qualcosa è andato storto. Riprova.' })
      return
    }

    setMessage({ kind: 'success', text: 'Profilo aggiornato con successo.' })
    router.refresh()
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #F0F0F0',
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222222' }}>I miei dati</h1>
        <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 6 }}>
          Aggiorna le informazioni del tuo profilo cliente.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#222222' }}>Nome completo</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Mario Rossi"
            style={{
              width: '100%',
              height: 50,
              borderRadius: 14,
              border: '1.5px solid #E0E0E0',
              padding: '0 14px',
              outline: 'none',
              fontSize: 15,
              color: '#222222',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#222222' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@email.it"
            style={{
              width: '100%',
              height: 50,
              borderRadius: 14,
              border: '1.5px solid #E0E0E0',
              padding: '0 14px',
              outline: 'none',
              fontSize: 15,
              color: '#222222',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#222222' }}>Data di nascita</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 14,
              border: '1.5px solid #E0E0E0',
              padding: '0 14px',
              outline: 'none',
              fontSize: 15,
              color: '#222222',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#222222' }}>Canale notifiche</span>
          <select
            value={preferredContactChannel}
            onChange={(event) => setPreferredContactChannel(event.target.value)}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 14,
              border: '1.5px solid #E0E0E0',
              padding: '0 14px',
              outline: 'none',
              fontSize: 15,
              color: '#222222',
              background: '#FFFFFF',
            }}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message ? (
        <p
          style={{
            marginTop: 14,
            fontSize: 13,
            color: message.kind === 'success' ? '#16A34A' : '#FF3B30',
          }}
        >
          {message.text}
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 100,
            border: 'none',
            background: loading ? '#E0E0E0' : 'var(--brand-primary)',
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Salvataggio...' : 'Salva modifiche'}
        </button>

        <button
          type="button"
          onClick={() => {
            router.push(`${basePath}/profilo`)
            router.refresh()
          }}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 100,
            border: '1.5px solid #E0E0E0',
            background: '#FFFFFF',
            color: '#222222',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Torna al profilo
        </button>
      </div>
    </div>
  )
}
