'use client'

import { EmailOtpForm } from './EmailOtpForm'

interface ClientAccessFormProps {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantLogoUrl?: string | null
  initialMode: 'login' | 'register'
  initialEmail?: string
  returnTo?: string
  urlError?: string
  urlWelcome?: boolean
}

function resolveUrlBanner(
  urlError: string | undefined,
  urlWelcome: boolean | undefined,
): { tone: 'success' | 'error' | 'warning'; text: string } | null {
  if (urlWelcome) return { tone: 'success', text: 'Account verificato! Bentornato 🎉' }
  if (urlError === 'link_invalido') return { tone: 'error', text: 'Link non valido. Prova ad accedere.' }
  if (urlError === 'link_scaduto') return { tone: 'warning', text: 'Link scaduto. Richiedi una nuova email di verifica.' }
  if (urlError === 'oauth_failed') return { tone: 'error', text: 'Accesso con Google non riuscito. Riprova o usa il codice via email.' }
  return null
}

export function ClientAccessForm({
  tenantId,
  tenantSlug,
  initialEmail,
  returnTo,
  urlError,
  urlWelcome,
}: ClientAccessFormProps) {
  const banner = resolveUrlBanner(urlError, urlWelcome)

  const bannerCls = banner
    ? banner.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : banner.tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-red-200 bg-red-50 text-red-700'
    : null

  return (
    <>
      {banner && (
        <div
          role="alert"
          className={`mx-5 mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${bannerCls}`}
        >
          {banner.text}
        </div>
      )}
      <EmailOtpForm
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        mode="page"
        prefillEmail={initialEmail}
        returnTo={returnTo}
      />
    </>
  )
}
