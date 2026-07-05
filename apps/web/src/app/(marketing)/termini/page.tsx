import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Termini di Servizio per i barbieri | Styll',
  description: 'Termini di Servizio B2B per i barbieri che usano la piattaforma Styll.',
}

const C = {
  primary: '#1A1A2E',
  accent: '#E94560',
  white: '#FFFFFF',
  lightBg: '#F8F8FC',
  textMuted: '#64748B',
  border: '#E2E8F0',
}

const LAST_UPDATED = '5 luglio 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: C.primary,
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <main
      style={{
        fontFamily: 'var(--font-primary, "Outfit", system-ui, sans-serif)',
        background: C.lightBg,
        minHeight: '100vh',
      }}
    >
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.white, padding: '0 24px' }}>
        <div
          style={{
            maxWidth: 840,
            margin: '0 auto',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.primary,
              textDecoration: 'none',
            }}
          >
            Styll
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              color: C.textMuted,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Torna alla home
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: C.primary,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            Termini di Servizio per i barbieri
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
            Aggiornati il <strong>{LAST_UPDATED}</strong> · Condizioni B2B per l&apos;uso di Styll.
          </p>
        </div>

        <div
          style={{
            background: 'rgba(233,69,96,0.08)',
            border: `1px solid rgba(233,69,96,0.18)`,
            borderRadius: 18,
            padding: '18px 20px',
            marginBottom: 32,
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.primary }}>
            Documento in fase di revisione legale.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>
            La versione definitiva potrà essere aggiornata prima del rilascio commerciale finale, ma i
            principi qui sotto restano il perimetro del rapporto tra Styll e il barbiere.
          </p>
        </div>

        <Section title="1. Oggetto del servizio">
          <p>
            Styll è una piattaforma SaaS white-label pensata per barbieri e piccoli saloni. Ti permette di
            gestire prenotazioni, CRM clienti, loyalty, retention e presenza digitale con il tuo brand.
          </p>
          <p>
            Salvo accordi diversi scritti, Styll ti concede un diritto non esclusivo, non trasferibile e
            revocabile di usare la piattaforma per la tua attività professionale.
          </p>
        </Section>

        <Section title="2. Obblighi del barbiere">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {[
              'Fornire dati account e aziendali accurati e aggiornati.',
              'Usare la piattaforma nel rispetto della legge, del GDPR e dei diritti dei clienti finali.',
              'Custodire credenziali, accessi staff e dispositivi in modo diligente.',
              'Non usare Styll per spam, attività illecite, contenuti ingannevoli o trattamenti non autorizzati.',
              'Gestire consensi, informative e comunicazioni verso i clienti finali quando agisci come titolare del trattamento.',
            ].map((item) => (
              <li key={item} style={{ marginBottom: 8 }}>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Pricing e pagamenti">
          <p>
            <strong style={{ color: C.primary }}>Placeholder temporaneo:</strong> piani, canoni, rinnovi,
            periodi di prova, modalità di fatturazione e conseguenze del mancato pagamento saranno
            dettagliati nell&apos;offerta commerciale, nella sezione billing e nella versione finale di questo
            documento.
          </p>
          <p>
            Fino ad allora, fanno fede le condizioni economiche comunicate da Styll e accettate dal
            barbiere in fase di onboarding, attivazione o accordo commerciale scritto.
          </p>
        </Section>

        <Section title="4. Limitazioni di responsabilità">
          <p>
            Facciamo il possibile per mantenere Styll affidabile, veloce e sicuro, ma non possiamo
            garantire assenza totale di interruzioni, bug o indisponibilità di servizi terzi.
          </p>
          <p>
            Nei limiti massimi consentiti dalla legge italiana, Styll non risponde di danni indiretti,
            perdita di profitto, perdita di opportunità commerciali o uso improprio della piattaforma da
            parte del barbiere o del suo staff.
          </p>
          <p>
            Resti responsabile dei contenuti, dei dati e delle comunicazioni che inserisci o invii tramite
            la piattaforma nel tuo rapporto con i clienti finali.
          </p>
        </Section>

        <Section title="5. Durata e recesso">
          <p>
            Il rapporto dura dalla data di attivazione dell&apos;account fino a cessazione del piano o chiusura
            del servizio, secondo le condizioni economiche applicabili.
          </p>
          <p>
            Il barbiere può recedere secondo le modalità previste dal piano attivo. Styll può sospendere o
            limitare l&apos;accesso in caso di uso illecito, violazione grave dei presenti termini, rischi di
            sicurezza o mancato pagamento.
          </p>
        </Section>

        <Section title="6. Legge applicabile">
          <p>
            I presenti termini sono regolati dalla <strong style={{ color: C.primary }}>legge italiana</strong>.
          </p>
        </Section>

        <Section title="7. Foro competente">
          <p>
            Per ogni controversia relativa a questi termini è competente in via esclusiva il{' '}
            <strong style={{ color: C.primary }}>Foro di Brescia</strong>, salvo diversa inderogabile previsione
            di legge.
          </p>
        </Section>

        <div
          style={{
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            padding: '20px 24px',
            marginTop: 40,
          }}
        >
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Link utili:{' '}
            <Link href="/privacy" style={{ color: C.accent, textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            {' · '}
            <Link href="/cookie" style={{ color: C.accent, textDecoration: 'none' }}>
              Cookie Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
