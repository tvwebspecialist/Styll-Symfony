'use client'

import * as React from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { SubscriptionInfo } from '@/lib/actions/profilo'
import { primaryButtonStyle } from '../ui'

export function Abbonamento({ subscription }: { subscription: SubscriptionInfo }) {
  const renewal = subscription.renewalDate
    ? new Date(subscription.renewalDate).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Plan card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #222222 100%)',
          color: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{subscription.planName}</div>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 100,
              background: 'rgba(34, 197, 94, 0.18)',
              color: '#86EFAC',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Piano attivo
          </span>
        </div>

        <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700 }}>
          €{subscription.priceMonthly.toFixed(2)}
          <span style={{ fontSize: 14, color: '#A1A1AA', fontWeight: 500 }}> / mese</span>
        </div>

        {renewal && (
          <div style={{ fontSize: 13, color: '#A1A1AA', marginTop: 6 }}>
            Rinnovo il {renewal}
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0', display: 'grid', gap: 8 }}>
          {subscription.features.map((f) => (
            <li
              key={f}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: '#FAFAFA',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 100,
                  background: 'rgba(255,255,255,0.12)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={12} color="#86EFAC" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade card */}
      {!subscription.isPro && (
        <div
          style={{
            background: '#F9F9F9',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #F0F0F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Sparkles size={18} color="#222222" />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#222222' }}>Passa a Growth</div>
          </div>
          <div style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 14 }}>
            Sblocca tutto il potenziale di Styll.
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 16px',
              display: 'grid',
              gap: 8,
            }}
          >
            {[
              'Foto portfolio illimitate',
              'Notifiche SMS automatiche',
              'Report avanzati e CSV export',
              'Multi-sede inclusa',
            ].map((f) => (
              <li
                key={f}
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#222222' }}
              >
                <Check size={14} color="#16A34A" />
                {f}
              </li>
            ))}
          </ul>
          <button style={{ ...primaryButtonStyle, width: '100%', textAlign: 'center' }}>
            Passa a Growth
          </button>
        </div>
      )}

      {/* Billing history */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#222222', marginBottom: 12 }}>
          Storico fatture
        </div>
        <div
          style={{
            border: '1px solid #F0F0F0',
            borderRadius: 12,
            padding: '32px 16px',
            textAlign: 'center',
            color: '#B0B0B0',
            fontSize: 13,
          }}
        >
          Nessuna fattura disponibile.
        </div>
      </div>
    </div>
  )
}
