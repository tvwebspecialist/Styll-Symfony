'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

import { AdminTable, type AdminTableColumn } from '@/components/admin/admin-table'
import { SlideOver } from '@/components/admin/slide-over'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { TypeNameConfirm } from '@/components/admin/type-name-confirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  listTenantsOnPlan,
  type PlanWithStats,
  type TenantOnPlan,
} from '@/app/admin/actions'

interface FormState {
  name: string
  slug: string
  price_monthly: string
  price_yearly: string
  max_locations: string
  max_staff: string
  features_raw: string
  is_active: boolean
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  price_monthly: '0',
  price_yearly: '',
  max_locations: '',
  max_staff: '',
  features_raw: '{}',
  is_active: true,
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function featureLabels(flags: Record<string, unknown>): string[] {
  return Object.entries(flags)
    .filter(([, v]) => v !== false && v !== null && v !== undefined)
    .map(([k]) => k)
}

export function PlansClient({
  plans,
  mrr,
  activeTenantsTotal,
}: {
  plans: PlanWithStats[]
  mrr: number
  activeTenantsTotal: number
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PlanWithStats | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [confirmDel, setConfirmDel] = React.useState<PlanWithStats | null>(null)
  const [pending, startTransition] = React.useTransition()

  const [tenantsOpen, setTenantsOpen] = React.useState(false)
  const [tenantsPlan, setTenantsPlan] = React.useState<PlanWithStats | null>(null)
  const [tenantsLoading, setTenantsLoading] = React.useState(false)
  const [tenantsList, setTenantsList] = React.useState<TenantOnPlan[]>([])

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }

  function openEdit(p: PlanWithStats) {
    setEditing(p)
    setForm({
      name: p.name,
      slug: p.slug,
      price_monthly: String(p.price_monthly),
      price_yearly: String(((p.feature_flags?.price_yearly as number) ?? '') || ''),
      max_locations: p.max_locations?.toString() ?? '',
      max_staff: p.max_staff?.toString() ?? '',
      features_raw: JSON.stringify(p.feature_flags ?? {}, null, 2),
      is_active: p.is_active,
    })
    setOpen(true)
  }

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Nome e slug obbligatori.')
      return
    }
    let parsedFeatures: Record<string, unknown> = {}
    try {
      const v = form.features_raw.trim() === '' ? {} : JSON.parse(form.features_raw)
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        toast.error('Le feature devono essere un oggetto JSON.')
        return
      }
      parsedFeatures = v as Record<string, unknown>
    } catch {
      toast.error('JSON feature non valido.')
      return
    }
    const price = Number(form.price_monthly)
    if (Number.isNaN(price) || price < 0) {
      toast.error('Prezzo mensile non valido.')
      return
    }
    if (form.price_yearly.trim() !== '') {
      const yearly = Number(form.price_yearly)
      if (Number.isNaN(yearly) || yearly < 0) {
        toast.error('Prezzo annuale non valido.')
        return
      }
      parsedFeatures = { ...parsedFeatures, price_yearly: yearly }
    }
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        price_monthly: price,
        max_locations: form.max_locations === '' ? null : Number(form.max_locations),
        max_staff: form.max_staff === '' ? null : Number(form.max_staff),
        feature_flags: parsedFeatures,
        is_active: form.is_active,
      }
      const res = editing
        ? await updateSubscriptionPlan(editing.id, payload)
        : await createSubscriptionPlan(payload)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(editing ? 'Piano aggiornato.' : 'Piano creato.')
      setOpen(false)
      router.refresh()
    })
  }

  function toggleActive(p: PlanWithStats) {
    startTransition(async () => {
      const res = await updateSubscriptionPlan(p.id, { is_active: !p.is_active })
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
      const res = await deleteSubscriptionPlan(confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Piano eliminato.')
      setConfirmDel(null)
      router.refresh()
    })
  }

  async function openTenants(p: PlanWithStats) {
    setTenantsPlan(p)
    setTenantsOpen(true)
    setTenantsLoading(true)
    setTenantsList([])
    const res = await listTenantsOnPlan(p.id)
    setTenantsLoading(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore caricamento tenant.')
      return
    }
    setTenantsList(res.data ?? [])
  }

  const columns: AdminTableColumn<PlanWithStats>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortValue: (r) => r.name.toLowerCase(),
      accessor: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.slug}</div>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Prezzo / mese',
      sortValue: (r) => r.price_monthly,
      accessor: (r) => (
        <span className="tabular-nums">€ {r.price_monthly.toFixed(2)}</span>
      ),
    },
    {
      key: 'tenants',
      header: 'Tenant attivi',
      sortValue: (r) => r.active_tenants_count,
      accessor: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openTenants(r)
          }}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100    "
        >
          {r.active_tenants_count}
          <ExternalLink className="h-3 w-3" />
        </button>
      ),
    },
    {
      key: 'features',
      header: 'Feature',
      hideOnMobile: true,
      accessor: (r) => {
        const labels = featureLabels(r.feature_flags ?? {})
        const shown = labels.slice(0, 3)
        const rest = labels.length - shown.length
        if (labels.length === 0)
          return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((l) => (
              <span
                key={l}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700  "
              >
                {l}
              </span>
            ))}
            {rest > 0 ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500  ">
                +{rest} altri
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'active',
      header: 'Attivo',
      accessor: (r) => (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={r.is_active}
            onChange={() => toggleActive(r)}
            className="h-4 w-4 rounded border-zinc-300 "
          />
          <span
            className={
              r.is_active
                ? 'text-xs font-medium text-emerald-600'
                : 'text-xs text-muted-foreground'
            }
          >
            {r.is_active ? 'Sì' : 'No'}
          </span>
        </label>
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
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDel(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Elimina"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ]

  const planKey = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('pro')) return 'pro'
    if (n.includes('growth') || n.includes('plus')) return 'growth'
    return 'starter'
  }

  const planAccent: Record<string, string> = {
    pro: 'var(--admin-accent)',
    growth: '#16a34a',
    starter: 'var(--admin-text-muted)',
  }

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: 'var(--font-primary)' }}>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Piani' }]} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>Piani</h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Gestisci i piani di abbonamento della piattaforma.</p>
      </div>

      {/* MRR hero */}
      <div className="admin-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
          MRR totale
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
          {formatEuro(mrr)}
          <span className="ml-2 text-base font-normal" style={{ color: 'var(--admin-text-muted)' }}>/mese</span>
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          {activeTenantsTotal} tenant attivi · {plans.length} piani configurati
        </p>
      </div>

      {/* Pricing cards */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const key = planKey(p.name)
            const accent = planAccent[key]
            const isPro = key === 'pro'
            const features = featureLabels(p.feature_flags as Record<string, unknown>)
            return (
              <div
                key={p.id}
                className="relative flex flex-col gap-4 rounded-[var(--radius-xl)] border p-6 transition-shadow hover:shadow-[var(--shadow-lg)]"
                style={{
                  background: 'var(--admin-surface)',
                  borderColor: isPro ? accent : 'var(--admin-border)',
                  borderWidth: isPro ? 2 : 1,
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {isPro && (
                  <span
                    className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-widest text-white"
                    style={{ background: accent }}
                  >
                    POPOLARE
                  </span>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>{p.name}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {formatEuro(p.price_monthly)}
                    <span className="text-base font-normal" style={{ color: 'var(--admin-text-muted)' }}>/mese</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {p.max_staff && (
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      <span className="text-[10px]" style={{ color: accent }}>✓</span>
                      Max {p.max_staff} staff
                    </p>
                  )}
                  {p.max_locations && (
                    <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      <span className="text-[10px]" style={{ color: accent }}>✓</span>
                      Max {p.max_locations} sedi
                    </p>
                  )}
                  {features.slice(0, 4).map((f) => (
                    <p key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                      <span className="text-[10px]" style={{ color: accent }}>✓</span>
                      {f}
                    </p>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--admin-border)' }}>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    {p.active_tenants_count} tenant
                  </span>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors styll-hover-admin-hover-bg"
                    style={{ color: accent }}
                  >
                    Modifica
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AdminTable
        rows={plans}
        columns={columns}
        rowKey={(r) => r.id}
        searchableText={(r) => `${r.name} ${r.slug}`}
        searchPlaceholder="Cerca piani…"
        toolbar={
          <Button onClick={openNew} size="sm">
            <Plus /> Nuovo piano
          </Button>
        }
      />

      <SlideOver
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica piano' : 'Nuovo piano'}
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
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-name">Nome *</Label>
            <Input id="p-name" value={form.name} onChange={(e) => patch('name', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-slug">Slug *</Label>
            <Input id="p-slug" value={form.slug} onChange={(e) => patch('slug', e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-price">Prezzo / mese (€)</Label>
            <Input
              id="p-price"
              type="number"
              step="0.01"
              value={form.price_monthly}
              onChange={(e) => patch('price_monthly', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-price-y">Prezzo / anno (€)</Label>
            <Input
              id="p-price-y"
              type="number"
              step="0.01"
              placeholder="opzionale"
              value={form.price_yearly}
              onChange={(e) => patch('price_yearly', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-loc">Max sedi (vuoto = ∞)</Label>
            <Input
              id="p-loc"
              type="number"
              value={form.max_locations}
              onChange={(e) => patch('max_locations', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-staff">Max staff (vuoto = ∞)</Label>
            <Input
              id="p-staff"
              type="number"
              value={form.max_staff}
              onChange={(e) => patch('max_staff', e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="p-features">Feature (JSON)</Label>
            <textarea
              id="p-features"
              value={form.features_raw}
              onChange={(e) => patch('features_raw', e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Oggetto JSON. Es: {'{'}&quot;multi_location&quot;: true, &quot;sms_reminders&quot;: false{'}'}
            </p>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="p-act"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch('is_active', e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="p-act">Attivo</Label>
          </div>
        </div>
      </SlideOver>

      <SlideOver
        open={tenantsOpen}
        onOpenChange={setTenantsOpen}
        title={`Tenant sul piano ${tenantsPlan?.name ?? ''}`}
        description={
          tenantsPlan
            ? `${tenantsPlan.active_tenants_count} tenant attivi · ${formatEuro(
                tenantsPlan.price_monthly * tenantsPlan.active_tenants_count
              )}/mese`
            : undefined
        }
        width="md"
      >
        {tenantsLoading ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : tenantsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun tenant attivo su questo piano.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {tenantsList.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="font-medium hover:underline"
                  >
                    {t.business_name}
                  </Link>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Stato: {t.status}
                    {t.starts_at
                      ? ` · dal ${new Date(t.starts_at).toLocaleDateString('it-IT')}`
                      : ''}
                  </div>
                </div>
                <Link
                  href={`/admin/tenants/${t.id}`}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Apri tenant"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SlideOver>

      <TypeNameConfirm
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina piano"
        description={`Vuoi eliminare il piano "${confirmDel?.name ?? ''}"? L'azione è irreversibile.`}
        confirmName={confirmDel?.name ?? ''}
        confirmLabel="Elimina"
        loading={pending}
        onConfirm={doDelete}
      />
    </div>
  )
}
