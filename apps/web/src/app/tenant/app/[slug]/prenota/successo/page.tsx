import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAppointmentSummary, getLoyaltyConfig } from '@/lib/actions/public-booking'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildGCalLink(title: string, startISO: string, endISO: string, location: string) {
  const formatForGoogle = (value: string) =>
    value.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatForGoogle(startISO)}/${formatForGoogle(endISO)}`,
    location,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default async function SuccessoPage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const appointmentId = readParam(resolvedSearchParams.appointment)
  const tp = await createTenantPaths(slug)

  if (!appointmentId) {
    redirect(tp(''))
  }

  const tenantPromise = getTenantBySlug(slug)
  const appointmentPromise = getAppointmentSummary(appointmentId)
  const loyaltyPromise = tenantPromise.then((tenant) =>
    tenant ? getLoyaltyConfig(tenant.tenant_id) : Promise.resolve(null)
  )

  const [tenant, appointment, loyaltyConfig] = await Promise.all([
    tenantPromise,
    appointmentPromise,
    loyaltyPromise,
  ])
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!tenant || tenant.status !== 'active' || !appointment) {
    notFound()
  }

  const totalPrice = appointment.services.reduce(
    (sum, service) => sum + service.price_at_booking,
    0
  )
  const calendarLink = buildGCalLink(
    `Prenotazione da ${tenant.business_name}`,
    appointment.start_time,
    appointment.end_time,
    [appointment.location_name, appointment.location_address, appointment.location_city]
      .filter(Boolean)
      .join(', ')
  )

  return (
    <main className="mx-auto max-w-2xl px-4 py-2">
      <div className="space-y-6 pb-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-[var(--brand-primary)] text-3xl font-semibold text-white">
          ✓
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Prenotazione confermata!</h1>
          <p className="text-sm text-muted-foreground">
            Ti aspettiamo da {tenant.business_name}. Ecco il riepilogo del tuo appuntamento.
          </p>
        </div>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Riepilogo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/50 px-4 py-4">
              <p className="text-sm text-muted-foreground">Quando</p>
              <p className="font-semibold">{formatDateTime(appointment.start_time)}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-4">
              <p className="text-sm text-muted-foreground">Barbiere</p>
              <p className="font-semibold">{appointment.staff_name ?? 'Staff Styll'}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-4 sm:col-span-2">
              <p className="text-sm text-muted-foreground">Sede</p>
              <p className="font-semibold">{appointment.location_name ?? tenant.business_name}</p>
              <p className="text-sm text-muted-foreground">
                {[appointment.location_address, appointment.location_city].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {appointment.services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                <span className="font-medium">{service.name}</span>
                <span className="text-sm font-semibold">{formatCurrency(service.price_at_booking)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[var(--brand-primary)]/5 px-4 py-4">
            <span className="font-medium">Totale</span>
            <span className="text-lg font-semibold">{formatCurrency(totalPrice)}</span>
          </div>
        </CardContent>
      </Card>

      {loyaltyConfig ? (
        <Card className="rounded-3xl border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
          <CardHeader>
            <CardTitle>Un passo più vicino ai premi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Con questa visita potrai accumulare {loyaltyConfig.points_per_visit ?? 0} punti e continuare a guadagnare {loyaltyConfig.points_per_euro ?? 0} punti per ogni euro speso.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!user ? (
        <Card className="rounded-3xl border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5">
          <CardContent className="flex flex-col gap-4 py-6">
            <div className="flex gap-3">
              <span className="text-3xl leading-none">💎</span>
              <div>
                <h2 className="text-lg font-extrabold text-neutral-950">Crea il tuo account gratis</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Inizia ad accumulare punti fedeltà con ogni visita.
                </p>
              </div>
            </div>
            <Link
              href={tp(`/accesso?mode=register&return_to=/prenota/successo?appointment=${appointmentId}`)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Crea account gratis
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={tp('')}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Torna alla home
        </Link>
        <a
          href={calendarLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Aggiungi al calendario
        </a>
      </div>
      </div>
    </main>
  )
}
