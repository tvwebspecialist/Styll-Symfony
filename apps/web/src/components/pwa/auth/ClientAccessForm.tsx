'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import {
  mergeClientProfile,
  registerClient,
  requestPasswordReset,
  resendVerificationEmail,
} from '@/lib/actions/client-auth'

type Mode = 'login' | 'register'

interface ClientAccessFormProps {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantLogoUrl?: string | null
  initialMode: Mode
  initialEmail?: string
  returnTo?: string
  urlError?: string
  urlWelcome?: boolean
}

function getInitials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST'
  )
}

function mapLoginError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid') || m.includes('credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return "Controlla la tua email per verificare l'account."
  if (m.includes('too many') || m.includes('rate')) return 'Troppe richieste. Riprova tra qualche minuto.'
  return 'Qualcosa è andato storto. Riprova.'
}

function safeRedirect(tenantPath: (relativePath: string) => string, returnTo?: string): string {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return tenantPath('')
  }
  // Strip /tenant/app/slug prefix to get the relative part
  const relMatch = returnTo.match(/^\/tenant\/app\/[^/]+(.*)$/)
  const relativePart = relMatch ? relMatch[1] || '' : returnTo
  return tenantPath(relativePart)
}

export function ClientAccessForm({
  tenantId,
  tenantSlug,
  tenantName,
  tenantLogoUrl,
  initialMode,
  initialEmail = '',
  returnTo,
  urlError,
  urlWelcome,
}: ClientAccessFormProps) {
  const router = useRouter()
  const tenantPath = useTenantPath(tenantSlug)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'warning'; text: string } | null>(
    urlWelcome ? { tone: 'success', text: 'Account verificato! Bentornato 🎉' } : null
  )
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isProcessingHash, setIsProcessingHash] = useState(false)
  const [loginEmail, setLoginEmail] = useState(initialEmail)
  const [loginPassword, setLoginPassword] = useState('')
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: initialEmail,
    phone: '',
    password: '',
    confirmPassword: '',
    marketingConsent: false,
  })

  const basePath = tenantPath('')
  const urlBanner = useMemo(() => {
    if (urlError === 'link_invalido') {
      return { tone: 'error' as const, text: 'Link non valido. Prova ad accedere.' }
    }
    if (urlError === 'link_scaduto') {
      return { tone: 'warning' as const, text: 'Link scaduto. Richiedi una nuova email di verifica.' }
    }
    return null
  }, [urlError])

  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (!accessToken || !refreshToken || type !== 'signup') return

    // Remove tokens from the URL bar immediately
    window.history.replaceState(null, '', window.location.pathname)

    setIsProcessingHash(true)
    const supabase = createClient()

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (!error) {
          // Also persist in localStorage for iOS PWA cold-launch persistence
          const pwa = createPwaClient()
          await pwa.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          router.push(tenantPath(''))
          router.refresh()
        } else {
          setIsProcessingHash(false)
        }
      })
      .catch((err) => {
        console.error('[ClientAccessForm] setSession error:', err)
        setIsProcessingHash(false)
      })
  }, [])

  function bannerClasses(tone: 'success' | 'error' | 'warning') {
    if (tone === 'success') return 'border-green-200 bg-green-50 text-green-800'
    if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800'
    return 'border-red-200 bg-red-50 text-red-700'
  }

  function handleLogin() {
    setMessage(null)
    startTransition(async () => {
      // Auth via localStorage-based client so iOS PWA session survives cold launch
      const pwa = createPwaClient()
      const { data, error } = await pwa.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      })

      if (error) {
        setMessage({ tone: 'error', text: mapLoginError(error.message) })
        return
      }

      if (!data.user || !data.session) {
        setMessage({ tone: 'error', text: 'Qualcosa è andato storto. Riprova.' })
        return
      }

      // Also write session to cookies so server components can read it immediately
      const cookieClient = createClient()
      await cookieClient.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      // Guard: PWA is for clients only — staff have their own dashboard
      const { data: profile } = await cookieClient
        .from('profiles')
        .select('user_type')
        .eq('id', data.user.id)
        .single()

      if (profile?.user_type !== 'client') {
        setMessage({ tone: 'error', text: 'Questo portale è riservato ai clienti.' })
        await pwa.auth.signOut({ scope: 'local' })
        await cookieClient.auth.signOut({ scope: 'local' })
        return
      }

      // CRM: link auth user to the tenant's client record
      if (tenantId) {
        const meta = data.user.user_metadata ?? {}
        try {
          await mergeClientProfile({
            tenantId,
            profileId: data.user.id,
            email: data.user.email ?? loginEmail,
            phone: typeof meta.phone === 'string' ? meta.phone : '',
            fullName: typeof meta.full_name === 'string' ? meta.full_name : '',
            marketingConsent: Boolean(meta.marketing_consent),
          })
        } catch {
          // Non-blocking — CRM failure should not prevent login
        }
      }

      router.push(safeRedirect(tenantPath, returnTo))
      router.refresh()
    })
  }

  function handleRegister() {
    setMessage(null)

    if (registerData.password.length < 8) {
      setMessage({ tone: 'error', text: 'La password deve essere di almeno 8 caratteri.' })
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      setMessage({ tone: 'error', text: 'Le password non coincidono.' })
      return
    }

    startTransition(async () => {
      const result = await registerClient({
        tenantId,
        email: registerData.email,
        password: registerData.password,
        fullName: registerData.fullName,
        phone: registerData.phone,
        tenantSlug,
        marketingConsent: registerData.marketingConsent,
      })

      if (!result.success) {
        if (result.type === 'already_exists') {
          setMode('login')
          setLoginEmail(registerData.email)
          setMessage({
            tone: 'warning',
            text: "Hai già un account con questa email. Abbiamo precompilato il form per te.",
          })
          return
        }

        setMessage({ tone: 'error', text: result.error })
        return
      }

      setVerificationEmail(registerData.email)
    })
  }

  function handlePasswordReset() {
    const email = mode === 'login' ? loginEmail : registerData.email
    if (!email) {
      setMessage({ tone: 'error', text: 'Inserisci la tua email per ricevere il reset password.' })
      return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await requestPasswordReset({ email, tenantSlug })
      if (!result.success) {
        setMessage({ tone: 'error', text: result.error })
        return
      }
      setResetSent(true)
      setMessage({ tone: 'success', text: `Ti abbiamo inviato un link di reset a ${email}.` })
    })
  }

  function handleResendVerification(email: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await resendVerificationEmail({ email, tenantSlug })
      setMessage({
        tone: result.success ? 'success' : 'error',
        text: result.success ? 'Email di verifica inviata di nuovo.' : result.error,
      })
    })
  }

  if (isProcessingHash) {
    return (
      <main className="flex min-h-[calc(100dvh-164px)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[var(--brand-primary)]" />
      </main>
    )
  }

  return (
    <main className="relative mx-auto flex min-h-[calc(100dvh-164px)] w-full max-w-md flex-col px-4 py-6">
      <div className="absolute inset-x-8 top-2 -z-10 h-36 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" />

      <div className="mb-6 flex flex-col items-center text-center">
        {tenantLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenantLogoUrl}
            alt={tenantName}
            className="mb-3 size-16 rounded-full border-[2.5px] border-white object-cover shadow-lg"
          />
        ) : (
          <div className="mb-3 flex size-16 items-center justify-center rounded-full border-[2.5px] border-white bg-[var(--brand-primary)] text-lg font-bold tracking-wide text-white shadow-lg">
            {getInitials(tenantName)}
          </div>
        )}
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{tenantName}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-950">
          {mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}
        </h1>
      </div>

      <div className="rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-xl shadow-slate-900/10 backdrop-blur">
        <div className="mb-4 grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`min-h-11 rounded-xl text-sm font-bold transition ${
              mode === 'login' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`min-h-11 rounded-xl text-sm font-bold transition ${
              mode === 'register' ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Registrati
          </button>
        </div>

        {urlBanner ? (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${bannerClasses(urlBanner.tone)}`}>
            <p>{urlBanner.text}</p>
            {urlError === 'link_scaduto' ? (
              <button
                type="button"
                onClick={() => handleResendVerification(loginEmail || registerData.email)}
                className="mt-2 text-sm font-bold underline"
              >
                Reinvia email
              </button>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${bannerClasses(message.tone)}`}>
            {message.text}
          </div>
        ) : null}

        {verificationEmail ? (
          <div className="rounded-3xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-5 text-center">
            <div className="text-4xl">✉️</div>
            <h2 className="mt-3 text-xl font-extrabold text-neutral-950">Controlla la tua email</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Abbiamo inviato un link di verifica a <strong>{verificationEmail}</strong>. Clicca il link per
              attivare il tuo account.
            </p>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleResendVerification(verificationEmail)}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--brand-primary)] px-4 py-2 text-sm font-bold text-[var(--brand-primary)] disabled:opacity-60"
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Non hai ricevuto l&apos;email? Reinvia
            </button>
          </div>
        ) : mode === 'login' ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleLogin()
            }}
          >
            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Email *</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-[var(--brand-primary)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Password *</span>
              <span className="mt-2 flex h-[52px] items-center rounded-2xl border border-neutral-200 bg-white px-4 transition focus-within:border-[var(--brand-primary)]">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
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

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={isPending || resetSent}
              className="text-sm font-semibold text-[var(--brand-primary)] disabled:opacity-60"
            >
              Password dimenticata?
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-5 py-3 text-base font-bold text-white shadow-lg shadow-black/10 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Accedi
            </button>

            <button
              type="button"
              onClick={() => setMode('register')}
              className="w-full text-center text-sm font-semibold text-neutral-500"
            >
              Non hai un account? <span className="text-[var(--brand-primary)]">Registrati</span>
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              handleRegister()
            }}
          >
            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Nome completo *</span>
              <input
                required
                type="text"
                autoComplete="name"
                value={registerData.fullName}
                onChange={(event) => setRegisterData((current) => ({ ...current, fullName: event.target.value }))}
                className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-[var(--brand-primary)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Email *</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={registerData.email}
                onChange={(event) => setRegisterData((current) => ({ ...current, email: event.target.value }))}
                className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-[var(--brand-primary)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Telefono *</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+39 o 348..."
                value={registerData.phone}
                onChange={(event) => setRegisterData((current) => ({ ...current, phone: event.target.value }))}
                className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-[var(--brand-primary)]"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-neutral-800">Password *</span>
              <span className="mt-2 flex h-[52px] items-center rounded-2xl border border-neutral-200 bg-white px-4 transition focus-within:border-[var(--brand-primary)]">
                <input
                  required
                  minLength={8}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={registerData.password}
                  onChange={(event) => setRegisterData((current) => ({ ...current, password: event.target.value }))}
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
              <span className="text-sm font-semibold text-neutral-800">Conferma password *</span>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={registerData.confirmPassword}
                onChange={(event) =>
                  setRegisterData((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                className="mt-2 h-[52px] w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base text-neutral-950 outline-none transition focus:border-[var(--brand-primary)]"
              />
            </label>

            <label className="flex gap-3 rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={registerData.marketingConsent}
                onChange={(event) =>
                  setRegisterData((current) => ({ ...current, marketingConsent: event.target.checked }))
                }
                className="mt-1 size-4 rounded border-neutral-300 accent-[var(--brand-primary)]"
              />
              <span>Acconsento a ricevere comunicazioni promozionali da {tenantName}.</span>
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-[var(--brand-primary)] px-5 py-3 text-base font-bold text-white shadow-lg shadow-black/10 disabled:opacity-60"
            >
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Crea account
            </button>

            <p className="text-center text-xs leading-5 text-neutral-400">
              Creando un account accetti i Termini di servizio e la Privacy Policy di {tenantName}.
            </p>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-sm font-semibold text-neutral-500"
            >
              Hai già un account? <span className="text-[var(--brand-primary)]">Accedi</span>
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">oppure</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <Link
        href={tenantPath('/prenota')}
        className="block py-3 text-center text-sm text-neutral-500"
      >
        Continua senza account →
      </Link>
    </main>
  )
}
