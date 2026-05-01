'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Users, Pencil, Mail, MapPin, Scissors, X } from 'lucide-react'
import { StyllModal } from '@/components/ui/styll-modal'
import { getStaffServices, setStaffServices, inviteTeamMember } from '@/lib/actions/team'
import type { TeamData, StaffMemberRow } from '@/lib/actions/team'

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#0891B2', '#65A30D', '#EA580C', '#9333EA',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(fullName: string | null): string {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ fullName, avatarUrl, size = 44 }: { fullName: string | null; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName ?? ''}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  const initials = getInitials(fullName)
  const bg = getAvatarColor(fullName ?? '?')
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { background: string; color: string; label: string }> = {
  owner: { background: '#1A1A1A', color: '#FFFFFF', label: 'Titolare' },
  manager: { background: '#374151', color: '#FFFFFF', label: 'Manager' },
  staff: { background: '#F3F4F6', color: '#374151', label: 'Staff' },
  receptionist: { background: '#EFF6FF', color: '#1D4ED8', label: 'Receptionist' },
}

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] ?? { background: '#F3F4F6', color: '#374151', label: role }
  return (
    <span
      style={{
        ...style,
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
  )
}

// ─── Staff Services Modal ─────────────────────────────────────────────────────

function StaffServicesModal({
  staff,
  allServices,
  onClose,
}: {
  staff: StaffMemberRow
  allServices: { id: string; name: string; category: string | null; is_active: boolean }[]
  onClose: () => void
}) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    getStaffServices(staff.id).then(({ serviceIds }) => {
      setSelectedIds(new Set(serviceIds))
      setLoading(false)
    })
  }, [staff.id])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    const result = await setStaffServices(staff.id, Array.from(selectedIds))
    setSaving(false)
    if (result.success) {
      toast.success('Servizi aggiornati')
      onClose()
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  // Group by category
  const grouped = React.useMemo(() => {
    const groups = new Map<string, typeof allServices>()
    for (const s of allServices) {
      const key = s.category ?? 'Senza categoria'
      const arr = groups.get(key) ?? []
      arr.push(s)
      groups.set(key, arr)
    }
    return groups
  }, [allServices])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-fg-muted)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: 0 }}>
        Seleziona i servizi che {staff.fullName ?? 'questo membro'} può eseguire.
      </p>

      {allServices.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', textAlign: 'center', padding: '24px 0' }}>
          Nessun servizio attivo nel catalogo.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from(grouped.entries()).map(([cat, items]) => (
            <div key={cat}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-fg-muted)', margin: '0 0 8px' }}>
                {cat}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((s) => (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: selectedIds.has(s.id) ? '#F0FDF4' : 'var(--color-bg-secondary)',
                      border: `1px solid ${selectedIds.has(s.id) ? '#BBF7D0' : 'var(--color-border)'}`,
                      borderRadius: 10,
                      cursor: s.is_active ? 'pointer' : 'not-allowed',
                      transition: 'background 100ms ease, border-color 100ms ease',
                      opacity: s.is_active ? 1 : 0.45,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => s.is_active && toggle(s.id)}
                      disabled={!s.is_active}
                      style={{ width: 16, height: 16, accentColor: '#16A34A', flexShrink: 0, cursor: s.is_active ? 'pointer' : 'not-allowed' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-fg)', flex: 1 }}>{s.name}</span>
                    {!s.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#F3F4F6', color: 'var(--color-fg-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
                        Non attivo
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
        <button
          type="button"
          onClick={onClose}
          className="styll-btn-secondary"
          style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="styll-btn-primary"
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          Salva servizi
        </button>
      </div>
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<string>('staff')
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    
    setLoading(true)
    try {
      const result = await inviteTeamMember(email.trim(), role as 'staff' | 'manager' | 'owner' | 'receptionist')
      
      if (result.success) {
        toast.success(`Invito inviato a ${email.trim()}`)
        setEmail('')
        setRole('staff')
        onClose()
      } else {
        toast.error(result.error || 'Errore nell\'invio dell\'invito')
      }
    } catch (error) {
      console.error('[InviteModal] Error:', error)
      toast.error('Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-secondary)' }}>
          Email <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input
          className="styll-input"
          type="email"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="mario@example.com"
          required
          disabled={loading}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-secondary)' }}>
          Ruolo
        </label>
        <select
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
        >
          <option value="owner">Titolare</option>
          <option value="manager">Manager</option>
          <option value="staff">Staff</option>
          <option value="receptionist">Receptionist</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
        <button
          type="button"
          onClick={onClose}
          className="styll-btn-secondary"
          style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}
          disabled={loading}
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="styll-btn-primary"
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? 'Invio in corso...' : 'Invia invito'}
        </button>
      </div>
    </form>
  )
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({
  member,
  allServices,
  canEdit,
}: {
  member: StaffMemberRow
  allServices: { id: string; name: string; category: string | null; is_active: boolean }[]
  canEdit: boolean
}) {
  const [servicesModalOpen, setServicesModalOpen] = React.useState(false)

  return (
    <div
      className="styll-card"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        opacity: member.isActive ? 1 : 0.55,
      }}
    >
      {/* Top row: avatar + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Avatar fullName={member.fullName} avatarUrl={member.avatarUrl} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.fullName ?? 'Senza nome'}
            </p>
            <RoleBadge role={member.role} />
            {!member.isActive && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-fg-muted)', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '2px 7px' }}>
                Inattivo
              </span>
            )}
          </div>
          {member.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <Mail size={12} style={{ color: 'var(--color-fg-muted)', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--color-fg-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.email}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Location pills */}
      {member.locationNames.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <MapPin size={12} style={{ color: 'var(--color-fg-muted)', flexShrink: 0 }} />
          {member.locationNames.map((loc) => (
            <span
              key={loc}
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-fg-secondary)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {loc}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: services count + edit button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Scissors size={13} style={{ color: 'var(--color-fg-muted)' }} />
          <span style={{ fontSize: 13, color: 'var(--color-fg-muted)' }}>
            {member.serviceCount} {member.serviceCount === 1 ? 'servizio' : 'servizi'}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setServicesModalOpen(true)}
            className="styll-btn-secondary"
            style={{ fontSize: 13, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, minHeight: 34 }}
          >
            <Pencil size={13} />
            Modifica servizi
          </button>
        )}
      </div>

      <StyllModal
        open={servicesModalOpen}
        onClose={() => setServicesModalOpen(false)}
        title={`Servizi di ${member.fullName ?? 'Staff'}`}
        description="Seleziona i servizi che questo membro può eseguire."
        size="md"
      >
        <StaffServicesModal
          staff={member}
          allServices={allServices}
          onClose={() => setServicesModalOpen(false)}
        />
      </StyllModal>
    </div>
  )
}

// ─── TeamClient ───────────────────────────────────────────────────────────────

export function TeamClient({ staffMembers, allServices, currentStaff }: TeamData) {
  const [inviteOpen, setInviteOpen] = React.useState(false)

  const canEdit =
    currentStaff?.role === 'owner' || currentStaff?.role === 'manager'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Team</h1>
          <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
            Gestisci i membri del tuo staff
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="styll-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 18px',
              fontSize: 14,
              minHeight: 44,
            }}
          >
            <Users size={16} />
            Invita membro
          </button>
        )}
      </div>

      {/* Staff list */}
      {staffMembers.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '64px 24px',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-fg-muted)',
            }}
          >
            <Users size={32} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Nessun membro</p>
            <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '6px 0 0', maxWidth: 320 }}>
              Il tuo team è vuoto. Invita i tuoi collaboratori per iniziare.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {staffMembers.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              allServices={allServices}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Invite modal */}
      <StyllModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invita membro"
        description="Invia un invito via email a un nuovo membro del team."
        size="sm"
      >
        <InviteModal onClose={() => setInviteOpen(false)} />
      </StyllModal>
    </div>
  )
}
