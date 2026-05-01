'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Mail, UserPlus, AlertTriangle, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { assignTenantOwnerByEmail } from '@/app/admin/actions'

interface OwnerInfo {
  profileId: string
  fullName: string | null
  email: string | null
  avatarUrl: string | null
}

interface Props {
  tenantId: string
  owner: OwnerInfo | null
}

export function TenantOwnerCard({ tenantId, owner }: Props) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [editing, setEditing] = React.useState(!owner)
  const [email, setEmail] = React.useState('')

  function submit() {
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Inserisci un'email.")
      return
    }
    startTransition(async () => {
      const res = await assignTenantOwnerByEmail(tenantId, trimmed)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(owner ? 'Proprietario aggiornato.' : 'Proprietario assegnato.')
      setEmail('')
      setEditing(false)
      router.refresh()
    })
  }

  const initials = (owner?.fullName ?? owner?.email ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

  return (
    <div
      className="rounded-2xl border bg-white p-5 shadow-sm "
      style={{ fontFamily: 'var(--font-primary)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-violet-500" />
          Gestione Proprietario
        </h2>
        {owner && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50    "
          >
            <RefreshCw className="h-3 w-3" /> Cambia
          </button>
        ) : null}
      </div>

      {owner && !editing ? (
        <div className="flex items-center gap-3">
          {owner.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={owner.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
              {initials}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              {owner.fullName ?? '—'}
            </span>
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {owner.email ?? '—'}
            </span>
          </div>
        </div>
      ) : (
        <>
          {!owner ? (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Questo tenant non ha un proprietario. Inserisci l&apos;email di un
                utente esistente per assegnarlo.
              </span>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="owner-email" className="text-xs">
              Email del nuovo proprietario
            </Label>
            <div className="flex gap-2">
              <Input
                id="owner-email"
                type="email"
                placeholder="email@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submit()
                  }
                }}
                className="h-9"
              />
              <Button size="sm" onClick={submit} disabled={pending || !email.trim()}>
                {pending ? '…' : owner ? 'Cambia' : 'Assegna'}
              </Button>
              {owner ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setEmail('')
                  }}
                  disabled={pending}
                  aria-label="Annulla"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              L&apos;utente dev&apos;essere già registrato. Eventuali proprietari
              esistenti verranno declassati a manager.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
