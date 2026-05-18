'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateMyClientProfile } from '@/lib/actions/client-auth'

interface ClientProfileFormProps {
  tenantId: string
  fullName: string
  email: string
  phone: string
}

export function ClientProfileForm({ tenantId, fullName, email, phone }: ClientProfileFormProps) {
  const [form, setForm] = useState({ fullName, email, phone })
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setMessage(null)
    startTransition(async () => {
      const result = await updateMyClientProfile({
        tenantId,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
      })

      setMessage({
        tone: result.success ? 'success' : 'error',
        text: result.success ? 'Profilo aggiornato.' : result.error,
      })
    })
  }

  return (
    <form
      className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
    >
      <h2 className="text-base font-extrabold text-neutral-950">I miei dati</h2>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Nome</span>
          <input
            required
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-950 outline-none focus:border-[var(--brand-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-950 outline-none focus:border-[var(--brand-primary)]"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Telefono</span>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 px-4 text-sm font-semibold text-neutral-950 outline-none focus:border-[var(--brand-primary)]"
          />
        </label>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.tone === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Salva modifiche
      </button>
    </form>
  )
}
