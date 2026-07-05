'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { buildRootAppUrl } from '@/lib/auth/urls'
import { createClient } from '@/lib/supabase/client'

interface GoogleButtonProps {
  label?: string
  loadingLabel?: string
  className?: string
  ariaLabel?: string
  variant?: 'primary' | 'secondary'
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1s2.69-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.55C16.83 3.4 14.66 2.4 12 2.4 6.92 2.4 2.8 6.52 2.8 11.6S6.92 20.8 12 20.8c6.93 0 9.2-4.86 9.2-7.36 0-.5-.05-.86-.12-1.24H12z"
      />
      <path
        fill="#4285F4"
        d="M21.08 12.2c0-.5-.05-.86-.12-1.24H12v3.94h5.5c-.22 1.27-1.5 3.74-5.5 3.74v.06l3.6 2.79c2.31-2.13 3.48-5.27 3.48-9.29z"
      />
      <path
        fill="#FBBC05"
        d="M5.83 13.94a6.13 6.13 0 0 1 0-3.88L2.2 7.27a9.6 9.6 0 0 0 0 9.46l3.63-2.79z"
      />
      <path
        fill="#34A853"
        d="M12 20.8c2.66 0 4.83-.88 6.44-2.4l-3.6-2.79c-.96.66-2.25 1.13-2.84 1.13-3.84 0-5.26-2.7-5.5-4.1l-3.63 2.79C4.41 18.49 7.86 20.8 12 20.8z"
      />
    </svg>
  )
}

export function GoogleButton({
  label = 'Continua con Google',
  loadingLabel = 'Accesso in corso...',
  className,
  ariaLabel,
  variant = 'secondary',
}: GoogleButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: buildRootAppUrl('/auth/callback'),
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            // skipBrowserRedirect so we navigate manually AFTER document.cookie
            // is committed — avoids iOS Safari ITP race condition where a Server
            // Action Set-Cookie may not be persisted before the cross-site
            // navigation to accounts.google.com starts.
            skipBrowserRedirect: true,
          },
        })
        if (error || !data.url) {
          toast.error('Impossibile avviare il login con Google. Riprova.')
          return
        }
        window.location.href = data.url
      } catch {
        toast.error('Impossibile avviare il login con Google. Riprova.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={ariaLabel ?? label}
      className={cn(
        variant === 'primary' ? 'styll-btn-primary' : 'styll-btn-secondary',
        'auth-google-btn flex w-full items-center justify-center gap-3 px-4 py-3 text-sm',
        className
      )}
      style={{ fontWeight: 600 }}
    >
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      <span>{isPending ? loadingLabel : label}</span>
    </button>
  )
}
