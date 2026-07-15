import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentDpaDocumentMetadata } from '@/lib/legal/dpa'
import {
  PUBLIC_B2B_COMPANY_NAME,
  PUBLIC_B2B_CONTACT_EMAIL,
  PUBLIC_B2B_DOCS,
  PUBLIC_B2B_IDENTITY_NOTE,
  PUBLIC_B2B_LEGAL_PARTY_NAME,
  PUBLIC_B2B_LEGAL_REVIEW_NOTE,
  PUBLIC_B2B_PUBLIC_LEGAL_PARTY_NOTE,
  PUBLIC_DPA_SECTION_ID,
} from '@/lib/legal/public-b2b'

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

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: 32 }}>
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
  const doc = PUBLIC_B2B_DOCS.terms
  const dpa = getCurrentDpaDocumentMetadata()

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
            {PUBLIC_B2B_COMPANY_NAME}
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
            Aggiornati il <strong>{doc.lastUpdated}</strong> · Versione <strong>{doc.version}</strong> ·
            Condizioni B2B per l&apos;uso di {PUBLIC_B2B_COMPANY_NAME}.
          </p>
        </div>

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 18,
            padding: '20px 24px',
            marginBottom: 32,
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.primary }}>
            Pacchetto legale pubblico B2B di riferimento.
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: C.textMuted, lineHeight: 1.7 }}>
            {PUBLIC_B2B_LEGAL_REVIEW_NOTE}
          </p>
        </div>

        <Section title="1. Identità del fornitore e stato del documento">
          <p>
            Il servizio descritto in questa pagina è <strong style={{ color: C.primary }}>{PUBLIC_B2B_COMPANY_NAME}</strong>,
            nome commerciale del servizio fornito da{' '}
            <strong style={{ color: C.primary }}>{PUBLIC_B2B_LEGAL_PARTY_NAME}</strong>.
          </p>
          <p>{PUBLIC_B2B_PUBLIC_LEGAL_PARTY_NOTE}</p>
          <p>{PUBLIC_B2B_IDENTITY_NOTE}</p>
          <p>
            Per chiarimenti contrattuali o privacy puoi scrivere a{' '}
            <a
              href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`}
              style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              {PUBLIC_B2B_CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Oggetto del servizio">
          <p>
            Styll è una piattaforma SaaS white-label pensata per barbieri e piccoli saloni. Ti permette di
            gestire prenotazioni, CRM clienti, loyalty, retention e presenza digitale con il tuo brand.
          </p>
          <p>
            Salvo accordi diversi scritti, {PUBLIC_B2B_LEGAL_PARTY_NAME} concede al cliente business un diritto
            non esclusivo, non trasferibile e revocabile di usare la piattaforma per la propria attività
            professionale.
          </p>
        </Section>

        <Section title="3. Attivazione account e uso corretto della piattaforma">
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

        <Section title="4. Piani, condizioni economiche essenziali e attivazione">
          <p>
            Styll è erogato come servizio SaaS. L&apos;accesso può prevedere registrazione iniziale, eventuale
            prova gratuita e successiva attivazione di un piano a pagamento quando applicabile.
          </p>
          <p>
            Prima dell&apos;attivazione di qualsiasi piano a pagamento devono esserti resi visibili il prezzo o
            listino applicabile, l&apos;eventuale prova gratuita, la cadenza di fatturazione, il rinnovo e la
            decorrenza del piano.
          </p>
          <p>
            Se tali condizioni economiche non ti sono ancora state mostrate al momento della registrazione,
            questa pagina vale come informativa precontrattuale per gli aspetti economici e non comporta da
            sola l&apos;attivazione di un piano a pagamento.
          </p>
        </Section>

        <Section title="5. Durata, sospensione e recesso">
          <p>
            Il rapporto dura dalla data di attivazione del tuo account fino a chiusura del servizio o
            cessazione del piano applicabile.
          </p>
          <p>
            Puoi chiedere la cancellazione dell&apos;account o interrompere il rinnovo del piano prima della
            scadenza del periodo in corso; salvo diversa informazione resa visibile prima dell&apos;attivazione,
            l&apos;eventuale accesso a pagamento resta disponibile fino al termine del periodo già fatturato.
          </p>
          <p>
            {PUBLIC_B2B_LEGAL_PARTY_NAME} può sospendere o limitare l&apos;accesso in caso di uso illecito,
            violazione grave di questi termini, rischi di sicurezza, mancato pagamento o richieste
            dell&apos;autorità competente.
          </p>
        </Section>

        <Section title="6. Sicurezza, dati e sub-responsabili">
          <p>
            {PUBLIC_B2B_LEGAL_PARTY_NAME}, per erogare il servizio {PUBLIC_B2B_COMPANY_NAME}, adotta misure
            tecniche e organizzative e si avvale di fornitori terzi necessari al funzionamento della
            piattaforma.
          </p>
          <p>
            L&apos;elenco pubblico dei provider attivi è disponibile nella pagina{' '}
            <Link href="/sub-processor" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              Sub-responsabili
            </Link>
            .
          </p>
        </Section>

        <Section title="7. Limitazioni di responsabilità">
          <p>
            {PUBLIC_B2B_LEGAL_PARTY_NAME}, tramite il servizio {PUBLIC_B2B_COMPANY_NAME}, si impegna a
            mantenere la piattaforma ragionevolmente affidabile e sicura, ma non garantisce assenza assoluta
            di interruzioni, bug o indisponibilità di servizi terzi.
          </p>
          <p>
            Nei limiti consentiti dalla legge applicabile, resti responsabile dei contenuti, dei dati e
            delle comunicazioni che inserisci o invii tramite la piattaforma nel tuo rapporto con i clienti
            finali.
          </p>
          <p>
            Eventuali clausole amministrative o condizioni aggiuntive concordate per il tuo tenant devono
            risultare in forma scritta nelle superfici contrattuali o commerciali collegate al tuo account.
          </p>
        </Section>

        <Section title="8. Legge applicabile e interpretazione">
          <p>
            I presenti termini sono regolati dalla <strong style={{ color: C.primary }}>legge italiana</strong>,
            fatti salvi eventuali diritti inderogabili e gli eventuali accordi integrativi validamente conclusi
            con il cliente business.
          </p>
        </Section>

        <Section title="9. Contatti contrattuali e privacy">
          <p>
            Per richieste relative a questi termini, al DPA o ai trattamenti privacy collegati al servizio,
            il contatto operativo pubblico di riferimento è{' '}
            <a
              href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`}
              style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}
            >
              {PUBLIC_B2B_CONTACT_EMAIL}
            </a>
            .
          </p>
          <p>
            Comunicazioni contrattuali o istruzioni operative specifiche del cliente business possono essere
            gestite anche tramite i canali riportati nell&apos;onboarding o nell&apos;offerta commerciale associata
            all&apos;account.
          </p>
        </Section>

        <Section
          id={PUBLIC_DPA_SECTION_ID}
          title="10. Trattamento dati e Accordo sul Trattamento dei Dati (DPA)"
        >
          <p>
            Per i dati dei clienti finali del barbiere, {PUBLIC_B2B_LEGAL_PARTY_NAME}, tramite il servizio{' '}
            {PUBLIC_B2B_COMPANY_NAME}, opera come <strong style={{ color: C.primary }}>Responsabile del
            trattamento</strong> ai sensi dell&apos;Art. 28 GDPR, mentre il barbiere resta il Titolare.
          </p>
          <p>
            L&apos;<strong style={{ color: C.primary }}>Accordo sul Trattamento dei Dati</strong> è allegato ai
            presenti Termini come parte integrante del rapporto contrattuale. La versione corrente del DPA è
            la <strong>{dpa.version}</strong> del <strong>{dpa.publishedAt}</strong>.
          </p>
          <p>
            L&apos;accettazione del DPA è registrata per tenant durante l&apos;onboarding, con versione,
            timestamp e soggetto accettante. L&apos;elenco dei sub-responsabili richiamato dal DPA è
            disponibile nella pagina{' '}
            <Link href="/sub-processor" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
              Sub-responsabili
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
            <Link href={`/termini#${PUBLIC_DPA_SECTION_ID}`} style={{ color: C.accent, textDecoration: 'none' }}>
              Accordo trattamento dati (DPA)
            </Link>
            {' · '}
            <Link href="/sub-processor" style={{ color: C.accent, textDecoration: 'none' }}>
              Sub-responsabili
            </Link>
            {' · '}
            <Link href="/privacy" style={{ color: C.accent, textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            {' · '}
            <Link href="/cookie" style={{ color: C.accent, textDecoration: 'none' }}>
              Cookie Policy
            </Link>
            {' · '}
            <span>Versione {doc.version}</span>
          </p>
        </div>
      </div>
    </main>
  )
}
