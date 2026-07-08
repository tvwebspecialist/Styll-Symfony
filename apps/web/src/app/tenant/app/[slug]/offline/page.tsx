import type { CSSProperties } from 'react'
import { createTenantPaths } from '@/lib/pwa-redirect'

// Pagina di cortesia mostrata dal Service Worker quando una navigazione fallisce
// offline e non esiste una versione cachata della pagina richiesta. È puramente
// statica: nessun fetch, nessun dato dinamico. Usa --brand-primary (iniettata
// server-side nel layout PWA) per restare coerente col brand del tenant.
export const metadata = {
  title: 'Sei offline',
  robots: { index: false },
}

interface OfflinePageProps {
  params: Promise<{ slug: string }>
}

export default async function OfflinePage({ params }: OfflinePageProps) {
  const { slug } = await params
  const tenantPath = await createTenantPaths(slug)
  const retryHref = slug ? tenantPath('') : '/'

  const iconWrapStyle: CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'color-mix(in srgb, var(--brand-primary, #1A1A1A) 10%, transparent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  }

  return (
    <main
      style={{
        minHeight: '70dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 24px',
      }}
    >
      <div style={iconWrapStyle}>
        <svg
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand-primary, #1A1A1A)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111111' }}>Sei offline</h1>

      <p
        style={{
          margin: '10px 0 0',
          fontSize: 15,
          lineHeight: 1.5,
          color: '#6B7280',
          maxWidth: 320,
        }}
      >
        I tuoi appuntamenti salvati restano visibili anche senza connessione. Per prenotare o
        aggiornare i dati, ricollegati a internet.
      </p>

      <a
        href={retryHref}
        style={{
          marginTop: 24,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 22px',
          borderRadius: 999,
          background: 'var(--brand-primary, #1A1A1A)',
          color: '#FFFFFF',
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Riprova
      </a>
    </main>
  )
}
