import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Privacy Policy per i barbieri | Styll',
  description:
    'Informativa privacy B2B per i barbieri e titolari che usano la piattaforma Styll.',
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

function DataCard({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '18px 20px',
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: C.primary,
          margin: '0 0 10px',
        }}
      >
        {title}
      </h3>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((item) => (
          <li key={item} style={{ marginBottom: 6 }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PrivacyPage() {
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
            Privacy Policy per i barbieri
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>
            Aggiornata il <strong>{LAST_UPDATED}</strong> · Informativa B2B per titolari e staff che
            usano Styll come piattaforma.
          </p>
        </div>

        <div
          style={{
            background: C.white,
            borderRadius: 20,
            border: `1px solid ${C.border}`,
            padding: '24px 28px',
            marginBottom: 32,
          }}
        >
          <p style={{ fontSize: 16, color: C.primary, lineHeight: 1.8, margin: 0 }}>
            Se usi Styll per gestire il tuo barbershop, questa informativa riguarda <strong>te</strong>{' '}
            come cliente business della piattaforma. Zero legalese inutile: qui trovi cosa raccogliamo,
            perché lo facciamo e quali diritti puoi esercitare in ogni momento.
          </p>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.8, margin: '14px 0 0' }}>
            Se invece sei un cliente finale che prenota dal tuo barbiere, questa non è la privacy che
            ti riguarda: la tua informativa è quella pubblicata nella PWA del salone.
          </p>
        </div>

        <Section title="1. Chi siamo">
          <p>
            Il titolare del trattamento per questa informativa è <strong style={{ color: C.primary }}>Styll</strong>,
            la piattaforma SaaS che aiuta i barbieri a gestire prenotazioni, clienti e retention in modo
            white-label.
          </p>
          <p>
            Per domande privacy puoi scriverci a{' '}
            <a
              href="mailto:privacy@styll.it"
              style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              privacy@styll.it
            </a>
            .
          </p>
        </Section>

        <Section title="2. Quali dati raccogliamo">
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <DataCard
              title="Dati account"
              items={['Nome e cognome', 'Email di accesso', 'Ruolo e preferenze essenziali']}
            />
            <DataCard
              title="Dati aziendali"
              items={['Nome attività', 'Slug / dominio app', 'Sedi, servizi, staff e branding']}
            />
            <DataCard
              title="Dati di utilizzo"
              items={['Accessi, log tecnici e eventi di prodotto', 'Configurazioni usate', 'Stato onboarding e attivazione funzioni']}
            />
            <DataCard
              title="Dati operativi"
              items={['Richieste di assistenza', 'Comunicazioni di supporto', 'Informazioni di billing e amministrative quando necessarie']}
            />
          </div>
        </Section>

        <Section title="3. Perché li usiamo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                background: C.white,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: '18px 20px',
              }}
            >
              <strong style={{ color: C.primary }}>Per attivare e gestire il tuo account</strong>
              <p style={{ margin: '8px 0 0' }}>
                Usiamo i dati account e aziendali per creare il workspace del tuo salone, farti accedere
                alla dashboard e configurare la tua app brandizzata. Base giuridica:{' '}
                <em>esecuzione del contratto</em>.
              </p>
            </div>
            <div
              style={{
                background: C.white,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: '18px 20px',
              }}
            >
              <strong style={{ color: C.primary }}>Per erogare il servizio e mantenerlo sicuro</strong>
              <p style={{ margin: '8px 0 0' }}>
                Usiamo log tecnici, eventi di utilizzo e dati operativi per prevenire abusi, risolvere
                problemi e migliorare stabilità e performance. Base giuridica:{' '}
                <em>legittimo interesse</em>.
              </p>
            </div>
            <div
              style={{
                background: C.white,
                borderRadius: 16,
                border: `1px solid ${C.border}`,
                padding: '18px 20px',
              }}
            >
              <strong style={{ color: C.primary }}>Per assistenza, comunicazioni di servizio e compliance</strong>
              <p style={{ margin: '8px 0 0' }}>
                Ti contattiamo quando serve per supporto, sicurezza account, aggiornamenti importanti e
                adempimenti amministrativi o fiscali. Base giuridica: <em>contratto</em> e, quando
                richiesto, <em>obbligo di legge</em>.
              </p>
            </div>
          </div>
        </Section>

        <Section title="4. Con chi condividiamo i dati">
          <p>
            Condividiamo i dati solo con fornitori necessari a far funzionare Styll: hosting, database,
            autenticazione, invio email e monitoraggio tecnico. Non vendiamo i tuoi dati. Mai.
          </p>
          <p>
            L&apos;elenco aggiornato dei fornitori che trattano dati per nostro conto è disponibile qui:{' '}
            <Link href="/sub-processor" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              Sub-processor
            </Link>
            .
          </p>
        </Section>

        <Section title="5. Per quanto tempo li conserviamo">
          <p>
            Teniamo i dati del tuo account finché il rapporto con Styll è attivo. Alcuni log tecnici
            vengono conservati per periodi più brevi, solo quanto basta per sicurezza e troubleshooting.
            I dati amministrativi e fiscali vengono tenuti per i tempi richiesti dalla legge.
          </p>
        </Section>

        <Section title="6. I tuoi diritti">
          <p>
            Puoi chiederci accesso, rettifica, cancellazione, limitazione del trattamento, portabilità o
            opposizione quando applicabile. Se qualcosa non ti torna, scrivici e lo affrontiamo in modo
            diretto.
          </p>
          <p>
            Contatto dedicato:{' '}
            <a
              href="mailto:privacy@styll.it"
              style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              privacy@styll.it
            </a>
            .
          </p>
        </Section>

        <Section title="7. Cookie e strumenti tecnici">
          <p>
            Usiamo cookie tecnici e preferenze essenziali per autenticazione, sessione e funzionamento del
            servizio. I dettagli sono nella nostra{' '}
            <Link href="/cookie" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              Cookie Policy
            </Link>
            .
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
            <Link href="/cookie" style={{ color: C.accent, textDecoration: 'none' }}>
              Cookie Policy
            </Link>
            {' · '}
            <Link href="/sub-processor" style={{ color: C.accent, textDecoration: 'none' }}>
              Sub-processor
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
