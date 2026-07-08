'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Users, Eye, MoreHorizontal, UserPlus, Clock } from 'lucide-react'
import { StyllModal } from '@/components/ui/styll-modal'
import { CustomSelect, type SelectOption } from '@/components/ui/custom-select'
import { inviteTeamMember, updateStaffRole, removeStaffMember, startStaffView } from '@/lib/actions/team'
import type { TeamData, StaffMemberRow } from '@/lib/actions/team'
import { StaffAvailabilityEditor } from './StaffAvailabilityEditor'

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

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, { background: string; color: string; label: string }> = {
  owner: { background: '#1A1A1A', color: '#FFFFFF', label: 'Titolare' },
  manager: { background: '#374151', color: '#FFFFFF', label: 'Manager' },
  staff: { background: '#F3F4F6', color: '#374151', label: 'Staff' },
  receptionist: { background: '#EFF6FF', color: '#1D4ED8', label: 'Receptionist' },
}

function getTeamRoleOptions(canAssignOwnerRole: boolean): SelectOption[] {
  return [
    ...(canAssignOwnerRole ? [{ value: 'owner', label: 'Titolare' }] : []),
    { value: 'manager', label: 'Manager' },
    { value: 'staff', label: 'Staff' },
    { value: 'receptionist', label: 'Receptionist' },
  ]
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({
  canAssignOwnerRole,
  onClose,
}: {
  canAssignOwnerRole: boolean
  onClose: () => void
}) {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<string>('staff')
  const [loading, setLoading] = React.useState(false)
  const roleOptions = React.useMemo(
    () => getTeamRoleOptions(canAssignOwnerRole),
    [canAssignOwnerRole]
  )

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
        <CustomSelect
          value={role}
          onChange={setRole}
          options={roleOptions}
          ariaLabel="Ruolo invito team"
        />
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

function EditModal({
  member,
  canAssignOwnerRole,
  onClose,
}: {
  member: StaffMemberRow
  canAssignOwnerRole: boolean
  onClose: () => void
}) {
  const [role, setRole] = React.useState<string>(member.role)
  const [isActive, setIsActive] = React.useState(member.isActive)
  const [loading, setLoading] = React.useState(false)
  const roleOptions = React.useMemo(
    () => getTeamRoleOptions(canAssignOwnerRole),
    [canAssignOwnerRole]
  )

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
        <CustomSelect
          value={role}
          onChange={setRole}
          options={roleOptions}
          ariaLabel="Ruolo membro team"
        />
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

function StaffCard({
  member,
  canEdit,
  canImpersonate,
  isSelf,
  onEdit,
  onRemove,
  onBecomeStaff,
  onAvailability,
}: {
  member: StaffMemberRow
  canEdit: boolean
  canImpersonate: boolean
  isSelf: boolean
  onEdit: (m: StaffMemberRow) => void
  onRemove: (m: StaffMemberRow) => void
  onBecomeStaff: (m: StaffMemberRow) => void
  onAvailability: (m: StaffMemberRow) => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const hasPhoto = !!(member.avatarUrl && member.avatarUrl.trim())

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        aspectRatio: '3 / 4',
        cursor: 'default',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.14)'
          : '0 2px 16px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.3s ease',
        background: 'var(--color-bg-secondary)',
        opacity: member.isActive ? 1 : 0.5,
      }}
    >
      {/* Photo / initials layer */}
      {hasPhoto ? (
        <img
          src={member.avatarUrl!}
          alt={member.fullName ?? ''}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            transition: 'transform 0.35s ease',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${getAvatarColor(member.fullName ?? '?')} 0%, ${getAvatarColor(member.fullName ?? '?')}cc 100%)`,
            fontSize: 48,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '0.02em',
            userSelect: 'none',
          }}
        >
          {getInitials(member.fullName)}
        </div>
      )}

      {/* Three-dots edit button — top-right corner */}
      {canEdit && !isSelf && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(member) }}
          title="Modifica membro"
          aria-label={`Modifica ${member.fullName ?? 'membro'}`}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
            transition: 'background 200ms ease',
          } as React.CSSProperties}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.35)' }}
        >
          <MoreHorizontal size={15} color="#FFF" />
        </button>
      )}

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'transform 0.3s ease',
          transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        }}
      >
        {/* Left: name + role */}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {member.fullName ?? 'Senza nome'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', marginTop: 3, marginBottom: 0 }}>
            {ROLE_STYLES[member.role]?.label ?? member.role}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
          {/* Availability button — visible for editors, not self */}
          {canEdit && !isSelf && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAvailability(member) }}
              title="Disponibilità & Sedi"
              aria-label={`Disponibilità ${member.fullName ?? 'membro'}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-secondary)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)' }}
            >
              <Clock size={15} color="var(--color-fg-muted)" />
            </button>
          )}

          {/* Eye button — impersonate (owner only, not self) */}
          {canImpersonate && !isSelf && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBecomeStaff(member) }}
              title={`Visualizza come ${member.fullName ?? 'Staff'}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--color-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)' }}
            >
              <Eye size={15} color="var(--color-primary-fg)" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TeamClient ───────────────────────────────────────────────────────────────

export function TeamClient({ staffMembers, currentStaff }: Omit<TeamData, 'allServices'>) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [editMember, setEditMember] = React.useState<StaffMemberRow | null>(null)
  const [removeMember, setRemoveMember] = React.useState<StaffMemberRow | null>(null)
  const [availabilityMember, setAvailabilityMember] = React.useState<StaffMemberRow | null>(null)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const currentRole = currentStaff?.role ?? null
  const canEditTeam = currentRole === 'owner' || currentRole === 'manager' || currentRole === 'superadmin'
  const canAssignOwnerRole = currentRole === 'owner' || currentRole === 'superadmin'
  const canImpersonateStaff = currentRole === 'owner' || currentRole === 'superadmin'

  function canManageMember(member: StaffMemberRow): boolean {
    if (currentRole === 'owner' || currentRole === 'superadmin') {
      return true
    }

    if (currentRole === 'manager') {
      return member.role !== 'owner'
    }

    return false
  }

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
          <h1 className="dashboard-page-title" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>
            Il tuo team
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
            Gestisci i membri del tuo team e i loro servizi.
          </p>
        </div>
        {canEditTeam && !isMobile && (
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20,
          }}
        >
          {staffMembers.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              canEdit={canManageMember(member)}
              canImpersonate={canImpersonateStaff}
              isSelf={currentStaff?.staffId === member.id}
              onEdit={setEditMember}
              onRemove={setRemoveMember}
              onBecomeStaff={handleBecomeStaff}
              onAvailability={setAvailabilityMember}
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
        <InviteModal
          canAssignOwnerRole={canAssignOwnerRole}
          onClose={() => setInviteOpen(false)}
        />
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
          <EditModal
            member={editMember}
            canAssignOwnerRole={canAssignOwnerRole}
            onClose={() => setEditMember(null)}
          />
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

      {/* Availability modal */}
      <StyllModal
        open={availabilityMember !== null}
        onClose={() => setAvailabilityMember(null)}
        title="Disponibilità & Sedi"
        description={`Configura orari e sede per ogni giorno di ${availabilityMember?.fullName ?? 'questo membro'}.`}
        size="lg"
      >
        {availabilityMember && (
          <StaffAvailabilityEditor
            member={availabilityMember}
            onClose={() => setAvailabilityMember(null)}
          />
        )}
      </StyllModal>

      {/* Mobile FAB — invite member */}
      {canEditTeam && isMobile && (
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          aria-label="Invita membro"
          style={{
            position: 'fixed',
            bottom: 'calc(80px + max(16px, env(safe-area-inset-bottom, 16px)))',
            right: 16,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#111827',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 40,
            boxShadow: '0 4px 16px rgba(0,0,0,0.30)',
          }}
        >
          <UserPlus size={22} color="#FFF" strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
