'use client'

import * as React from 'react'
import { stopTenantImpersonation } from '@/app/admin/actions'
import { buildRootAppUrl } from '@/lib/auth/urls'

function resolveAdminExitUrl() {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return '/admin'
  }

  return buildRootAppUrl('/admin')
}

export function StopImpersonationButton() {
  const [pending, startTransition] = React.useTransition()

  function handle() {
    startTransition(async () => {
      await stopTenantImpersonation()
      window.location.href = resolveAdminExitUrl()
    })
  }

  return (
    <button
      type="button"
      aria-label="Esci da shadow mode"
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
