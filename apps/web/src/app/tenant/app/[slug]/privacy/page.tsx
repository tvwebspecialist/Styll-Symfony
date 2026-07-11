import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { PUBLIC_B2B_CONTACT_EMAIL, PUBLIC_B2B_IDENTITY_NOTE } from '@/lib/legal/public-b2b'

interface Props {
  params: Promise<{ slug: string }>
}

interface OwnerContactRow {
  profiles:
    | {
        email: string | null
        phone: string | null
      }
    | Array<{
        email: string | null
        phone: string | null
      }>
    | null
}

interface LocationContactRow {
  address: string | null
  city: string | null
  email: string | null
  name: string
  phone: string | null
  zip_code: string | null
}

interface TenantContact {
  address: string | null
  email: string | null
  locationName: string | null
  phone: string | null
}

const DOCUMENT_VERSION = '1.2'
const EFFECTIVE_DATE = '10 luglio 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[15px] font-bold text-neutral-900">{title}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-neutral-600">{children}</div>
    </section>
  )
}

function ContactCardItem({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      {href ? (
        <a href={href} className="text-sm font-medium text-neutral-800 underline underline-offset-2">
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-neutral-800">{value}</p>
      )}
    </div>
  )
}

function formatAddress(location: LocationContactRow | null): string | null {
  if (!location) return null

  const cityLine = [location.zip_code, location.city].filter(Boolean).join(' ')
  const parts = [location.address, cityLine].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

async function getTenantContact(tenantId: string): Promise<TenantContact> {
  const db = createAdminClient()

  const [ownerResult, locationResult] = await Promise.all([
    db
      .from('staff_members')
      .select('profiles!inner(email, phone)')
      .eq('tenant_id', tenantId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
    db
      .from('locations')
      .select('name, address, city, zip_code, phone, email')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const ownerData = ownerResult.data as OwnerContactRow | null
  const ownerProfile = Array.isArray(ownerData?.profiles)
    ? (ownerData.profiles[0] ?? null)
    : (ownerData?.profiles ?? null)
  const location = (locationResult.data as LocationContactRow | null) ?? null

  return {
    email: location?.email ?? ownerProfile?.email ?? null,
    phone: location?.phone ?? ownerProfile?.phone ?? null,
    address: formatAddress(location),
    locationName: location?.name ?? null,
  }
}

export default async function PrivacyPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const contact = await getTenantContact(tenant.tenant_id)
  const hasControllerContact = Boolean(contact.email || contact.phone || contact.address)

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Privacy Policy cliente finale
            </p>
            <h1 className="mt-2 text-[24px] font-black tracking-tight text-neutral-950">
              Privacy Policy di {tenant.business_name}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">
              Questa informativa spiega come <strong className="text-neutral-900">{tenant.business_name}</strong>{' '}
              tratta i tuoi dati personali quando usi questa app per prenotare, gestire il tuo profilo, ricevere
              comunicazioni e, se attivo, partecipare al programma loyalty del salone.
            </p>
            <p className="mt-2 text-[12px] text-neutral-400">
              Versione documento: <strong>{DOCUMENT_VERSION}</strong> · Entrata in vigore:{' '}
              <strong>{EFFECTIVE_DATE}</strong>
            </p>
          </div>

          <Section title="1. Titolare del trattamento">
            <p>
              Il Titolare del trattamento è il barbiere o salone che offre il servizio tramite questa app:
            </p>
            <div className="mt-2 grid gap-2">
              <ContactCardItem label="Salone" value={tenant.business_name} />
              {contact.locationName ? <ContactCardItem label="Sede" value={contact.locationName} /> : null}
              {contact.email ? (
                <ContactCardItem label="Email" value={contact.email} href={`mailto:${contact.email}`} />
              ) : null}
              {contact.phone ? (
                <ContactCardItem label="Telefono" value={contact.phone} href={`tel:${contact.phone}`} />
              ) : null}
              {contact.address ? <ContactCardItem label="Indirizzo" value={contact.address} /> : null}
            </div>
            {!hasControllerContact ? (
              <p>
                I recapiti digitali diretti del Titolare non sono ancora pubblicati in questa app. Se devi
                esercitare un diritto privacy, puoi contattare il salone direttamente in sede; se scrivi a
                Styll, la richiesta verrà inoltrata al Titolare competente.
              </p>
            ) : null}
          </Section>

          <Section title="2. Styll come Responsabile del trattamento">
            <p>
              Il servizio è fornito tramite la piattaforma <strong className="text-neutral-900">Styll</strong>,
              che opera come <strong className="text-neutral-900">Responsabile del trattamento</strong> per conto
              del Titolare, ai sensi dell&apos;Art. 28 GDPR.
            </p>
            <p>
              Styll gestisce l&apos;infrastruttura tecnica dell&apos;app, ma non decide le finalità commerciali del
              rapporto tra te e il salone.
            </p>
            <p>{PUBLIC_B2B_IDENTITY_NOTE}</p>
            <p>
              Contatto operativo di Styll:{' '}
              <a href={`mailto:${PUBLIC_B2B_CONTACT_EMAIL}`} className="underline text-neutral-700">
                {PUBLIC_B2B_CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="3. Categorie di dati trattati">
            <ul className="list-disc space-y-1 pl-5">
              <li>dati identificativi e di contatto (nome, telefono, email);</li>
              <li>dati relativi a prenotazioni, servizi scelti e storico appuntamenti;</li>
              <li>dati loyalty, punti, streak, premi e preferenze del programma, se attivo;</li>
              <li>preferenze comunicazioni e consenso marketing;</li>
              <li>dati tecnici come sessione, token OAuth e push subscription, se attivi le notifiche;</li>
              <li>
                dati di navigazione analytics raccolti solo dopo consenso agli analytics opzionali, inclusi
                identificativo anonimo locale, pagine visitate ed eventi di funnel;
              </li>
              <li>
                indicatori interni di frequenza visite e stato churn, se il salone usa la funzione di analisi
                della frequenza.
              </li>
            </ul>
          </Section>

          <Section title="4. Finalità e basi giuridiche">
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Prenotazioni e gestione del servizio</p>
                <p className="text-[13px] text-neutral-500">
                  Per creare, confermare, modificare o annullare appuntamenti e per gestire la relazione di
                  servizio con il salone. Base giuridica: <em>esecuzione del contratto</em>.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Programma loyalty e premi</p>
                <p className="text-[13px] text-neutral-500">
                  Per calcolare punti, streak, livelli e premi del programma loyalty, se attivo e richiesto da
                  te. Base giuridica: <em>esecuzione del rapporto richiesto</em>.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Promemoria e comunicazioni di servizio</p>
                <p className="text-[13px] text-neutral-500">
                  Per inviarti promemoria appuntamento, conferme, spostamenti o altre comunicazioni strettamente
                  legate al servizio. Base giuridica: <em>esecuzione del contratto</em>.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Comunicazioni marketing</p>
                <p className="text-[13px] text-neutral-500">
                  Per offerte e promozioni del salone, solo se hai rilasciato un consenso marketing valido.
                  Base giuridica: <em>consenso</em>.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Analytics di navigazione</p>
                <p className="text-[13px] text-neutral-500">
                  Per misurare l&apos;uso dell&apos;app e migliorarne prestazioni e conversioni, solo dopo il tuo
                  consenso agli analytics opzionali. Base giuridica: <em>consenso</em>.
                </p>
              </div>
            </div>
          </Section>

          <Section title="5. Analytics e collegamento al profilo cliente">
            <p>
              Se accetti gli analytics opzionali, l&apos;app può usare un identificativo anonimo nel browser e
              registrare eventi come pagine visitate, avvio prenotazione, prenotazione completata, login o
              signup.
            </p>
            <p>
              Quando ti identifichi volontariamente tramite accesso o prenotazione, questa sessione anonima può
              essere collegata al tuo profilo cliente per aiutare il salone a capire come viene usata la propria
              app.
            </p>
            <p>
              La tua scelta analytics viene registrata lato server con versione del testo e timestamp. Puoi
              cambiarla in qualsiasi momento dal centro preferenze raggiungibile dai link “Gestisci cookie” e
              dalla Cookie Policy della stessa superficie.
            </p>
          </Section>

          <Section title="6. Analisi della frequenza delle visite (Silent Churn)">
            <p>
              Se il salone utilizza la funzione di analisi della frequenza, il sistema può osservare le date
              delle tue visite per segnalare al barbiere i clienti che potrebbero aver bisogno di un promemoria
              o di un contatto di riattivazione.
            </p>
            <p>
              Questo punteggio è visibile solo al salone, non produce da solo decisioni automatiche su prezzi,
              accesso al servizio o prenotazioni, e viene usato come supporto decisionale umano. Base giuridica:
              <em> legittimo interesse del Titolare</em>.
            </p>
            <p>
              In altre parole, questa funzione non comporta <strong className="text-neutral-900">nessuna decisione automatica</strong>{' '}
              che ti riguardi senza intervento umano del salone.
            </p>
            <p>
              Puoi opporti a questa analisi dalle preferenze dell&apos;app, se disponibile per il tuo account, o
              contattando il Titolare ai recapiti sopra.
            </p>
          </Section>

          <Section title="7. Destinatari, sub-responsabili e trasferimenti extra SEE">
            <p>
              I tuoi dati possono essere trattati dal salone Titolare e, per conto suo, da Styll e dai
              sub-responsabili tecnici necessari al funzionamento del servizio.
            </p>
            <p>
              I sub-responsabili attualmente rilevanti per questa app includono in particolare Supabase
              (database/autenticazione), Vercel (hosting), Resend (email transazionali), Sentry (monitoraggio
              tecnico) e, se gli analytics opzionali sono attivati, PostHog.
            </p>
            <p>
              Alcuni fornitori possono operare anche fuori dallo Spazio Economico Europeo. Quando ciò accade,
              Styll e i relativi provider fanno riferimento ai meccanismi contrattuali o di trasferimento
              applicabili. L&apos;elenco pubblico aggiornato è disponibile nella pagina{' '}
              <Link href="/sub-processor" className="underline text-neutral-700">
                Sub-responsabili
              </Link>
              .
            </p>
          </Section>

          <Section title="8. Per quanto tempo conserviamo i dati">
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Dati account e profilo</p>
                <p className="text-[13px] text-neutral-500">
                  Per il tempo necessario a mantenere attivo il rapporto con il salone e fino a eventuale
                  richiesta di cancellazione, salvo obblighi di legge o necessità di difesa.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Prenotazioni, storico servizi e CRM</p>
                <p className="text-[13px] text-neutral-500">
                  Per la durata del rapporto con il salone; alcuni dati possono essere conservati più a lungo se
                  necessari per obblighi fiscali o contabili del Titolare.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Loyalty, preferenze e premi</p>
                <p className="text-[13px] text-neutral-500">
                  Finché il programma loyalty resta attivo nel rapporto con il salone o fino a tua richiesta,
                  salvo dati che il Titolare debba conservare per obblighi di legge.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Consensi marketing e preferenze comunicazioni</p>
                <p className="text-[13px] text-neutral-500">
                  Fino a revoca del consenso o fino a cessazione del canale di comunicazione, oltre al tempo
                  strettamente necessario per gestire la richiesta e provare la scelta effettuata.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Push subscription</p>
                <p className="text-[13px] text-neutral-500">
                  Fino a revoca delle notifiche push, disinstallazione, invalidazione del token o cancellazione
                  dell&apos;account collegato.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Analytics di navigazione</p>
                <p className="text-[13px] text-neutral-500">
                  Gli eventi analytics grezzi raccolti dopo consenso sono conservati per un periodo tecnico
                  limitato (attualmente fino a 90 giorni); la prova server-side della scelta analytics viene
                  invece mantenuta come evidenza di accountability. Eventuali statistiche aggregate del salone
                  possono essere mantenute più a lungo in forma non personale o aggregata.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="font-semibold text-neutral-800">Stato churn / analisi frequenza</p>
                <p className="text-[13px] text-neutral-500">
                  Il salone mantiene uno stato aggiornato durante il rapporto attivo; se ti opponi alla
                  profilazione, i ricalcoli successivi devono cessare. Non è previsto un archivio storico
                  permanente dei punteggi.
                </p>
              </div>
            </div>
          </Section>

          <Section title="9. I tuoi diritti e come esercitarli">
            <p>
              Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità, opposizione al
              marketing e opposizione alla profilazione nei casi previsti dalla legge.
            </p>
            <p>
              Per esercitare i tuoi diritti, contatta prima di tutto il <strong className="text-neutral-900">Titolare</strong>{' '}
              ai recapiti indicati sopra. Se Styll riceve una richiesta direttamente da te, la inoltrerà al
              Titolare competente per la gestione.
            </p>
            <p>
              Il prodotto oggi non espone un pannello self-service completo per export o cancellazione dei dati:
              queste richieste vengono quindi gestite tramite <strong className="text-neutral-900">workflow assistito</strong>.
            </p>
            <p>
              Alcune preferenze possono però essere gestite in app, se hai un account attivo, come il consenso
              marketing, l&apos;opposizione alla profilazione della frequenza visite e l&apos;attivazione o revoca
              delle notifiche push.
            </p>
          </Section>

          <Section title="10. Reclamo al Garante">
            <p>
              Se ritieni che il trattamento dei tuoi dati violi la normativa applicabile, hai il diritto di
              proporre reclamo al{' '}
              <a
                href="https://www.garanteprivacy.it/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-neutral-700"
              >
                Garante per la protezione dei dati personali
              </a>
              .
            </p>
          </Section>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <p className="text-[12px] text-neutral-400">
              Versione documento: <strong>{DOCUMENT_VERSION}</strong> · Entrata in vigore:{' '}
              <strong>{EFFECTIVE_DATE}</strong>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
