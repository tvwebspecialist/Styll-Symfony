'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { stopTenantImpersonation } from '@/app/admin/actions'

export function StopImpersonationButton() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function handle() {
    startTransition(async () => {
      await stopTenantImpersonation()
      router.push('/admin/tenants')
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      style={{
        background: 'rgba(255,255,255,0.18)',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 8,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      {pending ? 'Uscita…' : 'Esci'}
    </button>
  )
}
