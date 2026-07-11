'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_CONSENT_COPY,
  ANALYTICS_PREFERENCES_SECTION_ID,
  ANALYTICS_CONSENT_SOURCE,
  type AnalyticsConsentChoiceSource,
} from '@/lib/analytics-consent-copy'
import { persistAnalyticsConsentChoice, syncAnalyticsConsentState } from '@/lib/analytics-consent'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

function statusLabel(state: 'accepted' | 'rejected' | 'unknown'): string {
  switch (state) {
    case 'accepted':
      return 'Analytics opzionali attivi'
    case 'rejected':
      return 'Analytics opzionali disattivati'
    default:
      return 'Scelta non ancora registrata'
  }
}

function statusDescription(state: 'accepted' | 'rejected' | 'unknown'): string {
  switch (state) {
    case 'accepted':
      return ANALYTICS_CONSENT_COPY.acceptedDescription
    case 'rejected':
      return ANALYTICS_CONSENT_COPY.rejectedDescription
    default:
      return ANALYTICS_CONSENT_COPY.unknownDescription
  }
}

function formatOccurredAt(value: string | null): string | null {
  if (!value) return null
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return null
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export function AnalyticsPreferencesCard({
  source = ANALYTICS_CONSENT_SOURCE.COOKIE_POLICY,
}: {
  source?: AnalyticsConsentChoiceSource
}) {
  const { state, ready } = useAnalyticsConsent()
  const [savingState, setSavingState] = useState<'accepted' | 'rejected' | null>(null)
  const [occurredAt, setOccurredAt] = useState<string | null>(null)
  const [policyVersion, setPolicyVersion] = useState(ANALYTICS_CONSENT_POLICY_VERSION)

  const currentLabel = useMemo(() => statusLabel(state), [state])
  const currentDescription = useMemo(() => statusDescription(state), [state])
  const formattedOccurredAt = useMemo(() => formatOccurredAt(occurredAt), [occurredAt])

  useEffect(() => {
    if (!ready) return

    let cancelled = false

    syncAnalyticsConsentState()
      .then((snapshot) => {
        if (cancelled) return
        setOccurredAt(snapshot.occurredAt)
        setPolicyVersion(snapshot.policyVersion)
      })
      .catch(() => {
        if (cancelled) return
        setOccurredAt(null)
        setPolicyVersion(ANALYTICS_CONSENT_POLICY_VERSION)
      })

    return () => {
      cancelled = true
    }
  }, [ready, state])

  async function handleChoice(nextState: 'accepted' | 'rejected') {
    setSavingState(nextState)
    try {
      const snapshot = await persistAnalyticsConsentChoice(nextState, { source })
      setOccurredAt(snapshot.occurredAt)
      setPolicyVersion(snapshot.policyVersion)
    } finally {
      setSavingState(null)
    }
  }

  return (
    <section
      id={ANALYTICS_PREFERENCES_SECTION_ID}
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: 16,
        padding: '20px 24px',
        background: '#FFFFFF',
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1A1A2E',
          margin: '0 0 10px',
        }}
      >
        {ANALYTICS_CONSENT_COPY.preferencesTitle}
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.75, margin: '0 0 16px' }}>
        {ANALYTICS_CONSENT_COPY.preferencesBody}
      </p>

      <div
        style={{
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          background: '#F8F8FC',
          padding: '14px 16px',
          marginBottom: 16,
        }}
      >
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1A1A2E' }}>
          Stato attuale
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
          {ready ? currentLabel : 'Caricamento preferenze…'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          {ready ? currentDescription : 'Stiamo verificando la tua scelta salvata lato server.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          onClick={() => void handleChoice('accepted')}
          disabled={savingState !== null}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: 'none',
            background: '#1A1A2E',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            cursor: savingState ? 'wait' : 'pointer',
            opacity: savingState && savingState !== 'accepted' ? 0.7 : 1,
          }}
        >
          {savingState === 'accepted' ? 'Salvataggio…' : ANALYTICS_CONSENT_COPY.acceptLabel}
        </button>
        <button
          type="button"
          onClick={() => void handleChoice('rejected')}
          disabled={savingState !== null}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: 14,
            fontWeight: 700,
            cursor: savingState ? 'wait' : 'pointer',
            opacity: savingState && savingState !== 'rejected' ? 0.7 : 1,
          }}
        >
          {savingState === 'rejected'
            ? 'Salvataggio…'
            : state === 'accepted'
              ? 'Revoca analytics'
              : ANALYTICS_CONSENT_COPY.rejectLabel}
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#94A3B8', margin: '14px 0 0', lineHeight: 1.6 }}>
        Versione del testo: <strong>{policyVersion}</strong>.{' '}
        {formattedOccurredAt
          ? (
            <>
              Ultima scelta registrata lato server: <strong>{formattedOccurredAt}</strong>.
            </>
          )
          : (
            <>
              La scelta viene registrata lato server con timestamp e, quando disponibili, indirizzo IP e
              user agent.
            </>
          )}
      </p>
    </section>
  )
}
