import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

async function getOwnerEmail(tenantId: string): Promise<string | null> {
  const db = createAdminClient()
  const { data } = await db
    .from('staff_members')
    .select('profile_id, profiles!inner(email)')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const profiles = data.profiles as { email: string | null } | null
  return profiles?.email ?? null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-bold text-neutral-900 mb-2">{title}</h2>
      <div className="text-[14px] text-neutral-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-neutral-100 text-neutral-700 text-[12px] font-medium rounded-md px-2 py-0.5 mr-1">
      {children}
    </span>
  )
}

const LAST_UPDATED = '2026-07-03'

export default async function PrivacyPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const ownerEmail = await getOwnerEmail(tenant.tenant_id)

  const contactEmail = ownerEmail ?? 'privacy@styll.it'

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">

        <div className="rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-neutral-100 p-5">

          {/* Intro */}
          <p className="text-[14px] text-neutral-500 mb-6 leading-relaxed">
            Questa informativa spiega come <strong className="text-neutral-900">{tenant.business_name}</strong> tratta
            i tuoi dati personali quando usi questa app. Leggi con calma — abbiamo cercato di renderla
            il più chiara possibile.
          </p>

          {/* 1. Titolare */}
          <Section title="1. Chi è il Titolare del trattamento">
            <p>
              Il Titolare è il barbiere o salone che hai scelto:
            </p>
            <div className="mt-2 p-3 bg-neutral-50 rounded-xl">
              <p className="font-semibold text-neutral-900">{tenant.business_name}</p>
              <p className="text-neutral-500 text-[13px] mt-0.5">
                Email:{' '}
                <a href={`mailto:${contactEmail}`} className="underline text-neutral-700">
                  {contactEmail}
                </a>
              </p>
            </div>
          </Section>

          {/* 2. Responsabile */}
          <Section title="2. Chi è il Responsabile del trattamento">
            <p>
              Styll srl è il Responsabile del trattamento: gestiamo la piattaforma tecnica
              per conto del tuo barbiere, ma non usiamo i tuoi dati per scopi propri.
            </p>
            <p>
              Contatto:{' '}
              <a href="mailto:privacy@styll.it" className="underline text-neutral-700">
                privacy@styll.it
              </a>
            </p>
          </Section>

          {/* 3. Dati raccolti */}
          <Section title="3. Quali dati raccogliamo">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-neutral-800 mb-1">Dati di contatto</p>
                <div><Tag>Nome</Tag><Tag>Telefono</Tag><Tag>Email</Tag></div>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">Storico servizi</p>
                <div><Tag>Appuntamenti</Tag><Tag>Servizi prenotati</Tag></div>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">Programma fedeltà</p>
                <div><Tag>Punti</Tag><Tag>Badge</Tag><Tag>Livello</Tag></div>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">Preferenze</p>
                <div><Tag>Canale di contatto preferito</Tag><Tag>Consenso marketing</Tag></div>
              </div>
              <div>
                <p className="font-medium text-neutral-800 mb-1">Dati tecnici</p>
                <div><Tag>Cookie di sessione</Tag><Tag>Token OAuth</Tag><Tag>Push subscription</Tag></div>
              </div>
            </div>
          </Section>

          {/* 4. Finalità */}
          <Section title="4. Perché li usiamo">
            <div className="space-y-3">
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="font-semibold text-neutral-800">Gestione prenotazioni</p>
                <p className="text-neutral-500 text-[13px] mt-0.5">
                  Per confermarti gli appuntamenti e mandarti promemoria.
                  Base giuridica: <em>esecuzione del contratto</em>.
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="font-semibold text-neutral-800">Programma fedeltà</p>
                <p className="text-neutral-500 text-[13px] mt-0.5">
                  Per calcolare i tuoi punti e sbloccare premi.
                  Base giuridica: <em>esecuzione del contratto</em>.
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="font-semibold text-neutral-800">Analisi della frequenza delle visite</p>
                <p className="text-neutral-500 text-[13px] mt-0.5">
                  Il tuo barbiere riceve suggerimenti su quando ricontattarti (es. "Marco non viene da 40 giorni").
                  Base giuridica: <em>legittimo interesse</em>.{' '}
                  Puoi opporti in qualsiasi momento da <strong>Preferenze → Profilazione</strong>.
                </p>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl">
                <p className="font-semibold text-neutral-800">Comunicazioni marketing</p>
                <p className="text-neutral-500 text-[13px] mt-0.5">
                  Offerte e promozioni del barbiere — solo se hai dato il consenso.
                  Base giuridica: <em>consenso esplicito</em>.
                  Puoi revocarlo quando vuoi da <strong>Preferenze</strong>.
                </p>
              </div>
            </div>
          </Section>

          {/* 5. Condivisione */}
          <Section title="5. Con chi condividiamo i tuoi dati">
            <div className="space-y-2">
              {[
                { name: 'Styll', note: 'Piattaforma tecnica, UE' },
                { name: 'Supabase', note: 'Database e autenticazione — server in Irlanda (UE)' },
                { name: 'Vercel', note: 'Hosting — server in UE con accordi DPA' },
                { name: 'Resend', note: 'Invio email transazionali' },
                { name: 'Sentry', note: 'Error tracking anonimizzato' },
              ].map(({ name, note }) => (
                <div key={name} className="flex items-start gap-2">
                  <span className="text-neutral-400 mt-0.5">·</span>
                  <span>
                    <strong className="text-neutral-800">{name}</strong>
                    <span className="text-neutral-500"> — {note}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-neutral-500">
              Non vendiamo i tuoi dati a terzi. Mai.
            </p>
          </Section>

          {/* 6. Diritti */}
          <Section title="6. I tuoi diritti">
            <div className="space-y-3">
              {[
                { right: 'Accesso', how: 'Profilo → Impostazioni → Esporta i miei dati (JSON)' },
                { right: 'Rettifica', how: 'Profilo → Modifica profilo' },
                { right: 'Cancellazione', how: 'Profilo → Impostazioni → Cancella account' },
                { right: 'Opposizione alla profilazione', how: 'Profilo → Preferenze → Profilazione' },
                { right: 'Portabilità', how: 'Stessa funzione dell\'esportazione JSON' },
              ].map(({ right, how }) => (
                <div key={right} className="p-3 bg-neutral-50 rounded-xl">
                  <p className="font-semibold text-neutral-800">{right}</p>
                  <p className="text-neutral-500 text-[13px] mt-0.5">{how}</p>
                </div>
              ))}
            </div>
            <p className="mt-3">
              Per qualsiasi richiesta:{' '}
              <a href="mailto:privacy@styll.it" className="underline text-neutral-700">
                privacy@styll.it
              </a>
            </p>
          </Section>

          {/* 7. Cookie */}
          <Section title="7. Cookie">
            <p>
              Usiamo solo cookie tecnici necessari al funzionamento dell&apos;app: cookie di sessione
              Supabase e token OAuth PKCE. Non richiedono consenso (Art. 122 Codice Privacy).
            </p>
            <p>Nessun cookie di profilazione o tracciamento.</p>
          </Section>

          {/* 8. Data */}
          <div className="mt-6 pt-4 border-t border-neutral-100">
            <p className="text-[12px] text-neutral-400">
              Ultimo aggiornamento: <strong>{LAST_UPDATED}</strong>
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}
