import type { ReactNode } from 'react'
import Link from 'next/link'
import { AnalyticsPreferencesCard } from '@/components/shared/AnalyticsPreferencesCard'
import { ANALYTICS_CONSENT_POLICY_VERSION } from '@/lib/analytics-consent-copy'
import {
  PUBLIC_B2B_CONTACT_EMAIL,
  PUBLIC_B2B_DOCS,
  PUBLIC_B2B_LEGAL_REVIEW_NOTE,
  PUBLIC_DPA_SECTION_ID,
} from '@/lib/legal/public-b2b'

type CookiePolicyPageContext =
  | {
      kind: 'platform'
      backHref: string
      backLabel: string
    }
  | {
      kind: 'tenant'
      backHref: string
      backLabel: string
      businessName: string
      privacyHref?: string
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

function Section({ title, children }: { title: string; children: ReactNode }) {
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
      storage: 'Cookie tecnico',
      purpose: 'Sessione Supabase',
      type: 'Tecnico, necessario',
      duration: 'Sessione / 1 ora',
    },
    {
      name: 'sb-*-auth-token-code-verifier',
      storage: 'Cookie tecnico',
      purpose: 'Token PKCE OAuth (verifica scambio codice)',
      type: 'Tecnico, necessario',
      duration: 'Temporaneo',
    },
    {
      name: 'styll_analytics_anon_v1',
      storage: 'Cookie tecnico',
      purpose: 'Associa lato server la preferenza analytics al browser corrente sulla stessa superficie',
      type: 'Tecnico di preferenza',
      duration: '180 giorni',
    },
    {
      name: 'styll_cookie_consent_v1',
      storage: 'localStorage (cache UI)',
      purpose: 'Memorizza lato browser lo stato corrente della scelta analytics per evitare di riproporre il banner inutilmente',
      type: 'Storage locale di preferenza',
      duration: 'Persistente fino a modifica o reset browser',
    },
    {
      name: 'styll_cookie_consent_version_v1',
      storage: 'localStorage (cache UI)',
      purpose: 'Memorizza la versione del testo di consenso attualmente applicata per invalidare la cache quando la policy cambia',
      type: 'Storage locale tecnico',
      duration: 'Persistente fino a modifica o reset browser',
    },
  ]

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: C.lightBg }}>
            {['Nome / chiave', 'Tecnologia', 'Finalità', 'Tipo', 'Durata'].map((h) => (
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
          {cookies.map((cookie) => (
            <tr key={cookie.name}>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, fontFamily: 'monospace', fontSize: 12, color: C.primary }}>
                {cookie.name}
              </td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>
                {cookie.storage}
              </td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>
                {cookie.purpose}
              </td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>
                {cookie.type}
              </td>
              <td style={{ padding: '10px 14px', border: `1px solid ${C.border}`, color: C.textMuted }}>
                {cookie.duration}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CookiePolicyPage({
  context,
}: {
  context: CookiePolicyPageContext
}) {
  const doc = PUBLIC_B2B_DOCS.cookie
  const isPlatform = context.kind === 'platform'
  const legalLinks = isPlatform
    ? [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: `/termini#${PUBLIC_DPA_SECTION_ID}`, label: 'DPA / Accordo trattamento dati' },
        { href: '/sub-processor', label: 'Sub-processor' },
      ]
    : [
        ...(context.privacyHref ? [{ href: context.privacyHref, label: 'Privacy Policy' }] as const : []),
      ]

  return (
    <main style={{ fontFamily: 'var(--font-primary, "Outfit", system-ui, sans-serif)', background: C.white, minHeight: '100vh' }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={context.backHref} style={{ fontSize: 20, fontWeight: 800, color: C.primary, textDecoration: 'none' }}>
            {isPlatform ? 'Styll' : 'Cookie Policy'}
          </Link>
          <Link href={context.backHref} style={{ fontSize: 14, color: C.textMuted, textDecoration: 'none', fontWeight: 500 }}>
            {context.backLabel}
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: C.primary, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Cookie Policy
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
            Ultimo aggiornamento: <strong>{doc.lastUpdated}</strong> · Versione <strong>{doc.version}</strong> · Rif. Art. 122 D.Lgs. 196/2003 (Codice Privacy)
          </p>
        </div>

        <div style={{ marginBottom: 32, padding: '20px 24px', background: C.lightBg, borderRadius: 12, border: `1px solid ${C.border}` }}>
          {isPlatform ? (
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
              Questa informativa riguarda il sito B2B <strong style={{ color: C.primary }}>styll.it</strong> e le
              relative superfici pubbliche di marketing. {PUBLIC_B2B_LEGAL_REVIEW_NOTE}
            </p>
          ) : (
            <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
              Questa informativa riguarda i cookie tecnici e gli analytics opzionali usati sulla superficie
              digitale di <strong style={{ color: C.primary }}>{context.businessName}</strong>, erogata tramite
              Styll. La scelta salvata qui vale per questa specifica superficie e per il relativo host.
            </p>
          )}
        </div>

        <Section title="Cosa sono i cookie">
          <p>
            I cookie sono piccoli file di testo che un sito deposita nel tuo browser. Servono a far funzionare
            le sessioni di accesso e a ricordare le tue preferenze tra una visita e l&apos;altra.
          </p>
        </Section>

        <Section title="Cookie e storage che usiamo">
          <p>
            {isPlatform
              ? 'Su styll.it usiamo solo cookie tecnici necessari al funzionamento del servizio e chiavi locali di preferenza per ricordare la tua scelta sugli analytics opzionali.'
              : 'Su questa superficie usiamo solo cookie tecnici necessari al funzionamento del servizio e chiavi locali di preferenza per ricordare la tua scelta sugli analytics opzionali.'}
          </p>
          <CookieTable />
        </Section>

        <Section title="Analytics opzionali (solo dopo consenso)">
          <p>
            Dopo il tuo consenso possiamo attivare strumenti analytics per misurare uso e performance della
            superficie, ad esempio <strong>Vercel Analytics</strong>, <strong>PostHog</strong> quando presente e
            analytics first-party di Styll. Senza consenso questi strumenti restano spenti.
          </p>
          <p>
            Gli analytics vengono usati solo per migliorare prodotto e prestazioni, mai per pubblicità
            comportamentale.
          </p>
          <p>
            La tua scelta viene registrata anche lato server con versione del testo, timestamp e contesto tecnico
            disponibile, così resta dimostrabile anche dopo la chiusura del banner.
          </p>
        </Section>

        <Section title="Gestisci preferenze analytics">
          <AnalyticsPreferencesCard />
          <p style={{ marginTop: 14 }}>
            Versione del testo di consenso attuale: <strong>{ANALYTICS_CONSENT_POLICY_VERSION}</strong>. Le
            azioni disponibili in questo centro preferenze sono le stesse usate dal banner e restano
            raggiungibili anche in seguito dai link “Gestisci cookie”.
          </p>
        </Section>

        <Section title="Cosa NON usiamo">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {[
              'Cookie di profilazione o marketing attivi di default.',
              'Cookie di terze parti pubblicitari (Google Ads, Meta Pixel, ecc.) senza consenso.',
              'Strumenti di tracciamento comportamentale attivi senza consenso espresso.',
            ].map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Come disabilitare i cookie tecnici">
          <p>
            Puoi disabilitare i cookie dal tuo browser, ma questo impedirà il funzionamento della sessione di
            accesso. Istruzioni per i principali browser:
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
            <a href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`} style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              {PUBLIC_B2B_CONTACT_EMAIL}
            </a>
          </p>
          {!isPlatform && context.privacyHref ? (
            <p>
              Per l&apos;informativa privacy completa della stessa superficie puoi consultare anche la{' '}
              <Link href={context.privacyHref} style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
                Privacy Policy
              </Link>
              .
            </p>
          ) : null}
          <p>
            Se preferisci, puoi anche rivedere o cambiare direttamente la tua scelta analytics da questo centro
            preferenze senza dover cancellare cookie tecnici o resettare il browser.
          </p>
        </Section>

        <div style={{ marginTop: 48, padding: '20px 24px', background: C.lightBg, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Riferimento normativo: Art. 122 D.Lgs. 196/2003 (Codice Privacy) e Linee guida del Garante per la
            protezione dei dati personali sui cookie (10 giugno 2021).
          </p>
          {legalLinks.length > 0 ? (
            <p style={{ fontSize: 13, color: C.textMuted, margin: '10px 0 0' }}>
              Link utili:{' '}
              {legalLinks.map((link, index) => (
                <span key={link.href}>
                  {index > 0 ? ' · ' : null}
                  <Link href={link.href} style={{ color: C.accent, textDecoration: 'none' }}>
                    {link.label}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  )
}
