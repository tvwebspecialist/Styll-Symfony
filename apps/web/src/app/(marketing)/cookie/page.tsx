import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Cookie Policy | Styll',
  description: 'Informativa cookie del sito styll.it.',
}

const C = {
  primary: '#1A1A2E',
  accent: '#E94560',
  dark: '#0F0F1E',
  white: '#FFFFFF',
  lightBg: '#F8F8FC',
  textMuted: '#64748B',
  border: '#E2E8F0',
}

const LAST_UPDATED = '2026-07-03'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.primary, marginBottom: 12 }}>{title}</h2>
      <div style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

function CookieTable() {
  const cookies = [
    {
      name: 'sb-*-auth-token',
      purpose: 'Sessione Supabase',
      type: 'Tecnico, necessario',
      duration: 'Sessione / 1 ora',
    },
    {
      name: 'sb-*-auth-token-code-verifier',
      purpose: 'Token PKCE OAuth (verifica scambio codice)',
      type: 'Tecnico, necessario',
      duration: 'Temporaneo',
    },
  ]

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: C.lightBg }}>
            {['Nome', 'Finalità', 'Tipo', 'Durata'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontWeight: 700,
                  color: C.primary,
                  border: `1px solid ${C.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cookies.map((c) => (
            <tr key={c.name}>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, fontFamily: 'monospace', fontSize: 12, color: C.primary }}>{c.name}</td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>{c.purpose}</td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>{c.type}</td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>{c.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function CookiePage() {
  return (
    <main style={{ fontFamily: 'var(--font-primary, "Outfit", system-ui, sans-serif)', background: C.white, minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>Styll</Link>
          <Link href="/" style={{ fontSize: 14, color: C.textMuted, textDecoration: 'none', fontWeight: 500 }}>← Torna alla home</Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>

        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: C.primary, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
            Ultimo aggiornamento: <strong>{LAST_UPDATED}</strong> · Rif. Art. 122 D.Lgs. 196/2003 (Codice Privacy)
          </p>
        </div>

        <Section title="Cosa sono i cookie">
          <p>
            I cookie sono piccoli file di testo che un sito deposita nel tuo browser. Servono a far funzionare
            le sessioni di accesso e a ricordare le tue preferenze tra una visita e l&apos;altra.
          </p>
        </Section>

        <Section title="Cookie che usiamo">
          <p>Su styll.it usiamo esclusivamente cookie tecnici necessari. Non installiamo cookie di profilazione,
            tracciamento comportamentale o pubblicità.</p>
          <CookieTable />
        </Section>

        <Section title="Vercel Analytics">
          <p>
            Utilizziamo Vercel Analytics per misurare le performance del sito (tempi di caricamento, pagine visitate).
            Vercel Analytics funziona <strong>senza cookie</strong> e senza identificatori persistenti — i dati
            sono aggregati e anonimi. Non è richiesto alcun consenso.
          </p>
        </Section>

        <Section title="Cosa NON usiamo">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {[
              'Cookie di profilazione o marketing',
              'Cookie di terze parti pubblicitari (Google Ads, Meta Pixel, ecc.)',
              'Strumenti di tracciamento comportamentale',
            ].map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Come disabilitare i cookie tecnici">
          <p>
            Puoi disabilitare i cookie dal tuo browser, ma questo impedirà il funzionamento della sessione
            di accesso (non potrai più entrare nell&apos;account). Istruzioni per i principali browser:
          </p>
          <ul style={{ paddingLeft: 20, margin: '12px 0 0' }}>
            {[
              { label: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
              { label: 'Firefox', url: 'https://support.mozilla.org/it/kb/Eliminare%20i%20cookie' },
              { label: 'Safari (Mac)', url: 'https://support.apple.com/it-it/guide/safari/sfri11471/mac' },
              { label: 'Safari (iOS)', url: 'https://support.apple.com/it-it/HT201265' },
            ].map(({ label, url }) => (
              <li key={label} style={{ marginBottom: 8 }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 500 }}>
                  {label} →
                </a>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Contatti">
          <p>
            Per qualsiasi domanda su questa informativa:{' '}
            <a href="mailto:privacy@styll.it" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              privacy@styll.it
            </a>
          </p>
        </Section>

        <div style={{ marginTop: 48, padding: '20px 24px', background: C.lightBg, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Riferimento normativo: Art. 122 D.Lgs. 196/2003 (Codice Privacy) e Linee guida del Garante
            per la protezione dei dati personali sui cookie (10 giugno 2021).
          </p>
        </div>
      </div>

    </main>
  )
}
