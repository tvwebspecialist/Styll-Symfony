'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

interface ResetPasswordFormProps {
  token: string | null
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!token) {
    return (
      <div
        className="rounded-md px-4 py-3 text-sm"
        style={{
          backgroundColor: '#fef2f2',
          color: 'var(--color-danger)',
          border: '1px solid #fecaca',
        }}
      >
        Link non valido o scaduto. Richiedi un nuovo link dalla pagina{' '}
        <a href="/forgot-password" className="font-semibold underline">
          Password dimenticata
        </a>.
      </div>
    )
  }

  if (done) {
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
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-fg)' }}>
          Password aggiornata
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-fg-secondary)' }}>
          Ora puoi accedere con la tua nuova password.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="styll-btn-primary mt-2 px-6 py-2.5 text-sm"
        >
          Accedi
        </button>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return

    startTransition(async () => {
      const res = await fetch('/api/auth/staff/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        toast.error(body?.error ?? 'Errore. Il link potrebbe essere scaduto.')
        return
      }

      setDone(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="new-password" className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-fg)' }}>
          Nuova password
        </span>
        <div className="relative">
          <input
            id="new-password"
            type={showPw ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimo 8 caratteri"
            className="styll-input w-full px-4 py-3 pr-12 text-sm"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center"
            aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
          >
            {showPw
              ? <EyeOff className="h-4 w-4" style={{ color: 'var(--color-fg-secondary)' }} />
              : <Eye className="h-4 w-4" style={{ color: 'var(--color-fg-secondary)' }} />
            }
          </button>
        </div>
      </label>

      <button
        type="submit"
        disabled={isPending || password.length < 8}
        className={cn(
          'styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvataggio...
          </>
        ) : (
          'Imposta nuova password'
        )}
      </button>
    </form>
  )
}
