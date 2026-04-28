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
import { createStaff, updateStaff, deleteStaff } from '@/app/admin/actions'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
}

interface Staff {
  id: string
  profile_id: string
  role: string
  bio: string | null
  is_active: boolean
  created_at: string
  profile?: { full_name: string | null; email: string | null } | null
}

const ROLES = ['owner', 'manager', 'staff', 'receptionist']

interface FormState {
  profile_id: string
  role: string
  bio: string
  is_active: boolean
}

const EMPTY: FormState = { profile_id: '', role: 'staff', bio: '', is_active: true }

export function StaffClient({
  tenantId,
  initial,
  profiles,
}: {
  tenantId: string
  initial: Staff[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Staff | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [confirmDel, setConfirmDel] = React.useState<Staff | null>(null)
  const [pending, startTransition] = React.useTransition()

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(s: Staff) {
    setEditing(s)
    setForm({
      profile_id: s.profile_id,
      role: s.role,
      bio: s.bio ?? '',
      is_active: s.is_active,
    })
    setOpen(true)
  }
  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.profile_id) {
      toast.error('Seleziona un profilo.')
      return
    }
    if (!form.role) {
      toast.error('Ruolo obbligatorio.')
      return
    }
    startTransition(async () => {
      const payload = {
        profile_id: form.profile_id,
        role: form.role,
        bio: form.bio.trim() || null,
        is_active: form.is_active,
      }
      const res = editing
        ? await updateStaff(tenantId, editing.id, payload)
        : await createStaff(tenantId, payload)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(editing ? 'Staff aggiornato.' : 'Staff creato.')
      setOpen(false)
      router.refresh()
    })
  }

  function toggleActive(s: Staff) {
    startTransition(async () => {
      const res = await updateStaff(tenantId, s.id, { is_active: !s.is_active })
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
      const res = await deleteStaff(tenantId, confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Staff eliminato.')
      setConfirmDel(null)
      router.refresh()
    })
  }

  const columns: AdminTableColumn<Staff>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortValue: (r) => r.profile?.full_name?.toLowerCase() ?? '',
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.profile?.full_name ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{r.profile?.email ?? ''}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Ruolo',
      sortValue: (r) => r.role,
      accessor: (r) => <span className="text-sm capitalize">{r.role}</span>,
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
      key: 'created_at',
      header: 'Creato',
      hideOnMobile: true,
      sortValue: (r) => r.created_at,
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.created_at).toLocaleDateString('it-IT')}
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
        searchableText={(r) => `${r.profile?.full_name ?? ''} ${r.profile?.email ?? ''} ${r.role}`}
        searchPlaceholder="Cerca staff…"
        toolbar={
          <Button onClick={openNew} size="sm">
            <Plus /> Nuovo staff
          </Button>
        }
      />

      <AdminModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica staff' : 'Nuovo staff'}
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
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="st-prof">Profilo *</Label>
            <select
              id="st-prof"
              value={form.profile_id}
              disabled={!!editing}
              onChange={(e) => patch('profile_id', e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="">— Seleziona —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="st-role">Ruolo *</Label>
            <select
              id="st-role"
              value={form.role}
              onChange={(e) => patch('role', e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="st-bio">Bio</Label>
            <Input id="st-bio" value={form.bio} onChange={(e) => patch('bio', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="st-act"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch('is_active', e.target.checked)}
            />
            <Label htmlFor="st-act">Attivo</Label>
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina staff"
        description={`Vuoi eliminare "${confirmDel?.profile?.full_name ?? ''}"?`}
        destructive
        confirmLabel="Elimina"
        loading={pending}
        onConfirm={doDelete}
      />
    </>
  )
}
