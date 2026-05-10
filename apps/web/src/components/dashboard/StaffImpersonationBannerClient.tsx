'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { stopStaffImpersonation } from '@/app/dashboard/actions/staff-impersonation'
import type { StaffImpersonationState } from '@/lib/tenant-context'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  staff: 'Barbiere',
  receptionist: 'Receptionist',
}

export function StaffImpersonationBannerClient({ state }: { state: StaffImpersonationState }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleStop() {
    startTransition(async () => {
      await stopStaffImpersonation()
      router.refresh()
    })
  }

  const roleLabel = state.staffRole ? (ROLE_LABELS[state.staffRole] ?? state.staffRole) : null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99,
        background: '#F59E0B',
        color: '#FFFFFF',
        padding: '8px 16px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Eye size={15} />
      <span>
        Stai visualizzando come{' '}
        <strong>{state.staffName ?? 'Staff'}</strong>
        {roleLabel ? ` — ${roleLabel}` : ''}
      </span>
      <button
        type="button"
        onClick={handleStop}
        disabled={pending}
        style={{
          background: 'rgba(255,255,255,0.2)',
          color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: pending ? 'wait' : 'pointer',
          minHeight: 28,
        }}
      >
        {pending ? 'Uscita…' : 'Esci'}
      </button>
    </div>
  )
}
