'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Users, Mail, MapPin, X, Pencil, Trash2, UserCheck } from 'lucide-react'
import { StyllModal } from '@/components/ui/styll-modal'
import { inviteTeamMember, updateStaffRole, removeStaffMember, startStaffView } from '@/lib/actions/team'
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ member, onClose }: { member: StaffMemberRow; onClose: () => void }) {
  const [role, setRole] = React.useState<string>(member.role)
  const [isActive, setIsActive] = React.useState(member.isActive)
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await updateStaffRole(
        member.id,
        role as 'owner' | 'manager' | 'staff' | 'receptionist',
        isActive
      )
      if (result.success) {
        toast.success('Membro aggiornato')
        onClose()
      } else {
        toast.error(result.error || 'Errore durante l\'aggiornamento')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-secondary)' }}>Ruolo</label>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--color-border)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-fg)' }}>Stato account</div>
          <div style={{ fontSize: 12, color: 'var(--color-fg-muted)', marginTop: 2 }}>
            {isActive ? 'Membro attivo — può accedere alla dashboard' : 'Membro disattivato — accesso bloccato'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          disabled={loading}
          style={{
            width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: isActive ? '#222222' : '#D1D5DB',
            position: 'relative', flexShrink: 0, transition: 'background 200ms',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#FFF',
            left: isActive ? 23 : 3, transition: 'left 200ms',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button type="button" onClick={onClose} className="styll-btn-secondary" style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }} disabled={loading}>
          Annulla
        </button>
        <button type="submit" disabled={loading} className="styll-btn-primary" style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>
    </form>
  )
}

// ─── Remove Modal ─────────────────────────────────────────────────────────────

function RemoveModal({ member, onClose }: { member: StaffMemberRow; onClose: () => void }) {
  const [loading, setLoading] = React.useState(false)

  async function handleRemove() {
    setLoading(true)
    try {
      const result = await removeStaffMember(member.id)
      if (result.success) {
        toast.success(`${member.fullName ?? 'Membro'} rimosso dal team`)
        onClose()
      } else {
        toast.error(result.error || 'Errore durante la rimozione')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ padding: '16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
        <p style={{ fontSize: 14, color: '#7F1D1D', margin: 0, lineHeight: 1.6 }}>
          Stai per rimuovere <strong>{member.fullName ?? 'questo membro'}</strong> dal team. L&apos;operazione è reversibile solo contattando il supporto.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} className="styll-btn-secondary" style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }} disabled={loading}>
          Annulla
        </button>
        <button
          type="button"
          onClick={handleRemove}
          disabled={loading}
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 12, cursor: loading ? 'wait' : 'pointer', fontWeight: 600 }}
        >
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? 'Rimozione...' : 'Rimuovi dal team'}
        </button>
      </div>
    </div>
  )
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  owner:        { background: '#FEF3C7', color: '#92400E' },
  manager:      { background: '#EDE9FE', color: '#5B21B6' },
  staff:        { background: '#F3F4F6', color: '#374151' },
  receptionist: { background: '#EFF6FF', color: '#1D4ED8' },
}

function StaffCard({
  member,
  canEdit,
  isOwner,
  isSelf,
  onEdit,
  onRemove,
  onBecomeStaff,
}: {
  member: StaffMemberRow
  canEdit: boolean
  isOwner: boolean
  isSelf: boolean
  onEdit: (m: StaffMemberRow) => void
  onRemove: (m: StaffMemberRow) => void
  onBecomeStaff: (m: StaffMemberRow) => void
}) {
  const roleStyle = ROLE_BADGE_STYLES[member.role] ?? { background: '#F3F4F6', color: '#374151' }

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

      {/* Bottom row: role badge + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...roleStyle, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
          {ROLE_STYLES[member.role]?.label ?? member.role}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
          background: member.isActive ? '#dcfce7' : '#F3F4F6',
          color: member.isActive ? '#15803d' : '#6B7280',
        }}>
          {member.isActive ? 'Attivo' : 'Inattivo'}
        </span>
      </div>

      {/* Action buttons (only for canEdit, not on self for remove/become) */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 6, paddingTop: 4, borderTop: '1px solid var(--color-border)' }}>
          {isOwner && !isSelf && (
            <button
              type="button"
              onClick={() => onBecomeStaff(member)}
              title={`Diventa ${member.fullName ?? 'staff'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                background: '#F0FDF4', color: '#15803d', border: '1px solid #BBF7D0',
                borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1,
              }}
            >
              <UserCheck size={13} />
              Diventa
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(member)}
            title="Modifica membro"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
              background: '#F9FAFB', color: '#374151', border: '1px solid var(--color-border)',
              borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', flex: 1,
            }}
          >
            <Pencil size={13} />
            Modifica
          </button>
          {isOwner && !isSelf && (
            <button
              type="button"
              onClick={() => onRemove(member)}
              title="Rimuovi dal team"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px',
                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                borderRadius: 8, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TeamClient ───────────────────────────────────────────────────────────────

export function TeamClient({ staffMembers, currentStaff }: Omit<TeamData, 'allServices'>) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [editMember, setEditMember] = React.useState<StaffMemberRow | null>(null)
  const [removeMember, setRemoveMember] = React.useState<StaffMemberRow | null>(null)

  const canEdit = currentStaff?.role === 'owner' || currentStaff?.role === 'manager'
  const isOwner = currentStaff?.role === 'owner'

  async function handleBecomeStaff(member: StaffMemberRow) {
    const result = await startStaffView(member.id, member.fullName ?? 'Staff')
    if (result.success) {
      router.push('/calendario')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Errore nell\'attivazione della staff view')
    }
  }

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
              canEdit={canEdit}
              isOwner={isOwner}
              isSelf={currentStaff?.staffId === member.id}
              onEdit={setEditMember}
              onRemove={setRemoveMember}
              onBecomeStaff={handleBecomeStaff}
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

      {/* Edit modal */}
      <StyllModal
        open={editMember !== null}
        onClose={() => setEditMember(null)}
        title="Modifica membro"
        description={`Modifica ruolo e stato di ${editMember?.fullName ?? 'questo membro'}.`}
        size="sm"
      >
        {editMember && (
          <EditModal member={editMember} onClose={() => setEditMember(null)} />
        )}
      </StyllModal>

      {/* Remove modal */}
      <StyllModal
        open={removeMember !== null}
        onClose={() => setRemoveMember(null)}
        title="Rimuovi membro"
        description="Questa azione rimuoverà il membro dal team."
        size="sm"
      >
        {removeMember && (
          <RemoveModal member={removeMember} onClose={() => setRemoveMember(null)} />
        )}
      </StyllModal>
    </div>
  )
}
