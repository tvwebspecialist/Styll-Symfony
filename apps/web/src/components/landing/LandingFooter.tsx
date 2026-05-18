import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Map } from 'lucide-react'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  firstLocation: PublicLocation | null
  slug: string
}

export default function LandingFooter({ tenant, firstLocation, slug }: Props) {
  const bio = (tenant.settings?.bio as string | undefined) ?? null
  const mapsUrl =
    firstLocation?.latitude && firstLocation?.longitude
      ? `https://maps.google.com/?q=${firstLocation.latitude},${firstLocation.longitude}`
      : null
  const address = [firstLocation?.address, firstLocation?.city].filter(Boolean).join(', ')

  return (
    <footer
      aria-label="Footer"
      className="border-t"
      style={{
        background: '#050505',
        borderColor: 'var(--landing-border)',
      }}
    >
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand */}
          <div>
            {tenant.logo_url ? (
              <div className="mb-4">
                <Image
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  width={48}
                  height={48}
                  className="rounded-xl object-cover"
                />
              </div>
            ) : null}
            <p
              className="mb-2 text-base font-bold"
              style={{ color: 'var(--landing-text-primary)' }}
            >
              {tenant.business_name}
            </p>
            {bio && (
              <p
                className="mb-4 line-clamp-1 text-sm"
                style={{ color: 'var(--landing-text-muted)' }}
              >
                {bio}
              </p>
            )}
            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] transition-opacity hover:opacity-80"
              style={{ color: 'var(--landing-text-dim)' }}
            >
              Powered by Styll
            </a>
          </div>

          {/* Contatti */}
          <div>
            <p
              className="mb-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--landing-text-dim)' }}
            >
              Contatti
            </p>
            <ul className="space-y-3">
              {address && (
                <li className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--landing-text-muted)' }}>
                  <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  {address}
                </li>
              )}
              {firstLocation?.phone && (
                <li>
                  <a
                    href={`tel:${firstLocation.phone}`}
                    className="flex items-center gap-2.5 text-sm transition-opacity hover:opacity-80"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    <Phone size={14} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    {firstLocation.phone}
                  </a>
                </li>
              )}
              {firstLocation?.email && (
                <li>
                  <a
                    href={`mailto:${firstLocation.email}`}
                    className="flex items-center gap-2.5 text-sm transition-opacity hover:opacity-80"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    <Mail size={14} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    {firstLocation.email}
                  </a>
                </li>
              )}
              {mapsUrl && (
                <li>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm transition-opacity hover:opacity-80"
                    style={{ color: 'var(--landing-text-muted)' }}
                  >
                    <Map size={14} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    Vedi su Google Maps
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Azione */}
          <div>
            <p
              className="mb-5 text-[0.75rem] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--landing-text-dim)' }}
            >
              Inizia ora
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/tenant/app/${slug}/prenota`}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-primary)' }}
              >
                Prenota ora
              </Link>
              <Link
                href={`/tenant/app/${slug}`}
                className="inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  borderColor: 'var(--landing-border)',
                  color: 'var(--landing-text-muted)',
                }}
              >
                Accedi all'app
              </Link>
            </div>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--landing-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--landing-text-dim)' }}>
            © 2025 {tenant.business_name}. Tutti i diritti riservati.
          </p>
          <div className="flex gap-4">
            <Link
              href="#"
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--landing-text-dim)' }}
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--landing-text-dim)' }}
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
