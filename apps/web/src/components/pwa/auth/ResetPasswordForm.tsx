'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

export function ResetPasswordForm({ slug }: { slug: string }) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setMessage(null)

    if (password.length < 8) {
      setMessage({ tone: 'error', text: 'La password deve essere di almeno 8 caratteri.' })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ tone: 'error', text: 'Le password non coincidono.' })
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setMessage({ tone: 'error', text: 'Non siamo riusciti ad aggiornare la password. Riprova.' })
        return
      }

      setMessage({ tone: 'success', text: 'Password aggiornata!' })
      window.setTimeout(() => {
        router.push(tenantPath(''))
        router.refresh()
      }, 900)
    })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-164px)] w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-900/10 backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">Aggiorna password</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">Scegli una nuova password per il tuo account.</p>

        {message ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              message.tone === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <label className="block">
            <span className="text-sm font-semibold text-neutral-800">Nuova password *</span>
            <span className="mt-2 flex h-[52px] items-center rounded-2xl border border-neutral-200 bg-white px-4 transition focus-within:border-[var(--brand-primary)]">
              <input
                required
                minLength={8}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full flex-1 bg-transparent text-base text-neutral-950 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="ml-2 text-neutral-400"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </span>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-neutral-800">Conferma nuova password *</span>
            <input
              required
              minLength={8}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none styll-focus-brand-primary"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full styll-bg-brand-primary px-5 py-3 text-base font-bold text-white shadow-lg shadow-black/10 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Aggiorna password
          </button>
        </form>
      </div>
    </main>
  )
}
