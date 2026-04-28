'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  LogIn,
  Download,
  CheckCircle2,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminTable, type AdminTableColumn } from '@/components/admin/admin-table'
import { SlideOver } from '@/components/admin/slide-over'
import { TypeNameConfirm } from '@/components/admin/type-name-confirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JsonEditor } from '@/components/admin/json-editor'
import {
  createTenant,
  updateTenant,
  toggleTenantStatus,
  deleteTenant,
  softDeleteTenant,
  exportTenantData,
  impersonateUser,
  getTenantOwner,
} from '@/app/admin/actions'

export interface TenantRow {
  id: string
  business_name: string
  slug: string
  status: string
  timezone: string
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
  font_family: string | null
  settings: unknown
  created_at: string
  services_count: number
  staff_count: number
  locations_count: number
  plan_name: string | null
  subscription_status: string | null
}

interface FormState {
  business_name: string
  slug: string
  timezone: string
  status: string
  primary_color: string
  secondary_color: string
  logo_url: string
  font_family: string
  settings: Record<string, unknown> | null
  settingsValid: boolean
}

const EMPTY_FORM: FormState = {
  business_name: '',
  slug: '',
  timezone: 'Europe/Rome',
  status: 'active',
  primary_color: '',
  secondary_color: '',
  logo_url: '',
  font_family: '',
  settings: {},
  settingsValid: true,
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  inactive: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  deleted: 'Eliminato',
  inactive: 'Inattivo',
}

function StatusPill({ status }: { status: string }) {
  const key = String(status ?? '').toLowerCase()
  const cls = STATUS_BADGE[key] ?? STATUS_BADGE.inactive
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {STATUS_LABEL[key] ?? status ?? '—'}
    </span>
  )
}

function TenantLogo({ tenant, size = 28 }: { tenant: TenantRow; size?: number }) {
  if (tenant.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tenant.logo_url}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  const bg = tenant.primary_color || '#71717a'
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      {tenant.business_name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function TenantsClient({ initialTenants }: { initialTenants: TenantRow[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TenantRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [confirmDel, setConfirmDel] = React.useState<TenantRow | null>(null)
  const [bulkDelete, setBulkDelete] = React.useState<TenantRow[] | null>(null)
  const [pending, startTransition] = React.useTransition()

  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'suspended'>('all')
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')

  const filtered = React.useMemo(() => {
    return initialTenants.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (fromDate && new Date(t.created_at) < new Date(fromDate)) return false
      if (toDate) {
        const end = new Date(toDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(t.created_at) > end) return false
      }
      return true
    })
  }, [initialTenants, statusFilter, fromDate, toDate])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }
  function openEdit(t: TenantRow) {
    setEditing(t)
    setForm({
      business_name: t.business_name,
      slug: t.slug,
      timezone: t.timezone || 'Europe/Rome',
      status: t.status,
      primary_color: t.primary_color ?? '',
      secondary_color: t.secondary_color ?? '',
      logo_url: t.logo_url ?? '',
      font_family: t.font_family ?? '',
      settings: (t.settings as Record<string, unknown>) ?? {},
      settingsValid: true,
    })
    setOpen(true)
  }

  function patch<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function save() {
    if (!form.business_name.trim() || !form.slug.trim()) {
      toast.error('Nome e slug sono obbligatori.')
      return
    }
    if (!form.settingsValid) {
      toast.error('Settings JSON non valido.')
      return
    }
    startTransition(async () => {
      const payload = {
        business_name: form.business_name.trim(),
        slug: form.slug.trim(),
        timezone: form.timezone || 'Europe/Rome',
        status: form.status,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        logo_url: form.logo_url || null,
        font_family: form.font_family || null,
        settings: form.settings ?? {},
      }
      const res = editing
        ? await updateTenant(editing.id, payload)
        : await createTenant(payload)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(editing ? 'Tenant aggiornato.' : 'Tenant creato.')
      setOpen(false)
      router.refresh()
    })
  }

  function archive(t: TenantRow) {
    startTransition(async () => {
      const res = await softDeleteTenant(t.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant sospeso.')
      router.refresh()
    })
  }

  function activate(t: TenantRow) {
    startTransition(async () => {
      const res = await toggleTenantStatus(t.id, 'active')
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant attivato.')
      router.refresh()
    })
  }

  function exportTenant(t: TenantRow) {
    startTransition(async () => {
      const res = await exportTenantData(t.id)
      if (!res.success || !res.data) {
        toast.error(res.error ?? 'Errore export')
        return
      }
      downloadJson(`tenant-${t.slug}-${new Date().toISOString().slice(0, 10)}.json`, res.data)
      toast.success('Export scaricato.')
    })
  }

  function impersonate(t: TenantRow) {
    startTransition(async () => {
      const owner = await getTenantOwner(t.id)
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

  function doDelete() {
    if (!confirmDel) return
    startTransition(async () => {
      const res = await deleteTenant(confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant eliminato.')
      setConfirmDel(null)
      router.refresh()
    })
  }

  function doBulkDelete() {
    if (!bulkDelete) return
    startTransition(async () => {
      const results = await Promise.all(bulkDelete.map((t) => deleteTenant(t.id)))
      const failed = results.filter((r) => !r.success).length
      if (failed) toast.error(`${failed} eliminazioni fallite.`)
      else toast.success(`${results.length} tenant eliminati.`)
      setBulkDelete(null)
      router.refresh()
    })
  }

  function bulkActivate(rows: TenantRow[], clear: () => void) {
    startTransition(async () => {
      await Promise.all(rows.map((r) => toggleTenantStatus(r.id, 'active')))
      toast.success(`${rows.length} tenant attivati.`)
      clear()
      router.refresh()
    })
  }
  function bulkSuspend(rows: TenantRow[], clear: () => void) {
    startTransition(async () => {
      await Promise.all(rows.map((r) => softDeleteTenant(r.id)))
      toast.success(`${rows.length} tenant sospesi.`)
      clear()
      router.refresh()
    })
  }

  const columns: AdminTableColumn<TenantRow>[] = [
    {
      key: 'logo',
      header: '',
      className: 'w-10',
      accessor: (r) => <TenantLogo tenant={r} />,
    },
    {
      key: 'business_name',
      header: 'Business',
      sortValue: (r) => r.business_name.toLowerCase(),
      accessor: (r) => (
        <Link
          href={`/admin/tenants/${r.id}`}
          className="font-medium text-foreground hover:underline"
        >
          {r.business_name}
        </Link>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      sortValue: (r) => r.slug,
      accessor: (r) => (
        <span className="font-mono text-xs text-muted-foreground">{r.slug}</span>
      ),
    },
    {
      key: 'status',
      header: 'Stato',
      sortValue: (r) => r.status,
      accessor: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'plan',
      header: 'Piano',
      sortValue: (r) => r.plan_name ?? '',
      hideOnMobile: true,
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">{r.plan_name ?? '—'}</span>
      ),
    },
    {
      key: 'counts',
      header: 'Sedi / Staff / Servizi',
      hideOnMobile: true,
      accessor: (r) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {r.locations_count} / {r.staff_count} / {r.services_count}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Creato',
      sortValue: (r) => r.created_at,
      hideOnMobile: true,
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
            onClick={() => openEdit(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Modifica"
            title="Modifica"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => (r.status === 'active' ? archive(r) : activate(r))}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={r.status === 'active' ? 'Sospendi' : 'Riattiva'}
            title={r.status === 'active' ? 'Sospendi' : 'Riattiva'}
          >
            {r.status === 'active' ? (
              <Archive className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => impersonate(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Impersona"
            title="Entra come questo tenant"
          >
            <LogIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exportTenant(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Esporta"
            title="Esporta dati"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Elimina"
            title="Elimina (definitivo)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-status" className="text-xs">
            Stato
          </Label>
          <select
            id="f-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')
            }
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="all">Tutti</option>
            <option value="active">Attivi</option>
            <option value="suspended">Sospesi</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-from" className="text-xs">
            Creato dal
          </Label>
          <Input
            id="f-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-to" className="text-xs">
            Al
          </Label>
          <Input
            id="f-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8"
          />
        </div>
        {(statusFilter !== 'all' || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all')
              setFromDate('')
              setToDate('')
            }}
          >
            Reset
          </Button>
        )}
      </div>

      <AdminTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        searchableText={(r) => `${r.business_name} ${r.slug}`}
        searchPlaceholder="Cerca per nome o slug…"
        selectable
        bulkActions={(selected, clear) => (
          <>
            <Button
              size="xs"
              variant="outline"
              onClick={() => bulkActivate(selected, clear)}
              disabled={pending}
            >
              <CheckCircle2 /> Attiva
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => bulkSuspend(selected, clear)}
              disabled={pending}
            >
              <Ban /> Sospendi
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => setBulkDelete(selected)}
              disabled={pending}
            >
              <Trash2 /> Elimina
            </Button>
          </>
        )}
        toolbar={
          <Button onClick={openNew} size="sm">
            <Plus /> Nuovo tenant
          </Button>
        }
      />

      <SlideOver
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica tenant' : 'Nuovo tenant'}
        description={editing ? `ID: ${editing.id}` : 'Crea un nuovo tenant.'}
        width="lg"
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
            <Label htmlFor="t-name">Nome attività *</Label>
            <Input
              id="t-name"
              value={form.business_name}
              onChange={(e) => patch('business_name', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-slug">Slug *</Label>
            <Input
              id="t-slug"
              value={form.slug}
              onChange={(e) => patch('slug', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-tz">Timezone</Label>
            <Input
              id="t-tz"
              value={form.timezone}
              onChange={(e) => patch('timezone', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-status">Stato</Label>
            <select
              id="t-status"
              value={form.status}
              onChange={(e) => patch('status', e.target.value)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              <option value="active">Attivo</option>
              <option value="suspended">Sospeso</option>
              <option value="inactive">Inattivo</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-pc">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="t-pc"
                type="color"
                value={form.primary_color || '#000000'}
                onChange={(e) => patch('primary_color', e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
              />
              <Input
                value={form.primary_color}
                onChange={(e) => patch('primary_color', e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="t-sc">Secondary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="t-sc"
                type="color"
                value={form.secondary_color || '#ffffff'}
                onChange={(e) => patch('secondary_color', e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
              />
              <Input
                value={form.secondary_color}
                onChange={(e) => patch('secondary_color', e.target.value)}
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-logo">Logo URL</Label>
            <Input
              id="t-logo"
              value={form.logo_url}
              onChange={(e) => patch('logo_url', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-font">Font family</Label>
            <Input
              id="t-font"
              value={form.font_family}
              onChange={(e) => patch('font_family', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="t-settings">Settings (JSON)</Label>
            <JsonEditor
              id="t-settings"
              value={form.settings}
              onChange={(parsed, _raw, valid) => {
                setForm((f) => ({
                  ...f,
                  settings: valid ? ((parsed as Record<string, unknown>) ?? {}) : f.settings,
                  settingsValid: valid,
                }))
              }}
            />
          </div>
        </div>
      </SlideOver>

      <TypeNameConfirm
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina tenant"
        description="Questa azione è irreversibile e cancellerà definitivamente il tenant e i suoi dati."
        confirmName={confirmDel?.business_name ?? ''}
        loading={pending}
        onConfirm={doDelete}
      />

      <TypeNameConfirm
        open={!!bulkDelete}
        onOpenChange={(o) => !o && setBulkDelete(null)}
        title={`Elimina ${bulkDelete?.length ?? 0} tenant`}
        description="Eliminazione massiva e definitiva. Conferma digitando ELIMINA."
        confirmName="ELIMINA"
        loading={pending}
        onConfirm={doBulkDelete}
      />
    </>
  )
}
