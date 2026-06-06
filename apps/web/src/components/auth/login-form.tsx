'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const initialError = searchParams.get('error')

  function handleSubmit() {
    const emailValue = emailRef.current?.value || email
    const passwordValue = passwordRef.current?.value || password
    if (!emailValue || !passwordValue) {
      toast.error('Inserisci email e password')
      return
    }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValue.trim().toLowerCase(),
        password: passwordValue,
      })
      if (error) {
        toast.error(
          error.message.toLowerCase().includes('invalid')
            ? 'Email o password non corretti'
            : error.message
        )
        return
      }
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      router.push(redirectTo)
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
          className="styll-input w-full px-4 py-3 text-sm"
          style={{ fontSize: 16 }}
        />
      </label>

      <label htmlFor="password" className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--color-fg)' }}
          >
            Password
          </span>
          <Link
            href="/forgot-password"
            className="text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--color-fg-secondary)' }}
          >
            Password dimenticata?
          </Link>
        </div>
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
            className="styll-input w-full px-4 py-3 pr-11 text-sm"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPw((v) => !v) }}
            aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 hover:bg-[color:var(--color-bg-secondary)]"
            style={{ color: 'var(--color-fg-secondary)', minWidth: 44, minHeight: 44 }}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <button
        type="button"
        disabled={isPending}
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
    </form>
  )
}
