'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  disconnectTenantWhatsAppBinding,
  upsertTenantWhatsAppBinding,
} from './actions'

interface BindingData {
  phoneNumberId: string
  businessAccountId: string
  displayPhoneNumber: string
}

export function WhatsAppBindingCard({
  tenantId,
  initial,
  hasVerifyToken,
  hasAppSecret,
  webhookUrl,
  isConnected,
}: {
  tenantId: string
  initial: BindingData
  hasVerifyToken: boolean
  hasAppSecret: boolean
  webhookUrl: string
  isConnected: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [phoneNumberId, setPhoneNumberId] = React.useState(initial.phoneNumberId)
  const [businessAccountId, setBusinessAccountId] = React.useState(initial.businessAccountId)
  const [displayPhoneNumber, setDisplayPhoneNumber] = React.useState(initial.displayPhoneNumber)

  function save() {
    startTransition(async () => {
      const res = await upsertTenantWhatsAppBinding(tenantId, {
        phoneNumberId,
        businessAccountId,
        displayPhoneNumber,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Errore salvataggio binding.')
        return
      }
      toast.success(isConnected ? 'Binding WhatsApp aggiornato.' : 'Binding WhatsApp salvato.')
      router.refresh()
    })
  }

  function disconnect() {
    startTransition(async () => {
      const res = await disconnectTenantWhatsAppBinding(tenantId)
      if (!res.success) {
        toast.error(res.error ?? 'Errore disconnessione.')
        return
      }
      toast.success('Binding WhatsApp disattivato.')
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Connessione WhatsApp</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Collega manualmente il `phone_number_id` Meta a questo tenant per attivare webhook e inbox.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-700'
          }`}
        >
          {isConnected ? 'Connesso' : 'Non connesso'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wa-phone-number-id">Phone number ID *</Label>
          <Input
            id="wa-phone-number-id"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="Es. 123456789012345"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wa-display-number">Display phone number</Label>
          <Input
            id="wa-display-number"
            value={displayPhoneNumber}
            onChange={(e) => setDisplayPhoneNumber(e.target.value)}
            placeholder="Es. +39 333 1112222"
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label htmlFor="wa-business-account-id">Business account ID / WABA</Label>
          <Input
            id="wa-business-account-id"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            placeholder="Es. 987654321098765"
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-zinc-50 p-3 text-xs">
        <div className="font-medium text-zinc-900">Webhook</div>
        <div className="mt-1 break-all font-mono text-zinc-700">{webhookUrl}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill ok={hasVerifyToken} label="VERIFY_TOKEN" />
          <StatusPill ok={hasAppSecret} label="APP_SECRET" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {isConnected ? (
          <Button
            type="button"
            variant="outline"
            onClick={disconnect}
            disabled={pending}
          >
            Disconnetti
          </Button>
        ) : null}
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? 'Salvataggio…' : isConnected ? 'Aggiorna binding' : 'Salva binding'}
        </Button>
      </div>
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
      }`}
    >
      {label}: {ok ? 'ok' : 'manca'}
    </span>
  )
}
