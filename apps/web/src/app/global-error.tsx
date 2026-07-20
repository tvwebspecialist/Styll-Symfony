'use client'

import * as Sentry from '@sentry/nextjs'
import type { CSSProperties } from 'react'
import { useEffect } from 'react'

type GlobalErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const bodyStyle: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background:
    'radial-gradient(circle at top, rgba(215, 193, 173, 0.32), transparent 45%), #f7f1ea',
  color: '#1f1a17',
  fontFamily:
    'var(--font-outfit, "Outfit"), var(--font-poppins, "Poppins"), system-ui, sans-serif',
}

const panelStyle: CSSProperties = {
  width: '100%',
  maxWidth: '560px',
  borderRadius: '28px',
  border: '1px solid rgba(31, 26, 23, 0.08)',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  boxShadow: '0 24px 80px rgba(31, 26, 23, 0.12)',
  padding: '32px',
}

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#8a5a44',
}

const titleStyle: CSSProperties = {
  margin: '12px 0 0',
  fontSize: 'clamp(2rem, 4vw, 2.6rem)',
  lineHeight: 1.05,
}

const textStyle: CSSProperties = {
  margin: '16px 0 0',
  fontSize: '1rem',
  lineHeight: 1.6,
  color: 'rgba(31, 26, 23, 0.82)',
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '24px',
}

const primaryActionStyle: CSSProperties = {
  border: 'none',
  borderRadius: '999px',
  backgroundColor: '#1f1a17',
  color: '#fffdf8',
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: 600,
  padding: '12px 18px',
}

const secondaryActionStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  border: '1px solid rgba(31, 26, 23, 0.14)',
  color: '#1f1a17',
  fontWeight: 600,
  padding: '12px 18px',
  textDecoration: 'none',
}

const digestStyle: CSSProperties = {
  margin: '20px 0 0',
  fontSize: '0.85rem',
  color: 'rgba(31, 26, 23, 0.58)',
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  const message = error.digest
    ? 'Si e verificato un errore lato server. Ricarica la pagina oppure riprova tra qualche istante.'
    : 'Si e verificato un errore inatteso. Puoi riprovare subito oppure tornare alla home.'

  return (
    <html lang="it">
      <body style={bodyStyle}>
        <main style={panelStyle}>
          <p style={eyebrowStyle}>Errore applicazione</p>
          <h1 style={titleStyle}>Qualcosa e andato storto.</h1>
          <p style={textStyle}>{message}</p>
          <div style={actionsStyle}>
            <button type="button" onClick={reset} style={primaryActionStyle}>
              Riprova
            </button>
            <a href="/" style={secondaryActionStyle}>
              Torna alla home
            </a>
          </div>
          {error.digest ? (
            <p style={digestStyle}>Riferimento errore: {error.digest}</p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
