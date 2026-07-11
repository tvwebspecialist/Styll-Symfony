import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { LandingTenant, LandingLocation } from '@/types/landing'
import { appendAnalyticsPreferencesHash } from '@/lib/analytics-consent-copy'

// ── Social icon SVGs ──────────────────────────────────────────────────────────

function InstagramSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function TiktokSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.35a8.17 8.17 0 004.78 1.52V6.44a4.85 4.85 0 01-1.01-.25z" />
    </svg>
  )
}

function WhatsAppSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  cookiePath: string
  tenant: LandingTenant
  locations: LandingLocation[]
}

export default function LandingFooter({ cookiePath, tenant, locations }: Props) {
  const firstLocation = locations[0] ?? null
  const contactPhone = tenant.contact_phone || firstLocation?.phone || null
  const contactEmail = tenant.contact_email || firstLocation?.email || null
  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota?source=booking`
  const { instagram, facebook, tiktok, whatsapp } = tenant.social_links
  const analyticsPreferencesHref = appendAnalyticsPreferencesHash(cookiePath)

  const socialLinks: Array<{ href: string; label: string; icon: ReactNode }> = [
    ...(instagram ? [{ href: instagram, label: 'Instagram', icon: <InstagramSVG /> }] : []),
    ...(facebook ? [{ href: facebook, label: 'Facebook', icon: <FacebookSVG /> }] : []),
    ...(tiktok ? [{ href: tiktok, label: 'TikTok', icon: <TiktokSVG /> }] : []),
    ...(whatsapp ? [{ href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`, label: 'WhatsApp', icon: <WhatsAppSVG /> }] : []),
  ]

  const hasSocial = socialLinks.length > 0
  const gridCols = hasSocial
    ? 'lg:grid-cols-[2fr_1fr_1fr_1.2fr]'
    : 'lg:grid-cols-[2fr_1fr_1.2fr]'

  return (
    // Outer element provides the floating margin — no background so page bg shows through
    <footer aria-label="Footer" className="px-3 pb-3 sm:px-4 sm:pb-4">
      <div
        className="rounded-[20px] overflow-hidden"
        style={{ background: '#111111' }}
      >
        <div className="max-w-[1120px] mx-auto px-6 sm:px-10 pt-12 pb-0">

          {/* Main grid */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-10 lg:gap-12 pb-12`}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >

            {/* ── Col 1: Brand ── */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {tenant.logo_url && (
                  <Image
                    src={tenant.logo_url}
                    alt={tenant.business_name}
                    width={38}
                    height={38}
                    className="rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <p className="m-0 font-black text-white text-[15px]">{tenant.business_name}</p>
              </div>
              {(tenant.tagline || tenant.description) && (
                <p
                  className="text-white/35 text-sm leading-relaxed m-0 overflow-hidden"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                  } as React.CSSProperties}
                >
                  {tenant.tagline ?? tenant.description}
                </p>
              )}
            </div>

            {/* ── Col 2: Esplora ── */}
            <div>
              <p className="m-0 mb-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">
                Esplora
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { href: '#chi-siamo', label: 'Chi siamo' },
                  { href: '#team', label: 'Team' },
                  { href: '#sedi', label: 'Sedi' },
                  { href: '#servizi', label: 'Servizi' },
                  { href: '#prodotti', label: 'Prodotti' },
                ].map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="text-sm text-white/45 hover:text-white/80 transition-colors no-underline"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* ── Col 3: Social (only if any) ── */}
            {hasSocial && (
              <div>
                <p className="m-0 mb-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">
                  Seguici
                </p>
                <div className="flex flex-col gap-3">
                  {socialLinks.map(({ href, label, icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-white/45 hover:text-white/80 transition-colors no-underline"
                    >
                      <span className="opacity-60 flex-shrink-0">{icon}</span>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Col 4: Contatti + CTA ── */}
            <div>
              {(contactPhone || contactEmail) && (
                <>
                  <p className="m-0 mb-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">
                    Contatti
                  </p>
                  <div className="flex flex-col gap-3 mb-7">
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-sm text-white/55 hover:text-white/85 transition-colors no-underline"
                      >
                        {contactPhone}
                      </a>
                    )}
                    {contactEmail && (
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-sm text-white/55 hover:text-white/85 transition-colors no-underline"
                      >
                        {contactEmail}
                      </a>
                    )}
                  </div>
                </>
              )}
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-bold text-sm no-underline text-white rounded-full hover:opacity-88 transition-opacity"
                style={{ background: 'var(--brand-primary, #2a2a2a)', padding: '11px 20px' }}
              >
                Prenota ora
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-5">
            <p className="m-0 text-xs text-white/20">
              © {new Date().getFullYear()} {tenant.business_name}. Tutti i diritti riservati.
            </p>
            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/20 hover:text-white/40 transition-colors no-underline"
            >
              Powered by Styll
            </a>
            <a
              href={analyticsPreferencesHref}
              className="text-[11px] text-white/20 hover:text-white/40 transition-colors no-underline"
            >
              Gestisci cookie
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
