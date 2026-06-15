'use client'

import * as React from 'react'
import { updateNotificationPreferences } from '@/lib/actions/profilo'
import { primaryButtonStyle, Toast } from '../ui'
import { StaffPushToggle } from './StaffPushToggle'

interface ToggleItem {
  key: string
  label: string
  description: string
}

interface Group {
  title: string
  items: ToggleItem[]
}

const GROUPS: Group[] = [
  {
    title: 'Appuntamenti',
    items: [
      {
        key: "appt_confirmation",
        label: "Nuova prenotazione",
        description: "Push quando un cliente prenota.",
      },
      {
        key: "appt_cancellation",
        label: "Cancellazione appuntamento",
        description: "Push quando un cliente cancella.",
      },
      {
        key: "appt_reschedule",
        label: "Appuntamento spostato",
        description: "Push quando un cliente sposta un appuntamento.",
      },
      {
        key: "appt_reminder",
        label: "Reminder 24h prima",
        description: "Push 24 ore prima dell’appuntamento del cliente.",
      },
    ],
  },
  {
    title: 'Clienti',
    items: [
      {
        key: 'client_churn',
        label: 'Alert cliente a rischio churn',
        description: 'Push + email quando un cliente smette di prenotare.',
      },
      {
        key: 'client_winback',
        label: 'Notifica win-back pronta',
        description: 'Push quando una campagna win-back è pronta.',
      },
      {
        key: 'client_new',
        label: 'Nuovo cliente registrato',
        description: 'Push quando un cliente si registra.',
      },
    ],
  },
  {
    title: 'Report',
    items: [
      {
        key: 'report_weekly',
        label: 'Report settimanale revenue',
        description: 'Email ogni lunedì mattina.',
      },
      {
        key: 'report_monthly',
        label: 'Report mensile',
        description: 'Email il primo del mese.',
      },
    ],
  },
]

const DEFAULTS: Record<string, boolean> = GROUPS.flatMap((g) => g.items)
  .reduce<Record<string, boolean>>((acc, it) => ({ ...acc, [it.key]: true }), {})

export function Notifiche({ initial, tenantId }: { initial: Record<string, boolean>; tenantId: string }) {
  const [prefs, setPrefs] = React.useState<Record<string, boolean>>({ ...DEFAULTS, ...initial })
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    const res = await updateNotificationPreferences(prefs)
    setSaving(false)
    setMsg(
      res.ok
        ? { kind: 'success', text: 'Preferenze salvate' }
        : { kind: 'error', text: res.error },
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {msg && <Toast message={msg.text} kind={msg.kind} />}

      <StaffPushToggle tenantId={tenantId} />

      {GROUPS.map((g) => (
        <div key={g.title}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              color: '#B0B0B0',
              marginBottom: 12,
            }}
          >
            {g.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.items.map((it) => (
              <div
                key={it.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 16px',
                  border: '1px solid #F0F0F0',
                  borderRadius: 12,
                  background: '#FFFFFF',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
                    {it.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>
                    {it.description}
                  </div>
                </div>
                <Switch checked={!!prefs[it.key]} onChange={() => toggle(it.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} style={primaryButtonStyle}>
          {saving ? 'Salvataggio...' : 'Salva preferenze'}
        </button>
      </div>
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 100,
        background: checked ? '#222222' : '#E9E9E9',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 150ms ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 100,
          background: '#FFFFFF',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'left 150ms ease',
        }}
      />
    </button>
  )
}
