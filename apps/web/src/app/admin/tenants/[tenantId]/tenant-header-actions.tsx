'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Download, Archive, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  exportTenantData,
  softDeleteTenant,
  startTenantImpersonation,
  toggleTenantStatus,
} from '@/app/admin/actions'

interface Props {
  tenantId: string
  tenantName: string
  tenantSlug: string
  status: string
}

export function TenantHeaderActions({ tenantId, tenantName, tenantSlug, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const isActive = status === 'active'

  function impersonate() {
    startTransition(async () => {
      const res = await startTenantImpersonation(tenantId)
      if (!res.success) {
        toast.error(res.error ?? 'Errore impersonate')
        return
      }
      toast.success(`Stai visualizzando ${tenantName}`)
      router.push('/dashboard')
    })
  }

  function exportData() {
    startTransition(async () => {
      const res = await exportTenantData(tenantId)
      if (!res.success || !res.data) {
        toast.error(res.error ?? 'Errore export')
        return
      }
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tenant-${tenantSlug}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Export scaricato.')
    })
  }

  function suspend() {
    startTransition(async () => {
      const res = await softDeleteTenant(tenantId)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant sospeso.')
      router.refresh()
    })
  }

  function reactivate() {
    startTransition(async () => {
      const res = await toggleTenantStatus(tenantId, 'active')
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant riattivato.')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={impersonate} disabled={pending}>
        <LogIn /> Impersona
      </Button>
      <Button size="sm" variant="outline" onClick={exportData} disabled={pending}>
        <Download /> Esporta dati
      </Button>
      {isActive ? (
        <Button size="sm" variant="outline" onClick={suspend} disabled={pending}>
          <Archive /> Sospendi
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={reactivate} disabled={pending}>
          <CheckCircle2 /> Riattiva
        </Button>
      )}
    </div>
  )
}
