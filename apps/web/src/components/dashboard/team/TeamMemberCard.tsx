'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { startStaffImpersonation } from '@/app/dashboard/actions/staff-impersonation'

type StaffRole = 'manager' | 'staff' | 'receptionist'

interface TeamMemberCardProps {
  staffMemberId: string
  name: string
  role: StaffRole
  avatarUrl: string | null
  showImpersonateButton: boolean
}

const ROLE_LABELS: Record<StaffRole, string> = {
  manager: 'Manager',
  staff: 'Barbiere',
  receptionist: 'Receptionist',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function TeamMemberCard({
  staffMemberId,
  name,
  role,
  avatarUrl,
  showImpersonateButton,
}: TeamMemberCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleImpersonate(e: React.MouseEvent) {
    e.stopPropagation()
    if (pending) return
    setPending(true)
    try {
      const result = await startStaffImpersonation(staffMemberId)
      if (result.success) {
        router.refresh()
        router.push('/dashboard')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'default',
        boxShadow: isHovered
          ? '0 8px 32px rgba(0,0,0,0.14)'
          : '0 2px 16px rgba(0,0,0,0.08)',
        transition: 'all 300ms ease',
        background: '#e5e7eb',
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 350ms ease',
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
            background: '#e5e7eb',
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 350ms ease',
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: '#4b5563',
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}
          >
            {getInitials(name)}
          </span>
        </div>
      )}

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 300ms ease',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', lineHeight: 1.3 }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
            {ROLE_LABELS[role]}
          </div>
        </div>

        {showImpersonateButton && (
          <button
            type="button"
            onClick={handleImpersonate}
            disabled={pending}
            title={`Visualizza come ${name}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: isHovered ? '#374151' : '#111827',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: pending ? 'wait' : 'pointer',
              transition: 'background 200ms ease',
              flexShrink: 0,
              opacity: pending ? 0.7 : 1,
            }}
          >
            <Eye size={16} color="#FFFFFF" />
          </button>
        )}
      </div>
    </div>
  )
}
