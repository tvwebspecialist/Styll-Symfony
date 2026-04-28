'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'

import { AdminTable, type AdminTableColumn } from '@/components/admin/admin-table'
import { AdminModal, ConfirmDialog } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createLocation, updateLocation, deleteLocation } from '@/app/admin/actions'

interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  is_active: boolean
}

interface FormState {
  name: string
  address: string
  city: string
  zip_code: string
  phone: string
  email: string
  is_active: boolean
}

const EMPTY: FormState = {
  name: '',
  address: '',
  city: '',
  zip_code: '',
  phone: '',
  email: '',
  is_active: true,
}

export function LocationsClient({
  tenantId,
  initial,
}: {
  tenantId: string
  initial: Location[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Location | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [confirmDel, setConfirmDel] = React.useState<Location | null>(null)
  const [pending, startTransition] = React.useTransition()

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(l: Location) {
    setEditing(l)
    setForm({
      name: l.name,
      address: l.address ?? '',
      city: l.city ?? '',
      zip_code: l.zip_code ?? '',
      phone: l.phone ?? '',
      email: l.email ?? '',
      is_active: l.is_active,
    })
    setOpen(true)
  }
  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.name.trim()) {
      toast.error('Nome obbligatorio.')
      return
    }
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        zip_code: form.zip_code.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        is_active: form.is_active,
      }
      const res = editing
        ? await updateLocation(tenantId, editing.id, payload)
        : await createLocation(tenantId, payload)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(editing ? 'Sede aggiornata.' : 'Sede creata.')
      setOpen(false)
      router.refresh()
    })
  }

  function toggleActive(l: Location) {
    startTransition(async () => {
      const res = await updateLocation(tenantId, l.id, { is_active: !l.is_active })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      router.refresh()
    })
  }

  function doDelete() {
    if (!confirmDel) return
    startTransition(async () => {
      const res = await deleteLocation(tenantId, confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Sede eliminata.')
      setConfirmDel(null)
      router.refresh()
    })
  }

  const columns: AdminTableColumn<Location>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortValue: (r) => r.name.toLowerCase(),
      accessor: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'address',
      header: 'Indirizzo',
      hideOnMobile: true,
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {[r.address, r.city, r.zip_code].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefono',
      hideOnMobile: true,
      accessor: (r) => <span className="text-xs">{r.phone ?? '—'}</span>,
    },
    {
      key: 'active',
      header: 'Attivo',
      accessor: (r) => (
        <span
          className={
            r.is_active
              ? 'text-xs font-medium text-emerald-600'
              : 'text-xs text-muted-foreground'
          }
        >
          {r.is_active ? 'Sì' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-1',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => toggleActive(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <AdminTable
        rows={initial}
        columns={columns}
        rowKey={(r) => r.id}
        searchableText={(r) => `${r.name} ${r.city ?? ''} ${r.address ?? ''}`}
        searchPlaceholder="Cerca sedi…"
        toolbar={
          <Button onClick={openNew} size="sm">
            <Plus /> Nuova sede
          </Button>
        }
      />

      <AdminModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica sede' : 'Nuova sede'}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="l-name">Nome *</Label>
            <Input id="l-name" value={form.name} onChange={(e) => patch('name', e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="l-addr">Indirizzo</Label>
            <Input
              id="l-addr"
              value={form.address}
              onChange={(e) => patch('address', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-city">Città</Label>
            <Input id="l-city" value={form.city} onChange={(e) => patch('city', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-zip">CAP</Label>
            <Input
              id="l-zip"
              value={form.zip_code}
              onChange={(e) => patch('zip_code', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-phone">Telefono</Label>
            <Input
              id="l-phone"
              value={form.phone}
              onChange={(e) => patch('phone', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="l-email">Email</Label>
            <Input
              id="l-email"
              type="email"
              value={form.email}
              onChange={(e) => patch('email', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="l-act"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch('is_active', e.target.checked)}
            />
            <Label htmlFor="l-act">Attivo</Label>
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina sede"
        description={`Vuoi eliminare "${confirmDel?.name ?? ''}"?`}
        destructive
        confirmLabel="Elimina"
        loading={pending}
        onConfirm={doDelete}
      />
    </>
  )
}
