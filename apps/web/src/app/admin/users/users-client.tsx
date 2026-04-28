'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  UserCog,
  Users as UsersIcon,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminTable, type AdminTableColumn } from '@/components/admin/admin-table'
import { AdminModal } from '@/components/admin/admin-modal'
import { SlideOver } from '@/components/admin/slide-over'
import { TypeNameConfirm } from '@/components/admin/type-name-confirm'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  updateProfile,
  deleteUser,
  inviteUser,
  resetUserPassword,
  impersonateUser,
  getUserTenants,
} from '@/app/admin/actions'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  is_superadmin: boolean | null
  onboarding_completed: boolean | null
  created_at: string
}

interface TenantOption {
  id: string
  business_name: string
  slug: string
}

interface UserTenant {
  staff_id: string
  role: string
  is_active: boolean
  tenant: { id: string; business_name: string; slug: string }
}

type TriFilter = 'all' | 'yes' | 'no'

interface InviteForm {
  email: string
  full_name: string
  is_superadmin: boolean
  tenantId: string
  role: string
}

interface EditForm {
  full_name: string
  is_superadmin: boolean
}

interface ResetResult {
  email: string
  tempPassword?: string
  error?: string
}

const EMPTY_INVITE: InviteForm = {
  email: '',
  full_name: '',
  is_superadmin: false,
  tenantId: '',
  role: 'staff',
}

function initialsFor(p: Profile): string {
  const src = (p.full_name || p.email || '').trim()
  if (!src) return '?'
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function UsersClient({
  initialUsers,
  initialTenants,
}: {
  initialUsers: Profile[]
  initialTenants: TenantOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const [fSuper, setFSuper] = React.useState<TriFilter>('all')
  const [fOnb, setFOnb] = React.useState<TriFilter>('all')
  const [fFrom, setFFrom] = React.useState<string>('')
  const [fTo, setFTo] = React.useState<string>('')

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteForm, setInviteForm] = React.useState<InviteForm>(EMPTY_INVITE)

  const [editing, setEditing] = React.useState<Profile | null>(null)
  const [editForm, setEditForm] = React.useState<EditForm>({ full_name: '', is_superadmin: false })

  const [confirmDel, setConfirmDel] = React.useState<Profile | null>(null)
  const [bulkDel, setBulkDel] = React.useState<Profile[] | null>(null)
  const [bulkClear, setBulkClear] = React.useState<(() => void) | null>(null)

  const [resetResults, setResetResults] = React.useState<ResetResult[] | null>(null)
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null)

  const [tenantsUser, setTenantsUser] = React.useState<Profile | null>(null)
  const [tenantsLoading, setTenantsLoading] = React.useState(false)
  const [userTenants, setUserTenants] = React.useState<UserTenant[]>([])

  const filtered = React.useMemo(() => {
    const fromTs = fFrom ? new Date(fFrom).getTime() : null
    const toTs = fTo ? new Date(fTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null
    return initialUsers.filter((p) => {
      if (fSuper === 'yes' && !p.is_superadmin) return false
      if (fSuper === 'no' && p.is_superadmin) return false
      if (fOnb === 'yes' && !p.onboarding_completed) return false
      if (fOnb === 'no' && p.onboarding_completed) return false
      const ts = new Date(p.created_at).getTime()
      if (fromTs != null && ts < fromTs) return false
      if (toTs != null && ts > toTs) return false
      return true
    })
  }, [initialUsers, fSuper, fOnb, fFrom, fTo])

  function openInvite() {
    setInviteForm(EMPTY_INVITE)
    setInviteOpen(true)
  }

  function submitInvite() {
    const email = inviteForm.email.trim()
    if (!email) {
      toast.error("L'email è obbligatoria.")
      return
    }
    startTransition(async () => {
      const res = await inviteUser({
        email,
        fullName: inviteForm.full_name.trim() || null,
        isSuperadmin: inviteForm.is_superadmin,
        tenantId: inviteForm.tenantId || undefined,
        role: inviteForm.tenantId ? inviteForm.role : undefined,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Invito inviato')
      setInviteOpen(false)
      router.refresh()
    })
  }

  function openEdit(p: Profile) {
    setEditing(p)
    setEditForm({ full_name: p.full_name ?? '', is_superadmin: !!p.is_superadmin })
  }

  function submitEdit() {
    if (!editing) return
    startTransition(async () => {
      const res = await updateProfile(editing.id, {
        full_name: editForm.full_name.trim() || null,
        is_superadmin: editForm.is_superadmin,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Utente aggiornato')
      setEditing(null)
      router.refresh()
    })
  }

  function doResetPassword(p: Profile) {
    startTransition(async () => {
      const res = await resetUserPassword(p.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      setResetResults([{ email: p.email ?? p.id, tempPassword: res.tempPassword }])
    })
  }

  function doImpersonate(p: Profile) {
    startTransition(async () => {
      const res = await impersonateUser(p.id)
      if (!res.success || !res.url) {
        toast.error(res.error ?? 'Errore')
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
      toast.success('Magic link aperto in una nuova scheda')
    })
  }

  function doDeleteOne() {
    if (!confirmDel) return
    startTransition(async () => {
      const res = await deleteUser(confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Utente eliminato')
      setConfirmDel(null)
      router.refresh()
    })
  }

  function doBulkDelete() {
    const targets = bulkDel
    if (!targets || targets.length === 0) return
    startTransition(async () => {
      let ok = 0
      let fail = 0
      for (const u of targets) {
        const res = await deleteUser(u.id)
        if (res.success) ok++
        else fail++
      }
      if (ok > 0) toast.success(`${ok} utenti eliminati`)
      if (fail > 0) toast.error(`${fail} eliminazioni fallite`)
      setBulkDel(null)
      bulkClear?.()
      setBulkClear(null)
      router.refresh()
    })
  }

  function doBulkResetPassword(selected: Profile[], clear: () => void) {
    startTransition(async () => {
      const results: ResetResult[] = []
      for (const u of selected) {
        const res = await resetUserPassword(u.id)
        results.push({
          email: u.email ?? u.id,
          tempPassword: res.success ? res.tempPassword : undefined,
          error: res.success ? undefined : res.error,
        })
      }
      setResetResults(results)
      clear()
    })
  }

  function openTenantsFor(p: Profile) {
    setTenantsUser(p)
    setTenantsLoading(true)
    setUserTenants([])
    getUserTenants(p.id).then((res) => {
      setTenantsLoading(false)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      setUserTenants(res.data ?? [])
    })
  }

  async function copyToClipboard(text: string, idx: number) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500)
    } catch {
      toast.error('Copia non riuscita')
    }
  }

  const columns: AdminTableColumn<Profile>[] = [
    {
      key: 'avatar',
      header: '',
      className: 'w-10',
      accessor: (r) => (
        <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full w-8 h-8 inline-flex items-center justify-center text-xs font-semibold">
          {initialsFor(r)}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nome',
      sortValue: (r) => (r.full_name ?? '').toLowerCase(),
      accessor: (r) => <span className="font-medium">{r.full_name ?? '—'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortValue: (r) => (r.email ?? '').toLowerCase(),
      accessor: (r) => <span className="text-xs text-muted-foreground">{r.email ?? '—'}</span>,
    },
    {
      key: 'tenants',
      header: 'Tenant',
      hideOnMobile: true,
      accessor: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openTenantsFor(r)
          }}
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <UsersIcon className="h-3 w-3" />
          Tenant
        </button>
      ),
    },
    {
      key: 'super',
      header: 'Superadmin',
      hideOnMobile: true,
      sortValue: (r) => (r.is_superadmin ? 1 : 0),
      accessor: (r) =>
        r.is_superadmin ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Sì
          </span>
        ) : (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            No
          </span>
        ),
    },
    {
      key: 'onb',
      header: 'Onboarding',
      hideOnMobile: true,
      sortValue: (r) => (r.onboarding_completed ? 1 : 0),
      accessor: (r) =>
        r.onboarding_completed ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Completato
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            In corso
          </span>
        ),
    },
    {
      key: 'created_at',
      header: 'Creato',
      hideOnMobile: true,
      sortValue: (r) => r.created_at,
      accessor: (r) => (
        <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right w-1',
      accessor: (r) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Modifica"
            onClick={() => openEdit(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Reset password"
            onClick={() => doResetPassword(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Impersona"
            onClick={() => doImpersonate(r)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <UserCog className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Elimina"
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
    <div className="flex flex-col gap-5">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Utenti' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Utenti</h1>
          <p className="text-sm text-muted-foreground">
            Gestisci gli account della piattaforma.
          </p>
        </div>
        <button
          type="button"
          onClick={openInvite}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Plus className="h-4 w-4" />
          Invita utente
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-3 py-3 text-xs">
        <FilterSelect label="Superadmin" value={fSuper} onChange={setFSuper} />
        <FilterSelect
          label="Onboarding"
          value={fOnb}
          onChange={setFOnb}
          yesLabel="Completato"
          noLabel="In corso"
        />
        <DateField label="Creato dal" value={fFrom} onChange={setFFrom} />
        <DateField label="al" value={fTo} onChange={setFTo} />
        {(fSuper !== 'all' || fOnb !== 'all' || fFrom || fTo) && (
          <button
            type="button"
            onClick={() => {
              setFSuper('all')
              setFOnb('all')
              setFFrom('')
              setFTo('')
            }}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            Reimposta filtri
          </button>
        )}
      </div>

      <AdminTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        searchableText={(r) => `${r.full_name ?? ''} ${r.email ?? ''}`}
        searchPlaceholder="Cerca utenti…"
        selectable
        bulkActions={(selected, clear) => (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => doBulkResetPassword(selected, clear)}
            >
              <KeyRound className="h-3 w-3" />
              Reset password
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                setBulkDel(selected)
                setBulkClear(() => clear)
              }}
            >
              <Trash2 className="h-3 w-3" />
              Elimina selezionati
            </Button>
          </>
        )}
      />

      {/* Invite slide-over */}
      <SlideOver
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Invita utente"
        description="Verrà inviata un'email di invito."
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={submitInvite} disabled={pending}>
              {pending ? 'Invio…' : 'Invia invito'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-email">Email *</Label>
            <Input
              id="i-email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="utente@esempio.it"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-name">Nome completo</Label>
            <Input
              id="i-name"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="i-super"
              type="checkbox"
              checked={inviteForm.is_superadmin}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, is_superadmin: e.target.checked }))
              }
            />
            <Label htmlFor="i-super">Superadmin</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="i-tenant">Tenant (opzionale)</Label>
            <select
              id="i-tenant"
              value={inviteForm.tenantId}
              onChange={(e) => setInviteForm((f) => ({ ...f, tenantId: e.target.value }))}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">— Nessuno —</option>
              {initialTenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.business_name}
                </option>
              ))}
            </select>
          </div>
          {inviteForm.tenantId ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="i-role">Ruolo</Label>
              <select
                id="i-role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ) : null}
        </div>
      </SlideOver>

      {/* Edit slide-over */}
      <SlideOver
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Modifica utente"
        description={editing?.email ?? undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={submitEdit} disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-name">Nome</Label>
            <Input
              id="u-name"
              value={editForm.full_name}
              onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="u-super"
              type="checkbox"
              checked={editForm.is_superadmin}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, is_superadmin: e.target.checked }))
              }
            />
            <Label htmlFor="u-super">Superadmin</Label>
          </div>
        </div>
      </SlideOver>

      {/* Tenants slide-over */}
      <SlideOver
        open={!!tenantsUser}
        onOpenChange={(o) => !o && setTenantsUser(null)}
        title={`Tenant di ${tenantsUser?.full_name ?? tenantsUser?.email ?? ''}`}
        width="md"
      >
        {tenantsLoading ? (
          <div className="text-sm text-muted-foreground">Caricamento…</div>
        ) : userTenants.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Questo utente non è associato a nessun tenant.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Tenant</th>
                  <th className="px-3 py-2 font-semibold">Ruolo</th>
                  <th className="px-3 py-2 font-semibold">Stato</th>
                </tr>
              </thead>
              <tbody>
                {userTenants.map((ut) => (
                  <tr key={ut.staff_id} className="border-t">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/tenants/${ut.tenant.id}`}
                        className="font-medium hover:underline"
                      >
                        {ut.tenant.business_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{ut.role}</td>
                    <td className="px-3 py-2">
                      {ut.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Attivo
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Inattivo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SlideOver>

      {/* Reset password results */}
      <AdminModal
        open={!!resetResults}
        onOpenChange={(o) => !o && setResetResults(null)}
        title="Password temporanea"
        description="Comunica all'utente. Questa password sarà mostrata SOLO ora."
        footer={
          <Button onClick={() => setResetResults(null)}>Chiudi</Button>
        }
      >
        <div className="flex flex-col gap-2">
          {(resetResults ?? []).map((r, idx) => (
            <div
              key={`${r.email}-${idx}`}
              className="flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="text-xs font-medium">{r.email}</div>
              {r.tempPassword ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-xs">
                    {r.tempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(r.tempPassword!, idx)}
                    className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-muted"
                  >
                    {copiedIdx === idx ? (
                      <>
                        <Check className="h-3 w-3" /> Copiato
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copia
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-destructive">{r.error ?? 'Errore'}</div>
              )}
            </div>
          ))}
        </div>
      </AdminModal>

      {/* Single delete confirm */}
      <TypeNameConfirm
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina utente"
        description={`Eliminazione definitiva di "${confirmDel?.full_name ?? confirmDel?.email ?? ''}".`}
        confirmName={confirmDel?.email ?? confirmDel?.full_name ?? ''}
        loading={pending}
        onConfirm={doDeleteOne}
      />

      {/* Bulk delete confirm */}
      <TypeNameConfirm
        open={!!bulkDel}
        onOpenChange={(o) => {
          if (!o) {
            setBulkDel(null)
            setBulkClear(null)
          }
        }}
        title={`Elimina ${bulkDel?.length ?? 0} utenti`}
        description="Operazione irreversibile."
        confirmName="ELIMINA"
        loading={pending}
        onConfirm={doBulkDelete}
      />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  yesLabel = 'Sì',
  noLabel = 'No',
}: {
  label: string
  value: TriFilter
  onChange: (v: TriFilter) => void
  yesLabel?: string
  noLabel?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TriFilter)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
      >
        <option value="all">Tutti</option>
        <option value="yes">{yesLabel}</option>
        <option value="no">{noLabel}</option>
      </select>
    </label>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
      />
    </label>
  )
}
