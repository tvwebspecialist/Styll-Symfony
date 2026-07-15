import type { Metadata } from 'next'
import Link from 'next/link'
import {
  PUBLIC_B2B_COMPANY_NAME,
  PUBLIC_B2B_CONTACT_EMAIL,
  PUBLIC_B2B_DOCS,
  PUBLIC_B2B_IDENTITY_NOTE,
  PUBLIC_B2B_LEGAL_PARTY_NAME,
  PUBLIC_B2B_PUBLIC_LEGAL_PARTY_NOTE,
  PUBLIC_B2B_SUBPROCESSORS,
  PUBLIC_DPA_SECTION_ID,
} from '@/lib/legal/public-b2b'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Sub-responsabili del trattamento | Styll',
  description: "Elenco dei sub-responsabili del trattamento dati ai sensi dell'Art. 28 GDPR.",
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

export default function SubProcessorPage() {
  const doc = PUBLIC_B2B_DOCS.subProcessor

  return (
    <main style={{ background: C.lightBg, minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ fontSize: 20, fontWeight: 800, color: C.primary, textDecoration: 'none', letterSpacing: '-0.02em' }}>Styll</Link>
        <span style={{ color: C.border }}>›</span>
        <span style={{ fontSize: 14, color: C.textMuted }}>Sub-responsabili</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: C.primary, marginBottom: 8, letterSpacing: '-0.02em' }}>
          Sub-responsabili del trattamento
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 40 }}>
          Aggiornato il {doc.lastUpdated} · Versione {doc.version} · Art. 28 GDPR · EDPB Opinion 22/2024
        </p>

        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 32 }}>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            {PUBLIC_B2B_LEGAL_PARTY_NAME}, per l&apos;erogazione del servizio {PUBLIC_B2B_COMPANY_NAME}, si avvale
            dei fornitori di seguito elencati come <strong style={{ color: C.primary }}>sub-responsabili del
            trattamento</strong> ai sensi dell&apos;Art. 28 GDPR. L&apos;elenco riflette le integrazioni attive
            nel codice e nelle superfici pubbliche o staff attualmente esposte dal progetto.
          </p>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: '12px 0 0' }}>
            {PUBLIC_B2B_PUBLIC_LEGAL_PARTY_NOTE}
          </p>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: '12px 0 0' }}>
            {PUBLIC_B2B_IDENTITY_NOTE}
          </p>
        </div>

        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflowX: 'auto', marginBottom: 32 }}>
          <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: C.lightBg, borderBottom: `1px solid ${C.border}` }}>
                {[
                  'Fornitore',
                  'Servizio',
                  'Finalità',
                  'Ruolo',
                  'Localizzazione',
                  'Trasferimenti / garanzie',
                  'Stato',
                ].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: C.primary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PUBLIC_B2B_SUBPROCESSORS.map((sp, i) => (
                <tr key={sp.name} style={{ borderBottom: i < PUBLIC_B2B_SUBPROCESSORS.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: C.primary, verticalAlign: 'top' }}>
                    <a href={sp.detailsUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>
                      {sp.name}
                    </a>
                  </td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.service}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.purpose}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.role}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.location}</td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>
                    <strong style={{ color: C.primary, fontWeight: 600 }}>Trasferimenti:</strong> {sp.transfers}
                    <br />
                    <strong style={{ color: C.primary, fontWeight: 600 }}>Garanzie:</strong> {sp.safeguards}
                  </td>
                  <td style={{ padding: '16px 20px', color: C.textMuted, verticalAlign: 'top' }}>{sp.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12 }}>Modifiche all&apos;elenco</h2>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            Questa pagina è il meccanismo pubblico di trasparenza richiamato dai Termini di Servizio e dal
            DPA. In caso di aggiunta o sostituzione di sub-responsabili, l&apos;elenco verrà aggiornato e i
            clienti B2B potranno chiedere chiarimenti o segnalare obiezioni scrivendo a{' '}
            <a href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`} style={{ color: C.accent, textDecoration: 'none' }}>
              {PUBLIC_B2B_CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px 28px', marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.primary, marginBottom: 12 }}>Nota sui trasferimenti extra-UE</h2>
          <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75, margin: 0 }}>
            Per alcuni fornitori extra-SEE, la documentazione pubblica del provider può richiamare SCC, DPF o
            altri meccanismi contrattuali applicabili. {PUBLIC_B2B_LEGAL_PARTY_NAME} non considera la sola
            dicitura &quot;hosting in EU&quot; sufficiente a escludere ogni trasferimento: per esempio, la regione
            primaria EU di Supabase riduce l&apos;esposizione ma non elimina automaticamente eventuali
            sub-trattamenti extra-SEE descritti dal fornitore.
          </p>
        </div>

        <p style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
          Domande?{' '}
          <a href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`} style={{ color: C.accent, textDecoration: 'none' }}>{PUBLIC_B2B_CONTACT_EMAIL}</a>
          {' · '}
          <Link href={`/termini#${PUBLIC_DPA_SECTION_ID}`} style={{ color: C.accent, textDecoration: 'none' }}>DPA</Link>
          {' · '}
          <Link href="/privacy" style={{ color: C.accent, textDecoration: 'none' }}>Privacy Policy</Link>
          {' · '}
          <Link href="/cookie" style={{ color: C.accent, textDecoration: 'none' }}>Cookie Policy</Link>
        </p>
      </div>
    </main>
  )
}
