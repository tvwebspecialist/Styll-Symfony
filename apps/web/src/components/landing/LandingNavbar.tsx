'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { scrollToSection, pauseLenis, resumeLenis } from '@/hooks/useLenis'
import type { LandingTenant, LandingSections } from '@/types/landing'

interface Props {
  tenant: LandingTenant
  sections: LandingSections
}

interface NavLink {
  label: string
  id: string
  href: string
}

function readRuntimeLocation() {
  if (typeof window === 'undefined') return null

  return {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
  }
}

function buildBookingUrl(slug: string, runtimeLocation: ReturnType<typeof readRuntimeLocation>): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

  if (runtimeLocation && (
    runtimeLocation.hostname === 'localhost'
    || runtimeLocation.hostname.endsWith('.localhost')
  )) {
    const portSuffix = runtimeLocation.port ? `:${runtimeLocation.port}` : ''
    return `${runtimeLocation.protocol}//localhost${portSuffix}/prenota?_tenant_slug=${encodeURIComponent(slug)}&_tenant_type=app`
  }

  return `https://${slug}-app.${rootDomain}/prenota`
}

function getScrollOffset() {
  if (typeof window === 'undefined') return -80
  return window.innerWidth < 768 ? -72 : -80
}

export default function LandingNavbar({ tenant, sections }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [runtimeLocation] = useState<ReturnType<typeof readRuntimeLocation>>(() => readRuntimeLocation())
  const touchStartY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > window.innerHeight * 0.8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (drawerOpen) {
      pauseLenis()
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      resumeLenis()
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const links: NavLink[] = [
    ...(sections.showAbout    ? [{ label: 'Chi siamo', id: 'chi-siamo', href: '#chi-siamo' }] : []),
    ...(sections.showTeam     ? [{ label: 'Team',      id: 'team',      href: '#team'      }] : []),
    { label: 'Sedi',     id: 'sedi',     href: '#sedi'     },
    { label: 'Servizi',  id: 'servizi',  href: '#servizi'  },
    ...(sections.showProducts ? [{ label: 'Prodotti',  id: 'prodotti',  href: '#prodotti'  }] : []),
  ]

  const bookingUrl = buildBookingUrl(tenant.slug, runtimeLocation)

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    scrollToSection(id, getScrollOffset())
  }

  function handleDrawerAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    setDrawerOpen(false)
    setTimeout(() => scrollToSection(id, getScrollOffset()), 50)
  }

  const pillBg = scrolled
    ? 'rgba(255, 255, 255, 0.85)'
    : 'rgba(255, 255, 255, 0.08)'
  const pillBorder = scrolled
    ? '1px solid rgba(0, 0, 0, 0.08)'
    : '1px solid rgba(255, 255, 255, 0.15)'
  const pillShadow = scrolled
    ? '0 4px 32px rgba(0, 0, 0, 0.10)'
    : '0 4px 24px rgba(0, 0, 0, 0.12)'

  const linkColor = scrolled ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'
  const linkHoverColor = scrolled ? '#000' : '#fff'
  const nameColor = scrolled ? '#111' : '#fff'
  const iconColor = scrolled ? '#111' : '#fff'

  const ctaBg = scrolled ? 'var(--brand-primary)' : '#fff'
  const ctaColor = scrolled ? '#fff' : '#111'

  return (
    <>
      {/* Floating pill navbar */}
      <nav
        aria-label="Navigazione principale"
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '1200px',
          height: '56px',
          borderRadius: '9999px',
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: pillBg,
          border: pillBorder,
          boxShadow: pillShadow,
          transition: 'background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
            padding: '0 8px 0 14px',
          }}
        >
          {/* Left: Logo + Name */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); scrollToSection('hero', 0) }}
            aria-label={tenant.business_name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt={tenant.business_name}
                width={32}
                height={32}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--tenant-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '11px' }}>
                  {tenant.business_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: nameColor,
                transition: 'color 0.4s ease',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 'min(46vw, 190px)',
              }}
            >
              {tenant.business_name}
            </span>
          </a>

          {/* Center: Nav links (desktop only) */}
          <div
            className="hidden md:flex"
            style={{ alignItems: 'center', gap: '32px' }}
          >
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.id)}
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: linkColor,
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = linkHoverColor }}
                onMouseLeave={(e) => { e.currentTarget.style.color = linkColor }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: Hamburger (mobile) + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              aria-label={drawerOpen ? 'Chiudi menu' : 'Apri menu'}
              aria-expanded={drawerOpen}
              aria-controls="landing-mobile-menu"
              className="md:hidden"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '9999px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: iconColor,
                transition: 'color 0.4s ease',
                padding: 0,
              }}
            >
              <svg width="20" height="14" viewBox="0 0 20 14" fill="currentColor">
                <rect x="0" y="0"   width="20" height="2" rx="1" />
                <rect x="0" y="6"   width="20" height="2" rx="1" />
                <rect x="0" y="12"  width="20" height="2" rx="1" />
              </svg>
            </button>

            {/* CTA button */}
            <Link
              href={bookingUrl}
              aria-label={`Prenota da ${tenant.business_name}`}
              className="hidden sm:inline-flex"
              style={{
                borderRadius: '9999px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: ctaBg,
                color: ctaColor,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = '0.9'
                el.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = '1'
                el.style.transform = 'scale(1)'
              }}
            >
              Prenota ora <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1001,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Mobile drawer — full mobile menu */}
      <div
        id="landing-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigazione"
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchStartY.current > 80) setDrawerOpen(false)
        }}
        style={{
          position: 'fixed',
          top: '88px',
          left: '12px',
          right: '12px',
          zIndex: 1002,
          background: 'rgba(17, 17, 17, 0.96)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '18px 18px calc(24px + env(safe-area-inset-bottom, 0px))',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(16px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'transform 0.28s ease, opacity 0.28s ease',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
          maxHeight: 'calc(100dvh - 104px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt={tenant.business_name}
                width={36}
                height={36}
                style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 12 }}>
                  {tenant.business_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tenant.business_name}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.58)' }}>
                Menu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Chiudi menu"
            style={{
              width: 40,
              height: 40,
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
          <a
            href="#hero"
            onClick={(e) => handleDrawerAnchorClick(e, 'hero')}
            style={{
              fontSize: '18px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.96)',
              textDecoration: 'none',
              display: 'block',
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            Home
          </a>
          {links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              onClick={(e) => handleDrawerAnchorClick(e, link.id)}
              style={{
                fontSize: '18px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                textDecoration: 'none',
                display: 'block',
                padding: '14px 16px',
                borderRadius: '14px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Drawer CTA */}
        <Link
          href={bookingUrl}
          onClick={() => setDrawerOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            borderRadius: '9999px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 700,
            background: 'var(--brand-primary)',
            color: '#fff',
            textDecoration: 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          Prenota ora <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  )
}
