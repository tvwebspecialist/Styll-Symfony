import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'
import type { LandingTenant, LandingLocation } from '@/types/landing'

interface Props {
  tenant: LandingTenant
  locations: LandingLocation[]
}

export default function LandingFooter({ tenant, locations }: Props) {
  const firstLocation = locations[0] ?? null
  const address = [firstLocation?.address, firstLocation?.city].filter(Boolean).join(', ')
  const mapsUrl =
    firstLocation?.latitude != null && firstLocation?.longitude != null
      ? `https://maps.google.com/?q=${firstLocation.latitude},${firstLocation.longitude}`
      : null
  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota`
  const { instagram, facebook, tiktok, whatsapp } = tenant.social_links

  // Use tenant-level contact info if set, fall back to first location
  const contactPhone = tenant.contact_phone || firstLocation?.phone || null
  const contactEmail = tenant.contact_email || firstLocation?.email || null

  return (
    <footer aria-label="Footer" className="w-full" style={{ background: '#0D0D0D' }}>
      <div className="w-full max-w-[1120px] mx-auto px-5 pt-16 pb-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/8">

          {/* Brand column */}
          <div>
            {tenant.logo_url && (
              <div className="mb-4">
                <Image
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  width={48}
                  height={48}
                  className="rounded-xl object-cover"
                />
              </div>
            )}
            <p className="font-black text-white mb-2 text-sm">{tenant.business_name}</p>
            {tenant.description && (
              <p
                className="text-[#666] text-xs leading-relaxed mb-5 overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                } as React.CSSProperties}
              >
                {tenant.description}
              </p>
            )}

            {/* Social icons */}
            {(instagram || facebook || tiktok || whatsapp) && (
              <div className="flex items-center gap-3 mb-5">
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#555] hover:text-white transition-colors no-underline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#555] hover:text-white transition-colors no-underline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                    </svg>
                  </a>
                )}
                {tiktok && (
                  <a href={tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-[#555] hover:text-white transition-colors no-underline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.35a8.17 8.17 0 004.78 1.52V6.44a4.85 4.85 0 01-1.01-.25z" />
                    </svg>
                  </a>
                )}
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-[#555] hover:text-white transition-colors no-underline">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#444] hover:text-[#666] transition-colors text-[11px] no-underline"
            >
              Powered by Styll ↗
            </a>
          </div>

          {/* Contatti */}
          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-[#555] mb-5">Contatti</p>
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {address && (
                <li className="flex items-start gap-2.5">
                  <MapPin size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
                  <span className="text-[#888] text-sm">{address}</span>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={`tel:${contactPhone}`} className="flex items-center gap-2.5 text-sm text-[#888] hover:text-white transition-colors no-underline">
                    <Phone size={13} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    {contactPhone}
                  </a>
                </li>
              )}
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="flex items-center gap-2.5 text-sm text-[#888] hover:text-white transition-colors no-underline">
                    <Mail size={13} className="shrink-0" style={{ color: 'var(--brand-primary)' }} />
                    {contactEmail}
                  </a>
                </li>
              )}
              {mapsUrl && (
                <li>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#555] hover:text-white transition-colors no-underline">
                    Vedi su Google Maps ↗
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Esplora */}
          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-[#555] mb-5">Esplora</p>
            <ul className="flex flex-col gap-3 list-none p-0 m-0">
              {[
                { label: 'Chi siamo', href: '#chi-siamo' },
                { label: 'Sedi', href: '#sedi' },
                { label: 'Servizi', href: '#servizi' },
                { label: 'Team', href: '#team' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-sm text-[#888] hover:text-white transition-colors no-underline block">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div>
            <p className="font-semibold uppercase tracking-wider text-[11px] text-[#555] mb-5">Inizia ora</p>
            <div className="flex flex-col gap-3">
              <Link
                href={bookingUrl}
                className="inline-flex items-center justify-center gap-2 font-bold text-sm no-underline text-white rounded-full hover:opacity-90 transition-opacity"
                style={{ background: 'var(--brand-primary)', padding: '12px 20px' }}
              >
                Prenota ora
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href={`/tenant/app/${tenant.slug}`}
                className="inline-flex items-center justify-center font-medium text-sm no-underline text-[#888] hover:text-white transition-colors rounded-full border border-white/10 hover:border-white/20"
                style={{ padding: '12px 20px' }}
              >
                Accedi all&apos;app
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-6">
          <p className="text-[#444] text-xs">© {new Date().getFullYear()} {tenant.business_name}. Tutti i diritti riservati.</p>
          <div className="flex gap-5">
            <Link href="#" className="text-xs text-[#444] hover:text-[#666] transition-colors no-underline">Privacy Policy</Link>
            <Link href="#" className="text-xs text-[#444] hover:text-[#666] transition-colors no-underline">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
