'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Download, Archive, CheckCircle2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { TypeNameConfirm } from '@/components/admin/type-name-confirm'
import {
  exportTenantData,
  getTenantOwner,
  impersonateUser,
  softDeleteTenant,
  toggleTenantStatus,
  deleteTenant,
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
  const [confirmDel, setConfirmDel] = React.useState(false)

  const isActive = status === 'active'

  function impersonate() {
    startTransition(async () => {
      const owner = await getTenantOwner(tenantId)
      if (!owner.success || !owner.profileId) {
        toast.error(owner.error ?? 'Owner non trovato.')
        return
      }
      const res = await impersonateUser(owner.profileId)
      if (!res.success || !res.url) {
        toast.error(res.error ?? 'Errore impersonate')
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
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

  function doDelete() {
    startTransition(async () => {
      const res = await deleteTenant(tenantId)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant eliminato.')
      setConfirmDel(false)
      router.push('/admin/tenants')
    })
  }

  return (
    <>
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
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirmDel(true)}
          disabled={pending}
        >
          <Trash2 /> Elimina
        </Button>
      </div>

      <TypeNameConfirm
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title="Elimina tenant"
        description="Questa azione è irreversibile e cancellerà definitivamente il tenant e i suoi dati."
        confirmName={tenantName}
        loading={pending}
        onConfirm={doDelete}
      />
    </>
  )
}
