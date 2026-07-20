import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

interface OwnerContactRow {
  profiles: {
    email: string | null
    phone: string | null
  } | {
    email: string | null
    phone: string | null
  }[] | null
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

const LAST_UPDATED = '2026-07-09'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[15px] font-bold text-neutral-900">{title}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-neutral-600">{children}</div>
    </section>
  )
}

function ContactItem({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-neutral-50 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      {href ? (
        <a href={href} className="text-sm font-medium text-neutral-800 underline underline-offset-2">
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium text-neutral-800">{value}</span>
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

export default async function TermsPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const tenantPath = await createTenantPaths(slug)
  const privacyHref = tenantPath('/privacy')
  const contact = await getTenantContact(tenant.tenant_id)
  const hasDirectContact = Boolean(contact.email || contact.phone || contact.address)

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">
        <div className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
              Termini cliente finale
            </p>
            <h1 className="mt-2 text-[24px] font-black tracking-tight text-neutral-950">
              Termini e condizioni per l&apos;uso dell&apos;app di {tenant.business_name}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">
              Questi termini regolano l&apos;uso dell&apos;app clienti del salone{' '}
              <strong className="text-neutral-900">{tenant.business_name}</strong> per consultare servizi,
              prenotare appuntamenti, gestire il proprio profilo e, se disponibile, partecipare a programmi
              loyalty o ricevere comunicazioni.
            </p>
          </div>

          <Section title="1. Chi offre il servizio">
            <p>
              I servizi prenotabili tramite questa app sono offerti direttamente da{' '}
              <strong className="text-neutral-900">{tenant.business_name}</strong> (il &quot;Salone&quot;), che
              gestisce disponibilita`, prezzi, sedi, staff, regole di prenotazione e rapporto con il cliente
              finale.
            </p>
            <p>
              <strong className="text-neutral-900">Styll</strong> fornisce la piattaforma software che rende
              disponibile questa app e le relative funzionalita` tecniche, ma non sostituisce il Salone
              nell&apos;erogazione del servizio prenotato.
            </p>
          </Section>

          <Section title="2. Uso della PWA">
            <p>
              Puoi usare questa app per consultare informazioni del Salone, prenotare servizi, gestire i tuoi
              appuntamenti e aggiornare alcune preferenze del profilo.
            </p>
            <p>
              Ti chiediamo di inserire dati corretti e aggiornati e di non usare l&apos;app per richieste false,
              abusive o contrarie alla legge.
            </p>
          </Section>

          <Section title="3. Prenotazioni">
            <p>
              Quando invii una prenotazione, i dettagli mostrati in app — come servizio, orario, durata,
              prezzo, sede o professionista selezionato — rappresentano l&apos;offerta del Salone disponibile in
              quel momento.
            </p>
            <p>
              Il Salone puo` confermare, spostare o annullare una prenotazione se necessario per esigenze
              organizzative, indisponibilita` o cause di forza maggiore, informandoti tramite i canali di
              contatto che hai fornito.
            </p>
          </Section>

          <Section title="4. Cancellazioni e no-show">
            <p>
              Se il Salone applica regole di cancellazione, ritardo o no-show, queste vengono mostrate in app o
              comunicate prima della prenotazione e si applicano al servizio prenotato.
            </p>
            <p>
              Se non trovi indicazioni specifiche, ti invitiamo a contattare direttamente il Salone appena
              possibile in caso di modifica o impossibilita` a presentarti.
            </p>
          </Section>

          <Section title="5. Loyalty, punti e premi">
            <p>
              Se il Salone attiva un programma loyalty, punti, premi, livelli e condizioni di utilizzo valgono
              secondo quanto mostrato nell&apos;app al momento della consultazione o del riscatto.
            </p>
            <p>
              La disponibilita` di premi, soglie e benefici puo` variare nel tempo in base alle scelte del
              Salone. Le eventuali promozioni loyalty non trasformano Styll nel fornitore del servizio o del
              premio.
            </p>
          </Section>

          <Section title="6. Notifiche e comunicazioni">
            <p>
              Per gestire il servizio, il Salone puo` inviarti comunicazioni di servizio relative a prenotazioni,
              promemoria, modifiche appuntamento, accesso all&apos;app o riscatti loyalty tramite email, push o
              altri canali che hai attivato.
            </p>
            <p>
              Eventuali comunicazioni promozionali del Salone vengono inviate solo nei limiti consentiti e,
              quando richiesto, sulla base delle preferenze o dei consensi che hai espresso.
            </p>
          </Section>

          <Section title="7. Privacy e dati personali">
            <p>
              Il trattamento dei tuoi dati personali avviene secondo la privacy policy del Salone, disponibile
              qui:{' '}
              <Link href={privacyHref} className="font-medium text-neutral-800 underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              In quel contesto il Salone resta il soggetto che offre il servizio al cliente finale, mentre Styll
              opera come piattaforma tecnica per conto del Salone.
            </p>
          </Section>

          <Section title="8. Limitazioni di responsabilita`">
            <p>
              La qualita`, esecuzione e disponibilita` del servizio prenotato dipendono dal Salone che lo offre.
              Styll non e` il fornitore del taglio, trattamento o prestazione prenotata e non decide
              autonomamente prezzi, disponibilita` o politiche commerciali del Salone.
            </p>
            <p>
              Nei limiti consentiti dalla legge, Styll risponde solo del corretto funzionamento della
              piattaforma software e non di disservizi imputabili direttamente al Salone, a dati forniti in modo
              errato dal cliente o a interruzioni causate da provider terzi o forza maggiore.
            </p>
          </Section>

          <Section title="9. Contatti del salone">
            <div className="mt-2 grid gap-2">
              <ContactItem label="Salone" value={tenant.business_name} />
              <ContactItem label="Slug app" value={tenant.slug} />
              {contact.locationName ? <ContactItem label="Sede" value={contact.locationName} /> : null}
              {contact.email ? (
                <ContactItem label="Email" value={contact.email} href={`mailto:${contact.email}`} />
              ) : null}
              {contact.phone ? (
                <ContactItem label="Telefono" value={contact.phone} href={`tel:${contact.phone}`} />
              ) : null}
              {contact.address ? <ContactItem label="Indirizzo" value={contact.address} /> : null}
            </div>
            {!hasDirectContact ? (
              <p>
                Se hai bisogno dei recapiti diretti del Salone, puoi richiederli durante la prenotazione o
                direttamente in sede.
              </p>
            ) : null}
          </Section>

          <div className="mt-6 border-t border-neutral-100 pt-4">
            <p className="text-[12px] text-neutral-400">
              Versione documento: <strong>1.0</strong> · Ultimo aggiornamento:{' '}
              <strong>{LAST_UPDATED}</strong>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
