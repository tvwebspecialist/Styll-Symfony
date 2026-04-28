'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateTenantSubscription } from '@/app/admin/actions'

interface Plan {
  id: string
  name: string
  price_monthly: number
  is_active: boolean
}

interface Current {
  plan_id: string | null
  status: string
  starts_at: string | null
  ends_at: string | null
}

function toDateInput(v: string | null): string {
  if (!v) return ''
  try {
    return new Date(v).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

export function SubscriptionForm({
  tenantId,
  plans,
  current,
}: {
  tenantId: string
  plans: Plan[]
  current: Current | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [planId, setPlanId] = React.useState<string>(current?.plan_id ?? '')
  const [status, setStatus] = React.useState<string>(current?.status ?? 'active')
  const [startsAt, setStartsAt] = React.useState<string>(toDateInput(current?.starts_at ?? null))
  const [endsAt, setEndsAt] = React.useState<string>(toDateInput(current?.ends_at ?? null))

  function save() {
    startTransition(async () => {
      const res = await updateTenantSubscription(tenantId, {
        plan_id: planId || null,
        status,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Abbonamento aggiornato.')
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="s-plan">Piano</Label>
        <select
          id="s-plan"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">— Nessun piano —</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.is_active}>
              {p.name} — € {Number(p.price_monthly).toFixed(2)}/mese
              {!p.is_active ? ' (inattivo)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-status">Stato</Label>
        <select
          id="s-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="active">Attivo</option>
          <option value="trialing">Trial</option>
          <option value="past_due">In ritardo</option>
          <option value="canceled">Cancellato</option>
        </select>
      </div>
      <div />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-from">Inizio periodo</Label>
        <Input
          id="s-from"
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="s-to">Fine periodo</Label>
        <Input
          id="s-to"
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva abbonamento'}
        </Button>
      </div>
    </div>
  )
}
