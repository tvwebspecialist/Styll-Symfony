import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'
import type { LandingTenant, LandingLocation } from '@/types/landing'

// ── Social icon SVGs ──────────────────────────────────────────────────────────

function InstagramSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  )
}

function TiktokSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.29 6.29 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.35a8.17 8.17 0 004.78 1.52V6.44a4.85 4.85 0 01-1.01-.25z" />
    </svg>
  )
}

function WhatsAppSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SocialBadge({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.07] border border-white/10 text-white/40 hover:bg-white/[0.13] hover:text-white/80 transition-all no-underline"
    >
      {children}
    </a>
  )
}

function FooterLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 mb-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/30">
      {children}
    </p>
  )
}

function FooterLink({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm text-white/45 hover:text-white/80 transition-colors no-underline"
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className="block text-sm text-white/45 hover:text-white/80 transition-colors no-underline">
      {children}
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

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
      : firstLocation?.address
        ? `https://maps.google.com/?q=${encodeURIComponent([firstLocation.address, firstLocation.city].filter(Boolean).join(', '))}`
        : null

  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota`
  const { instagram, facebook, tiktok, whatsapp } = tenant.social_links
  const hasSocial = instagram || facebook || tiktok || whatsapp
  const contactPhone = tenant.contact_phone || firstLocation?.phone || null
  const contactEmail = tenant.contact_email || firstLocation?.email || null

  return (
    <footer aria-label="Footer" style={{ background: '#0D0D0D' }}>
      <div className="w-full max-w-[1120px] mx-auto px-5 pt-20 pb-0">

        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-10 lg:gap-12 pb-14"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

          {/* ── Col 1: Brand ── */}
          <div>
            {/* Logo + name */}
            <div className="flex items-center gap-3 mb-4">
              {tenant.logo_url && (
                <Image
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  width={42}
                  height={42}
                  className="rounded-xl object-cover flex-shrink-0"
                />
              )}
              <p className="m-0 font-black text-white text-[15px]">{tenant.business_name}</p>
            </div>

            {/* Tagline / description */}
            {tenant.description && (
              <p
                className="text-white/35 text-sm leading-relaxed mb-6 mt-0 overflow-hidden"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                } as React.CSSProperties}
              >
                {tenant.description}
              </p>
            )}

            {/* Social badges */}
            {hasSocial && (
              <div className="flex items-center gap-2.5 mb-6">
                {instagram && (
                  <SocialBadge href={instagram} label="Instagram">
                    <InstagramSVG />
                  </SocialBadge>
                )}
                {facebook && (
                  <SocialBadge href={facebook} label="Facebook">
                    <FacebookSVG />
                  </SocialBadge>
                )}
                {tiktok && (
                  <SocialBadge href={tiktok} label="TikTok">
                    <TiktokSVG />
                  </SocialBadge>
                )}
                {whatsapp && (
                  <SocialBadge
                    href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                    label="WhatsApp"
                  >
                    <WhatsAppSVG />
                  </SocialBadge>
                )}
              </div>
            )}

            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#333] hover:text-[#555] transition-colors text-[11px] no-underline"
            >
              Powered by Styll ↗
            </a>
          </div>

          {/* ── Col 2: Esplora ── */}
          <div>
            <FooterLabel>Esplora</FooterLabel>
            <div className="flex flex-col gap-3">
              <FooterLink href="#chi-siamo">Chi siamo</FooterLink>
              <FooterLink href="#sedi">Sedi</FooterLink>
              <FooterLink href="#servizi">Servizi</FooterLink>
              <FooterLink href="#team">Team</FooterLink>
              <FooterLink href="#prodotti">Prodotti</FooterLink>
            </div>
          </div>

          {/* ── Col 3: Contatti ── */}
          <div>
            <FooterLabel>Contatti</FooterLabel>
            <div className="flex flex-col gap-3.5">
              {address && (
                <div className="flex items-start gap-2.5">
                  <MapPin
                    size={13}
                    className="mt-0.5 shrink-0"
                    style={{ color: 'var(--brand-primary, #888)' }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-white/45 leading-snug">{address}</span>
                </div>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-2.5 text-sm text-white/45 hover:text-white/75 transition-colors no-underline"
                >
                  <Phone size={13} className="shrink-0" style={{ color: 'var(--brand-primary, #888)' }} aria-hidden="true" />
                  {contactPhone}
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-2.5 text-sm text-white/45 hover:text-white/75 transition-colors no-underline"
                >
                  <Mail size={13} className="shrink-0" style={{ color: 'var(--brand-primary, #888)' }} aria-hidden="true" />
                  {contactEmail}
                </a>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/25 hover:text-white/55 transition-colors no-underline mt-1"
                >
                  Vedi su Google Maps ↗
                </a>
              )}
            </div>
          </div>

          {/* ── Col 4: Prenota ── */}
          <div>
            <FooterLabel>Inizia ora</FooterLabel>
            <div className="flex flex-col gap-3">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-bold text-sm no-underline text-white rounded-full hover:opacity-88 transition-opacity"
                style={{ background: 'var(--brand-primary, #1a1a1a)', padding: '12px 20px' }}
              >
                Prenota ora
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <Link
                href={`/tenant/app/${tenant.slug}`}
                className="inline-flex items-center justify-center font-medium text-sm no-underline text-white/40 hover:text-white/70 transition-colors rounded-full border border-white/10 hover:border-white/20"
                style={{ padding: '12px 20px' }}
              >
                Accedi all&apos;app
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-6">
          <p className="m-0 text-xs text-white/20">
            © {new Date().getFullYear()} {tenant.business_name}. Tutti i diritti riservati.
          </p>
          <div className="flex items-center gap-5">
            <Link href="#" className="text-xs text-white/20 hover:text-white/45 transition-colors no-underline">
              Privacy Policy
            </Link>
            <Link href="#" className="text-xs text-white/20 hover:text-white/45 transition-colors no-underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
