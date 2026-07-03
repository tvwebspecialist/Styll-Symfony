'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { AdminModal, ConfirmDialog } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTenantClient,
  deleteTenantClient,
  seedDemoClients,
  updateTenantClient,
  type TenantClientDetailedRow,
} from '@/app/admin/actions'

interface FormState {
  full_name: string
  email: string
  phone: string
  tags: string
  marketing_consent: boolean
}

const EMPTY: FormState = {
  full_name: '',
  email: '',
  phone: '',
  tags: '',
  marketing_consent: false,
}

function rowToForm(r: TenantClientDetailedRow): FormState {
  return {
    full_name: r.full_name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    tags: r.tags.join(', '),
    marketing_consent: r.marketing_consent,
  }
}

function parseTagInput(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function TenantClientsClient({
  tenantId,
  clients,
}: {
  tenantId: string
  clients: TenantClientDetailedRow[]
}) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editId, setEditId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [saving, setSaving] = React.useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [seeding, setSeeding] = React.useState(false)

  const target = clients.find((c) => c.id === confirmDeleteId)
  const editing = editId ? clients.find((c) => c.id === editId) ?? null : null

  function openCreate() {
    setForm(EMPTY)
    setCreateOpen(true)
  }

  function openEdit(row: TenantClientDetailedRow) {
    setForm(rowToForm(row))
    setEditId(row.id)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('Inserisci un nome.')
      return
    }
    setSaving(true)
    const res = await createTenantClient(tenantId, {
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore creazione cliente.')
      return
    }
    toast.success('Cliente aggiunto.')
    setForm(EMPTY)
    setCreateOpen(false)
    router.refresh()
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    if (!form.full_name.trim()) {
      toast.error('Inserisci un nome.')
      return
    }
    setSaving(true)
    const res = await updateTenantClient(tenantId, editId, {
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      tags: parseTagInput(form.tags),
      marketing_consent: form.marketing_consent,
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore aggiornamento.')
      return
    }
    toast.success('Cliente aggiornato.')
    setEditId(null)
    setForm(EMPTY)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    const res = await deleteTenantClient(tenantId, confirmDeleteId)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore eliminazione.')
      return
    }
    toast.success('Cliente eliminato.')
    setConfirmDeleteId(null)
    router.refresh()
  }

  async function handleSeed() {
    setSeeding(true)
    const res = await seedDemoClients(tenantId, 10)
    setSeeding(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore seed.')
      return
    }
    toast.success(`Generati ${res.inserted ?? 10} clienti demo.`)
    router.refresh()
  }

  return (
    <div className="rounded-xl border bg-white p-5 ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Clienti</h2>
          <p className="text-xs text-muted-foreground">
            {clients.length} {clients.length === 1 ? 'cliente' : 'clienti'} totali
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {seeding ? 'Generando…' : 'Genera 10 clienti demo'}
          </Button>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Aggiungi cliente
          </Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Nessun cliente. Aggiungine uno o usa il bottone “Genera 10 clienti demo”.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border ">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Telefono</th>
                <th className="px-3 py-2 font-semibold">Tag</th>
                <th className="px-3 py-2 font-semibold">Mkt</th>
                <th className="px-3 py-2 font-semibold">Creato</th>
                <th className="px-3 py-2 font-semibold w-32 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t ">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                        {c.avatar_url ? (
                          <Image src={c.avatar_url} alt="" fill sizes="32px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                            {(c.full_name ?? '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span>{c.full_name ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2">
                    {c.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700  "
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {c.marketing_consent ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                        Sì
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700  ">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
                        aria-label="Modifica"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(c.id)}
                        aria-label="Elimina"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v)
          if (!v) setForm(EMPTY)
        }}
        title="Aggiungi cliente"
        description="Crea un nuovo cliente associato a questo tenant."
      >
        <ClientForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => {
            setCreateOpen(false)
            setForm(EMPTY)
          }}
          saving={saving}
          submitLabel="Crea cliente"
          showAdvanced={false}
        />
      </AdminModal>

      <AdminModal
        open={!!editId}
        onOpenChange={(v) => {
          if (!v) {
            setEditId(null)
            setForm(EMPTY)
          }
        }}
        title="Modifica cliente"
        description={editing?.full_name ?? undefined}
      >
        <ClientForm
          form={form}
          setForm={setForm}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditId(null)
            setForm(EMPTY)
          }}
          saving={saving}
          submitLabel="Salva modifiche"
          showAdvanced
        />
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => {
          if (!v) setConfirmDeleteId(null)
        }}
        title="Elimina cliente"
        description={
          target
            ? `Sei sicuro di voler eliminare "${target.full_name ?? 'questo cliente'}"? L'azione è irreversibile.`
            : 'Sei sicuro?'
        }
        confirmLabel={deleting ? 'Eliminazione…' : 'Elimina'}
        onConfirm={handleDelete}
        destructive
      />
    </div>
  )
}

function ClientForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  showAdvanced,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  submitLabel: string
  showAdvanced: boolean
}) {
  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          placeholder="Mario Rossi"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="mario.rossi@email.it"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Telefono</Label>
        <Input
          id="phone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="+39 347 1234567"
        />
      </div>
      {showAdvanced ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tags">Tag (separati da virgola)</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="vip, fedele, nuovo"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.marketing_consent}
              onChange={(e) =>
                setForm((f) => ({ ...f, marketing_consent: e.target.checked }))
              }
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span>Consenso marketing</span>
          </label>
        </>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvataggio…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
