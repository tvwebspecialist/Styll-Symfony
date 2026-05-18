import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getActivePromotions,
  getPublicLocations,
  getPublicServices,
  type PublicService,
} from '@/lib/actions/public-booking'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function getInitial(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

function groupServicesByCategory(services: PublicService[]): Array<{ category: string; services: PublicService[] }> {
  const groups = new Map<string, PublicService[]>()

  for (const service of services) {
    const category = service.category?.trim() || 'Servizi principali'
    const current = groups.get(category) ?? []
    current.push(service)
    groups.set(category, current)
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    services: items.sort((left, right) => left.display_order - right.display_order),
  }))
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params
  const tenantPromise = getTenantBySlug(slug)
  const servicesPromise = tenantPromise.then((tenant) =>
    tenant ? getPublicServices(tenant.tenant_id) : Promise.resolve([])
  )
  const promotionsPromise = tenantPromise.then((tenant) =>
    tenant ? getActivePromotions(tenant.tenant_id, 'landing') : Promise.resolve([])
  )
  const locationsPromise = tenantPromise.then((tenant) =>
    tenant ? getPublicLocations(tenant.tenant_id) : Promise.resolve([])
  )

  const [tenant, services, promotions, locations] = await Promise.all([
    tenantPromise,
    servicesPromise,
    promotionsPromise,
    locationsPromise,
  ])

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const firstLocation = locations[0] ?? null
  const groupedServices = groupServicesByCategory(services)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 py-6 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex items-center gap-3">
            <Badge className="bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]">
              La tua app
            </Badge>
            {firstLocation?.city ? <span className="text-sm text-muted-foreground">{firstLocation.city}</span> : null}
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={`Logo di ${tenant.business_name}`}
                  className="size-20 rounded-3xl object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-3xl bg-[var(--brand-primary)] text-3xl font-semibold text-white">
                  {getInitial(tenant.business_name)}
                </div>
              )}
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tenant.business_name}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Prenota in pochi tap, scopri i servizi disponibili e tieni sempre a portata di mano la web app del tuo barbiere.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/tenant/app/${slug}`}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Apri l&apos;app
              </Link>
              <a
                href="#installa"
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)]/10"
              >
                Come installare
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Servizi</h2>
          <p className="text-sm text-muted-foreground">Scegli il trattamento giusto per te e verifica durata e prezzo prima di prenotare.</p>
        </div>

        <div className="space-y-8">
          {groupedServices.map((group) => (
            <div key={group.category} className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--brand-primary)]">{group.category}</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.services.map((service) => (
                  <Card key={service.id} className="rounded-2xl">
                    <CardHeader>
                      <CardTitle>{service.name}</CardTitle>
                      <CardDescription>{service.description || 'Servizio disponibile su prenotazione.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-4">
                      <span className="rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--brand-primary)]">
                        {service.duration_minutes} min
                      </span>
                      <span className="text-base font-semibold">{formatCurrency(service.price)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {promotions.length > 0 ? (
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Promozioni</h2>
            <p className="text-sm text-muted-foreground">Offerte attive pensate per farti risparmiare sui prossimi appuntamenti.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {promotions.map((promotion) => (
              <Card key={promotion.id} className="rounded-2xl border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
                <CardHeader>
                  <CardTitle>{promotion.title}</CardTitle>
                  <CardDescription>{promotion.description || 'Promozione attiva in app.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {promotion.valid_until ? (
                    <p className="text-sm text-muted-foreground">Valida fino al {formatDate(promotion.valid_until)}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Disponibile fino a esaurimento.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section id="installa" className="space-y-6 scroll-mt-24">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Come installare</h2>
          <p className="text-sm text-muted-foreground">Aggiungi la web app alla schermata Home per aprirla come una vera app.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>iPhone e iPad</CardTitle>
              <CardDescription>Installazione da Safari in meno di un minuto.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. Apri questa pagina con Safari.</li>
                <li>2. Tocca il pulsante Condividi in basso.</li>
                <li>3. Seleziona “Aggiungi alla schermata Home”.</li>
                <li>4. Conferma per trovare l&apos;app tra le tue icone.</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Android</CardTitle>
              <CardDescription>Funziona con Chrome e i browser compatibili.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. Apri questa pagina con Chrome.</li>
                <li>2. Tocca il menu in alto a destra.</li>
                <li>3. Premi “Installa app” oppure “Aggiungi a schermata Home”.</li>
                <li>4. Conferma e apri l&apos;app dalla Home del telefono.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="rounded-3xl border border-border bg-card px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">{tenant.business_name}</p>
            {firstLocation?.address || firstLocation?.city ? (
              <p>{[firstLocation?.address, firstLocation?.city].filter(Boolean).join(', ')}</p>
            ) : (
              <p>Prenotazioni online disponibili direttamente dalla web app.</p>
            )}
            {firstLocation?.phone ? <p>Telefono: {firstLocation.phone}</p> : null}
          </div>
          <p className="text-sm text-muted-foreground">Powered by Styll</p>
        </div>
      </footer>
    </main>
  )
}
