'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { requestPasswordReset } from '@/app/(auth)/register/actions'
import { cn } from '@/lib/utils'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await requestPasswordReset(email.trim().toLowerCase())
      if (!res.success) {
        toast.error(res.error ?? 'Errore. Riprova.')
        return
      }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-success)',
          }}
        >
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3
          className="text-lg font-bold"
          style={{ color: 'var(--color-fg)' }}
        >
          Email inviata
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Se esiste un account con questa email, ti abbiamo inviato un link per
          reimpostare la password. Controlla la tua casella di posta.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false)
            setEmail('')
          }}
          className="mt-2 text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: 'var(--color-fg-secondary)' }}
        >
          Usa un&apos;altra email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="email" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Email
        </span>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@esempio.com"
          className="styll-input w-full px-4 py-3 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={isPending || !email}
        className={cn(
          'styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Invio in corso...
          </>
        ) : (
          'Invia link di reset'
        )}
      </button>
    </form>
  )
}
