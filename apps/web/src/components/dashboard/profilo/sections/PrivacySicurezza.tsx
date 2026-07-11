'use client'

import * as React from 'react'
import { Monitor } from 'lucide-react'
import Link from 'next/link'
import { ANALYTICS_PREFERENCES_SECTION_ID } from '@/lib/analytics-consent-copy'
import {
  getActiveSessions,
  terminateSession,
  exportUserData,
  deleteAccount,
  type ActiveSession,
} from '@/lib/actions/profilo'
import { useShadowMode } from '@/lib/hooks/use-shadow-mode'
import { outlineButtonStyle, StyledInput, Field, Toast } from '../ui'

const SHADOW_TOOLTIP = 'Non disponibile in modalità shadow'

export function PrivacySicurezza({ email }: { email: string }) {
  const { active: isShadow } = useShadowMode()
  const [sessions, setSessions] = React.useState<ActiveSession[]>([])
  const [loading, setLoading] = React.useState(true)
  const [exporting, setExporting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmInput, setConfirmInput] = React.useState('')
  const [deleting, setDeleting] = React.useState(false)
  const [msg, setMsg] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getActiveSessions()
      .then((s) => {
        if (!cancelled) {
          setSessions(s)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleTerminate = async () => {
    const res = await terminateSession()
    if (res.ok) window.location.assign('/login')
  }

  const handleExport = async () => {
    setExporting(true)
    setMsg(null)
    const res = await exportUserData()
    setExporting(false)
    if (!res.ok) {
      setMsg({ kind: 'error', text: res.error })
      return
    }
    const blob = new Blob([res.data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `styll-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    setDeleting(true)
    setMsg(null)
    const res = await deleteAccount(confirmInput)
    setDeleting(false)
    if (res.ok) {
      window.location.assign('/login')
    } else {
      setMsg({ kind: 'error', text: res.error })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {msg && <Toast message={msg.text} kind={msg.kind} />}

      {/* Sessions */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#222222', marginBottom: 12 }}>
          Sessioni attive
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: '#B0B0B0' }}>Caricamento…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '14px 16px',
                  border: '1px solid #F0F0F0',
                  borderRadius: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Monitor size={18} color="#222222" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
                      {s.device}
                      {s.current && (
                        <span
                          style={{
                            marginLeft: 8,
                            padding: '2px 8px',
                            borderRadius: 100,
                            background: '#F0FDF4',
                            color: '#16A34A',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Corrente
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#B0B0B0' }}>
                      {s.location} · {new Date(s.lastActive).toLocaleString('it-IT')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleTerminate()}
                  disabled={isShadow}
                  title={isShadow ? SHADOW_TOOLTIP : undefined}
                  style={{
                    ...outlineButtonStyle,
                    opacity: isShadow ? 0.5 : 1,
                    cursor: isShadow ? 'not-allowed' : 'pointer',
                  }}
                >
                  Termina sessione
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data export */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#222222', marginBottom: 4 }}>
          Esporta i tuoi dati
        </div>
        <div style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 14 }}>
          Riceverai un file JSON con tutti i tuoi dati personali.
        </div>
        <button onClick={handleExport} disabled={exporting} style={outlineButtonStyle}>
          {exporting ? 'Generazione…' : 'Esporta dati (JSON)'}
        </button>
        <div style={{ marginTop: 12 }}>
          <Link
            href={`/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}`}
            style={{ fontSize: 13, color: '#64748B', textDecoration: 'underline' }}
          >
            Gestisci cookie e preferenze analytics
          </Link>
        </div>
      </div>

      {/* Danger zone */}
      <div
        style={{
          border: '1px solid #FEE2E2',
          borderRadius: 12,
          padding: 20,
          background: '#FFFAFA',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
          Elimina account
        </div>
        <div style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 14 }}>
          Questa operazione cancellerà i tuoi dati personali e non è reversibile.
        </div>
        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isShadow}
            title={isShadow ? SHADOW_TOOLTIP : undefined}
            style={{
              background: isShadow ? '#F3F3F3' : '#DC2626',
              color: isShadow ? '#B0B0B0' : '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isShadow ? 'not-allowed' : 'pointer',
            }}
          >
            Elimina account
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label={`Digita "${email}" per confermare`}>
              <StyledInput
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={email}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setConfirmOpen(false)
                  setConfirmInput('')
                }}
                style={outlineButtonStyle}
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmInput !== email}
                style={{
                  background: confirmInput === email ? '#DC2626' : '#F3F3F3',
                  color: confirmInput === email ? '#FFFFFF' : '#B0B0B0',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: confirmInput === email ? 'pointer' : 'not-allowed',
                }}
              >
                {deleting ? 'Eliminazione…' : 'Conferma eliminazione'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
