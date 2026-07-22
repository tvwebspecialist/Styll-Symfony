'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { GoogleButton } from '@/components/auth/google-button'
import { cn } from '@/lib/utils'

interface LoginFormProps {
  initialError?: string | null
  redirectTo?: string | null
}

export function LoginForm({ initialError = null, redirectTo = null }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const isReady = true

  function handleSubmit() {
    const emailValue = emailRef.current?.value || email
    const passwordValue = passwordRef.current?.value || password
    if (!emailValue || !passwordValue) {
      toast.error('Inserisci email e password')
      return
    }
    startTransition(async () => {
      const response = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: emailValue.trim().toLowerCase(),
          password: passwordValue,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        toast.error(
          payload?.error || 'Impossibile completare il login.'
        )
        return
      }

      router.push(redirectTo || '/dashboard')
      router.refresh()
    })
  }

  return (
    <form className="flex flex-col gap-4">
      {initialError && (
        <div
          className="rounded-md px-3 py-2 text-xs"
          style={{
            backgroundColor: '#fef2f2',
            color: 'var(--color-danger)',
            border: '1px solid #fecaca',
          }}
        >
          {decodeURIComponent(initialError)}
        </div>
      )}

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
          autoComplete="email"
          required
          ref={emailRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@esempio.com"
          disabled={!isReady || isPending}
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
      </label>

      <label htmlFor="password" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Password
        </span>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            ref={passwordRef}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={!isReady || isPending}
            className="styll-input w-full px-4 py-3 pr-11 text-sm"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPw((v) => !v) }}
            aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
            disabled={!isReady || isPending}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 styll-hover-color-bg-secondary"
            style={{ color: 'var(--color-fg-secondary)', minWidth: 44, minHeight: 44 }}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <button
        type="button"
        disabled={!isReady || isPending}
        onClick={handleSubmit}
        className={cn(
          'styll-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm'
        )}
        style={{ minHeight: 52 }}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Accesso in corso...
          </>
        ) : (
          'Accedi'
        )}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border, #e5e7eb)' }} />
        <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-fg-secondary)' }}>
          oppure
        </span>
        <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-border, #e5e7eb)' }} />
      </div>

      <GoogleButton
        mode="staff_login"
        redirectTo={redirectTo}
        variant="secondary"
        loadingLabel="Reindirizzamento a Google..."
      />
    </form>
  )
}
