import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Sub-responsabili del trattamento | Styll',
  description: 'Elenco dei sub-responsabili del trattamento dati ai sensi dell\'Art. 28 GDPR.',
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

const LAST_UPDATED = '3 luglio 2026'

const SUB_PROCESSORS = [
  {
    name: 'Supabase Inc.',
    service: 'Database, autenticazione, storage',
    country: 'Irlanda (EU)',
    safeguard: 'Sede UE — nessun trasferimento extra-UE',
    dpa: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel Inc.',
    service: 'Hosting e CDN',
    country: 'USA',
    safeguard: 'DPF USA–UE + DPA',
    dpa: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Resend Inc.',
    service: 'Invio email transazionali',
    country: 'USA',
    safeguard: 'DPF USA–UE + DPA',
    dpa: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Functional Software Inc. (Sentry)',
    service: 'Monitoraggio errori',
    country: 'USA',
    safeguard: 'DPF USA–UE + DPA',
    dpa: 'https://sentry.io/privacy/',
  },
]

export default function SubProcessorPage() {
  return (
    <main style={{ background: C.lightBg, minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: C.primary, textDecoration: 'none', letterSpacing: '-0.02em' }}>Styll</Link>
        <span style={{ color: C.border }}>›</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>Sub-responsabili</span>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: C.primary, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Sub-responsabili del trattamento
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 40 }}>
          Aggiornato il {LAST_UPDATED} · Art. 28 GDPR · EDPB Opinion 22/2024
        </p>

        {/* Intro */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 32 }}>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            Styll S.r.l. (Titolare del trattamento) si avvale dei fornitori di seguito elencati come{' '}
            <strong style={{ color: C.primary }}>sub-responsabili del trattamento</strong> ai sensi dell&apos;Art. 28 GDPR.
            Con ciascuno è stato stipulato un accordo sul trattamento dei dati (DPA) che impone
            garanzie equivalenti a quelle del GDPR.
          </p>
        </div>

        {/* Table */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.lightBg, borderBottom: `1px solid ${C.border}` }}>
                {['Fornitore', 'Servizio', 'Paese', 'Garanzie'].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: C.primary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUB_PROCESSORS.map((sp, i) => (
                <tr key={sp.name} style={{ borderBottom: i < SUB_PROCESSORS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: C.primary, verticalAlign: 'top' }}>
                    <a href={sp.dpa} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>
                      {sp.name}
                    </a>
                  </td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.service}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{sp.country}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.safeguard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Notice */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12 }}>Modifiche all&apos;elenco</h2>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            In caso di aggiunta o sostituzione di sub-responsabili, questa pagina verrà aggiornata
            con almeno <strong style={{ color: C.primary }}>30 giorni di preavviso</strong>.
            I titolari del trattamento (barbieri) che utilizzano Styll possono opporsi
            alle modifiche entro tale termine scrivendo a{' '}
            <a href="mailto:privacy@styll.it" style={{ color: C.accent, textDecoration: 'none' }}>privacy@styll.it</a>.
          </p>
        </div>

        {/* DPF note */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12 }}>Nota sui trasferimenti extra-UE</h2>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            I fornitori con sede negli USA aderiscono al{' '}
            <strong style={{ color: C.primary }}>Data Privacy Framework (DPF) USA–UE</strong>,
            adeguatezza riconosciuta dalla Commissione Europea con decisione del 10 luglio 2023.
            La conformità DPF è verificabile sul{' '}
            <a href="https://www.dataprivacyframework.gov" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>
              registro ufficiale
            </a>.
          </p>
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
          Domande?{' '}
          <a href="mailto:privacy@styll.it" style={{ color: C.accent, textDecoration: 'none' }}>privacy@styll.it</a>
          {' · '}
          <Link href="/privacy" style={{ color: C.accent, textDecoration: 'none' }}>Privacy Policy</Link>
          {' · '}
          <Link href="/cookie" style={{ color: C.accent, textDecoration: 'none' }}>Cookie Policy</Link>
        </p>
      </div>
    </main>
  )
}
