'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Archive,
  LogIn,
  Download,
  CheckCircle2,
  Ban,
  AlertTriangle,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminTable, type AdminTableColumn } from '@/components/admin/admin-table'
import { SlideOver } from '@/components/admin/slide-over'
import { ConfirmDialog } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JsonEditor } from '@/components/admin/json-editor'
import { ImageUpload } from '@/components/admin/image-upload'
import {
  createTenant,
  updateTenant,
  toggleTenantStatus,
  softDeleteTenant,
  exportTenantData,
  startTenantImpersonation,
  updateTenantSubscription,
  assignTenantOwnerToMe,
  assignTenantOwnerByEmail,
  type PlanOption,
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
  active_staff_count: number
  locations_count: number
  clients_count: number
  plan_id: string | null
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
  plan_id: string
  initial_plan_id: string
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
  plan_id: '',
  initial_plan_id: '',
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-amber-100 text-amber-700',
  deleted: 'bg-red-100 text-red-700',
  inactive: 'bg-zinc-100 text-zinc-700  ',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  deleted: 'Eliminato',
  inactive: 'Inattivo',
}

function planBadgeClass(name: string | null): string {
  const n = (name ?? '').toLowerCase()
  if (n.includes('pro'))
    return 'bg-violet-100 text-violet-700'
  if (n.includes('growth') || n.includes('plus') || n.includes('business'))
    return 'bg-emerald-100 text-emerald-700'
  return 'bg-zinc-100 text-zinc-700  '
}

function PlanBadge({ name }: { name: string | null }) {
  if (!name) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${planBadgeClass(name)}`}
    >
      {name}
    </span>
  )
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

export function TenantsClient({
  initialTenants,
  plans,
}: {
  initialTenants: TenantRow[]
  plans: PlanOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TenantRow | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [confirmSuspend, setConfirmSuspend] = React.useState<TenantRow | null>(null)
  const [bulkSuspendConfirm, setBulkSuspendConfirm] = React.useState<TenantRow[] | null>(null)
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
      plan_id: t.plan_id ?? '',
      initial_plan_id: t.plan_id ?? '',
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
      if (editing && form.plan_id && form.plan_id !== form.initial_plan_id) {
        const planRes = await updateTenantSubscription(editing.id, {
          plan_id: form.plan_id,
          status: 'active',
        })
        if (!planRes.success) {
          toast.error(planRes.error ?? 'Errore aggiornamento piano')
          return
        }
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
    if (t.active_staff_count === 0) {
      toast.error('Tenant senza proprietario. Assegna prima un owner.')
      return
    }
    startTransition(async () => {
      const res = await startTenantImpersonation(t.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore impersonate')
        return
      }
      toast.success(`Stai visualizzando ${t.business_name}`)
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
      window.location.href = `https://${t.slug}-dashboard.${rootDomain}`
    })
  }

  function claimOwner(t: TenantRow) {
    startTransition(async () => {
      const res = await assignTenantOwnerToMe(t.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Sei stato assegnato come proprietario.')
      router.refresh()
    })
  }

  function assignByEmail(t: TenantRow) {
    const email = window.prompt(
      `Assegna ${t.business_name} a un utente esistente.\nInserisci l'email del profilo:`,
      '',
    )
    if (!email) return
    startTransition(async () => {
      const res = await assignTenantOwnerByEmail(t.id, email)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(`Tenant assegnato a ${email}.`)
      router.refresh()
    })
  }

  function doSuspend() {
    if (!confirmSuspend) return
    startTransition(async () => {
      const res = await softDeleteTenant(confirmSuspend.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant sospeso.')
      setConfirmSuspend(null)
      router.refresh()
    })
  }

  function doBulkSuspend() {
    if (!bulkSuspendConfirm) return
    startTransition(async () => {
      const results = await Promise.all(
        bulkSuspendConfirm.map((t) => softDeleteTenant(t.id)),
      )
      const failed = results.filter((r) => !r.success).length
      if (failed) toast.error(`${failed} sospensioni fallite.`)
      else toast.success(`${results.length} tenant sospesi.`)
      setBulkSuspendConfirm(null)
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
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/admin/tenants/${r.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {r.business_name}
          </Link>
          {r.active_staff_count === 0 ? (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Senza proprietario
            </span>
          ) : null}
        </div>
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
      accessor: (r) => <PlanBadge name={r.plan_name} />,
    },
    {
      key: 'counts',
      header: 'Sedi / Staff / Clienti / Servizi',
      hideOnMobile: true,
      accessor: (r) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {r.locations_count} / {r.staff_count} / {r.clients_count} / {r.services_count}
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
          {r.active_staff_count === 0 ? (
            <button
              type="button"
              onClick={() => claimOwner(r)}
              className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50"
              aria-label="Assegna a me"
              title="Assegna come proprietario a me"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {r.active_staff_count === 0 ? (
            <button
              type="button"
              onClick={() => assignByEmail(r)}
              className="rounded px-1.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
              aria-label="Assegna a email"
              title="Assegna proprietario via email"
            >
              @
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => impersonate(r)}
            disabled={r.active_staff_count === 0}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            aria-label="Impersona"
            title={
              r.active_staff_count === 0
                ? 'Disabilitato: tenant senza proprietario'
                : 'Entra come questo tenant'
            }
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
            onClick={() => setConfirmSuspend(r)}
            disabled={r.status !== 'active'}
            className="rounded p-1.5 text-muted-foreground hover:bg-amber-100 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            aria-label="Sospendi"
            title={
              r.status === 'active'
                ? 'Sospendi/Disattiva tenant'
                : 'Tenant già sospeso'
            }
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 ">
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
              onClick={() => setBulkSuspendConfirm(selected)}
              disabled={pending}
            >
              <Ban /> Sospendi
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
            <Label>Logo</Label>
            <ImageUpload
              bucket="tenants"
              pathPrefix={editing?.id ?? (form.slug || 'new')}
              value={form.logo_url || null}
              onChange={(url) => patch('logo_url', url ?? '')}
              shape="square"
              size={88}
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
          {editing ? (
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="t-plan">Piano abbonamento</Label>
              <select
                id="t-plan"
                value={form.plan_id}
                onChange={(e) => patch('plan_id', e.target.value)}
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">— Nessun piano —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.price_monthly != null ? ` · €${Number(p.price_monthly).toFixed(0)}/mese` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Aggiorna il piano associato a questo tenant. La sottoscrizione sarà attivata immediatamente.
              </p>
            </div>
          ) : null}
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

      <ConfirmDialog
        open={!!confirmSuspend}
        onOpenChange={(o) => !o && setConfirmSuspend(null)}
        title="Sospendi tenant"
        description={`Il tenant "${confirmSuspend?.business_name ?? ''}" verrà sospeso. I barbieri non potranno più accedere alla dashboard finché non verrà riattivato.`}
        confirmLabel="Sospendi"
        loading={pending}
        onConfirm={doSuspend}
      />

      <ConfirmDialog
        open={!!bulkSuspendConfirm}
        onOpenChange={(o) => !o && setBulkSuspendConfirm(null)}
        title={`Sospendi ${bulkSuspendConfirm?.length ?? 0} tenant`}
        description="I tenant selezionati verranno sospesi. Potranno essere riattivati in qualsiasi momento."
        confirmLabel="Sospendi tutti"
        loading={pending}
        onConfirm={doBulkSuspend}
      />
    </>
  )
}
