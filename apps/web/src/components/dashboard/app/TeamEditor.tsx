'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Info } from 'lucide-react'
import { updateTeamDescription } from '@/lib/actions/app-settings'
import type { WebsiteStaff } from '@/lib/actions/app-settings'

interface Props {
  staff: WebsiteStaff[]
  onToggle: (id: string, value: boolean) => void
  initialTeamDescription: string | null
}

function getInitials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function TeamEditor({ staff, onToggle, initialTeamDescription }: Props) {
  const [description, setDescription] = React.useState(initialTeamDescription ?? '')
  const [saving, setSaving] = React.useState(false)

  const dirty = description.trim() !== (initialTeamDescription ?? '').trim()
  const visibleCount = staff.filter((m) => m.showOnWebsite).length
  const showWarning = staff.length > 0 && visibleCount < 2

  async function handleSave() {
    setSaving(true)
    const result = await updateTeamDescription(description.trim() || null)
    setSaving(false)
    if (result.ok) {
      toast.success('Salvato ✓')
    } else {
      toast.error(result.error ?? 'Errore salvataggio')
    }
  }

  return (
    <div
      style={{
        background: '#FFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Il nostro Team</h2>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            Gestisci la visibilità dei membri del team nella landing page.
          </p>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 100,
            background: visibleCount >= 2 ? '#F0FDF4' : '#FFF7ED',
            color: visibleCount >= 2 ? '#15803D' : '#B45309',
            border: `1px solid ${visibleCount >= 2 ? '#BBF7D0' : '#FDE68A'}`,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {visibleCount} {visibleCount === 1 ? 'membro visibile' : 'membri visibili'}
        </div>
      </div>

      <div style={{ height: 1, background: '#F3F4F6' }} />

      {/* Description field */}
      <div>
        <label
          style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}
        >
          Sottotitolo sezione team{' '}
          <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 80 caratteri)</span>
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <input
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                borderRadius: 10,
                border: '1.5px solid #E5E7EB',
                outline: 'none',
                background: '#FFFFFF',
                color: '#111111',
                boxSizing: 'border-box',
              }}
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 80))}
              placeholder="Chi ti servirà con passione e competenza"
              maxLength={80}
            />
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>
              {description.length}/80
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            style={{
              padding: '10px 16px',
              background: dirty ? '#111827' : '#F3F4F6',
              color: dirty ? '#FFFFFF' : '#9CA3AF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: dirty && !saving ? 'pointer' : 'default',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              transition: 'all 150ms ease',
            }}
          >
            {saving ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>

      <div style={{ height: 1, background: '#F3F4F6' }} />

      {/* Staff list */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
          Membri del team
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px' }}>
          Attiva o disattiva la visibilità di ogni membro sulla landing page.
        </p>

        {staff.length === 0 && (
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessun membro dello staff attivo.</p>
        )}

        {staff.map((member) => {
          const initials = getInitials(member.fullName ?? '?')
          return (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: '#F3F4F6',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6B7280',
                }}
              >
                {member.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: member.showOnWebsite ? '#111827' : '#9CA3AF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {member.fullName ?? 'Staff'}
                </p>
                {member.role && (
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>{member.role}</p>
                )}
                {!member.showOnWebsite && (
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                    Non visibile nel sito
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => onToggle(member.id, !member.showOnWebsite)}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  padding: 2,
                  border: 'none',
                  cursor: 'pointer',
                  background: member.showOnWebsite ? '#111827' : '#D1D5DB',
                  flexShrink: 0,
                  position: 'relative',
                  transition: 'background 150ms ease',
                }}
                aria-label={member.showOnWebsite ? 'Disabilita' : 'Abilita'}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#FFF',
                    position: 'absolute',
                    top: 2,
                    left: member.showOnWebsite ? 22 : 2,
                    transition: 'left 150ms ease',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Warning: fewer than 2 visible */}
      {showWarning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            background: '#FFF9ED',
            border: '1px solid #FDE68A',
            borderRadius: 10,
          }}
        >
          <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
            Attenzione: con {visibleCount} {visibleCount === 1 ? 'membro visibile' : 'membri visibili'} la
            sezione non apparirà sul sito.
          </p>
        </div>
      )}

      {/* Info note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '10px 12px',
          background: '#F0F9FF',
          border: '1px solid #BAE6FD',
          borderRadius: 10,
        }}
      >
        <Info size={14} style={{ color: '#0369A1', flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#0C4A6E', lineHeight: 1.5 }}>
          La sezione &quot;Il nostro Team&quot; appare solo se almeno 2 membri sono impostati come
          visibili.
        </p>
      </div>
    </div>
  )
}
