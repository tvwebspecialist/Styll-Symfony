import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Calendar, CalendarPlus, MapPin, Scissors, ShoppingBag, User } from 'lucide-react'
import { getAppointmentSummary, getLoyaltyConfig } from '@/lib/actions/public-booking'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { PostBookingProducts } from './_components/PostBookingProducts'
import type { SuggestedProduct } from './_components/PostBookingProducts'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function readParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
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

  if (!appointmentId) redirect(tp(''))

  const tenantPromise = getTenantBySlug(slug)
  const appointmentPromise = tenantPromise.then((tenant) =>
    tenant ? getAppointmentSummary(appointmentId, tenant.tenant_id) : Promise.resolve(null),
  )
  const loyaltyPromise = tenantPromise.then((tenant) =>
    tenant ? getLoyaltyConfig(tenant.tenant_id) : Promise.resolve(null),
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

  if (!tenant || tenant.status !== 'active' || !appointment) notFound()

  // Fetch post-booking product suggestions (products not yet in this appointment)
  let suggestedProducts: SuggestedProduct[] = []
  if (user) {
    const db = createAdminClient()
    const existingProductIds = appointment.products.map((p) => p.id)
    const { data: rawProducts } = await db
      .from('products')
      .select('id, name, brand, photo_url, price_sell, display_order')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .not('id', 'in', existingProductIds.length > 0 ? `(${existingProductIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
      .order('display_order', { ascending: true })
      .limit(3)

    if (rawProducts && rawProducts.length > 0) {
      const productIds = rawProducts.map((p: { id: string }) => p.id)
      const { data: inventory } = await db
        .from('product_inventory')
        .select('product_id, quantity')
        .eq('tenant_id', tenant.tenant_id)
        .in('product_id', productIds)
      const invMap = new Map<string, number>()
      for (const row of (inventory ?? []) as Array<{ product_id: string; quantity: number }>) {
        invMap.set(row.product_id, (invMap.get(row.product_id) ?? 0) + row.quantity)
      }
      suggestedProducts = (
        rawProducts as Array<{
          id: string
          name: string
          brand: string | null
          photo_url: string | null
          price_sell: number
        }>
      )
        .filter((p) => (invMap.get(p.id) ?? 0) > 0)
        .slice(0, 3)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          photo_url: p.photo_url,
          price_sell: Number(p.price_sell ?? 0),
        }))
    }
  }

  const brandColor = tenant.primary_color ?? '#1a1a1a'
  // Pulse ring colour: hex + 20 = ~12% opacity — same technique as BookingSuccessModal
  const pulseColor = `${brandColor}20`

  const totalPrice =
    appointment.services.reduce((sum, s) => sum + s.price_at_booking, 0) +
    appointment.products.reduce((sum, p) => sum + p.price_at_sale * p.quantity, 0)
  const calendarLink = buildGCalLink(
    `Prenotazione da ${tenant.business_name}`,
    appointment.start_time,
    appointment.end_time,
    [appointment.location_name, appointment.location_address, appointment.location_city]
      .filter(Boolean)
      .join(', '),
  )

  const loyaltyPoints = loyaltyConfig?.points_per_visit ?? 0
  const loyaltyPerEuro = loyaltyConfig?.points_per_euro ?? 0

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      {/* fadeSlideUp is defined in globals.css — no JS needed */}
      <div
        className="flex flex-col gap-5 pb-10"
        style={{ animation: 'fadeSlideUp 0.45s ease both' }}
      >

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 text-center pt-2">
          {/* Pulse rings behind icon — dedicated child elements, no will-change on
              fixed context, automatically suppressed by prefers-reduced-motion */}
          <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: pulseColor, animation: 'pulse-ring 2.4s ease-out infinite' }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: pulseColor, animation: 'pulse-ring 2.4s ease-out 0.8s infinite' }}
              aria-hidden="true"
            />
            <Image
              src="/img/ceck.png"
              alt="Prenotazione confermata"
              width={110}
              height={110}
              className="relative z-10 object-contain"
              priority
            />
          </div>

          <div className="space-y-1.5">
            <h1
              className="text-[26px] font-bold tracking-tight text-gray-900"
              style={{ fontFamily: 'var(--font-tenant, inherit)' }}
            >
              Prenotazione confermata!
            </h1>
            <p className="text-[14px] text-gray-500">
              Ti aspettiamo da{' '}
              <span className="font-medium text-gray-700">{tenant.business_name}</span>.
            </p>
          </div>
        </div>

        {/* ── LOYALTY TEASER ──────────────────────────────────────────── */}
        {loyaltyConfig && loyaltyPoints > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{
              background: `${brandColor}10`,
              border: `1.5px solid ${brandColor}25`,
            }}
          >
            <span className="text-xl shrink-0" aria-hidden="true">🎉</span>
            <p className="text-[13px] text-gray-700 leading-snug">
              Con questa visita guadagni{' '}
              <span className="font-bold text-gray-900">{loyaltyPoints} punti fedeltà</span>
              {loyaltyPerEuro > 0 && (
                <> + <span className="font-semibold">{loyaltyPerEuro} punti</span> per ogni euro speso</>
              )}
              .
            </p>
          </div>
        )}

        {/* ── RIEPILOGO ───────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
        >
          {/* Brand accent strip */}
          <div className="h-1 w-full" style={{ backgroundColor: brandColor }} />

          {/* Quando */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Quando
              </p>
            </div>
            <p className="text-[15px] font-semibold text-gray-900 capitalize">
              {formatDateTime(appointment.start_time)}
            </p>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Barbiere */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <User className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Barbiere
              </p>
            </div>
            <p className="text-[15px] font-medium text-gray-900">
              {appointment.staff_name ?? 'Staff'}
            </p>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Sede */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Sede
              </p>
            </div>
            <p className="text-[15px] font-medium text-gray-900">
              {appointment.location_name ?? tenant.business_name}
            </p>
            {(appointment.location_address || appointment.location_city) && (
              <p className="text-[13px] text-gray-400 mt-0.5">
                {[appointment.location_address, appointment.location_city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Servizi */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Scissors className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Servizi
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {appointment.services.map((service) => (
                <div key={service.id} className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-gray-900">{service.name}</p>
                  <p className="text-[15px] font-semibold text-gray-900">
                    {formatCurrency(service.price_at_booking)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Prodotti — solo se presenti */}
          {appointment.products.length > 0 && (
            <>
              <div className="h-px bg-gray-100 mx-5" />
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <ShoppingBag className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                    Prodotti
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {appointment.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-gray-900 leading-snug">
                          {product.quantity > 1 ? `${product.quantity}× ` : ''}{product.name}
                        </p>
                        {product.brand && (
                          <p className="text-[12px] text-gray-400 mt-0.5">{product.brand}</p>
                        )}
                      </div>
                      <p className="text-[15px] font-semibold text-gray-900 shrink-0">
                        {formatCurrency(product.price_at_sale * product.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Totale */}
          <div
            className="flex items-center justify-between px-5 py-5"
            style={{ borderTop: `2px solid ${brandColor}20` }}
          >
            <p className="text-[16px] font-bold text-gray-900">Totale</p>
            <p className="text-[28px] font-black" style={{ color: brandColor }}>
              {formatCurrency(totalPrice)}
            </p>
          </div>
        </div>

        {/* ── PRODOTTI SUGGERITI (solo utenti loggati, prodotti disponibili) ── */}
        {suggestedProducts.length > 0 && (
          <PostBookingProducts
            appointmentId={appointmentId}
            tenantId={tenant.tenant_id}
            products={suggestedProducts}
            brandColor={brandColor}
            isLoggedIn={!!user}
          />
        )}

        {/* ── CREA ACCOUNT (guest only) ────────────────────────────────── */}
        {!user && (
          <div
            className="rounded-2xl px-5 py-5 flex flex-col gap-4"
            style={{
              background: `${brandColor}08`,
              border: `1.5px solid ${brandColor}20`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none shrink-0" aria-hidden="true">💎</span>
              <div>
                <h2 className="text-[16px] font-extrabold text-gray-900">
                  Crea il tuo account gratis
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                  Inizia ad accumulare punti fedeltà con ogni visita.
                </p>
              </div>
            </div>
            <Link
              href={tp(`/accesso?mode=register&return_to=/prenota/successo?appointment=${appointmentId}`)}
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 py-3 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: brandColor }}
            >
              Crea account gratis
            </Link>
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <a
            href={calendarLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold text-white transition-opacity active:opacity-80"
            style={{ backgroundColor: brandColor }}
          >
            <CalendarPlus className="w-4 h-4" />
            Aggiungi al calendario
          </a>
          <Link
            href={tp('')}
            className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            Torna alla home
          </Link>
        </div>

      </div>
    </main>
  )
}
