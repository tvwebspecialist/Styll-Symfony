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

export default function LandingNavbar({ tenant, sections }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
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
      document.body.style.overflow = 'hidden'
    } else {
      resumeLenis()
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const links: NavLink[] = [
    ...(sections.showAbout    ? [{ label: 'Chi siamo', id: 'chi-siamo', href: '#chi-siamo' }] : []),
    ...(sections.showTeam     ? [{ label: 'Team',      id: 'team',      href: '#team'      }] : []),
    { label: 'Sedi',     id: 'sedi',     href: '#sedi'     },
    { label: 'Servizi',  id: 'servizi',  href: '#servizi'  },
    ...(sections.showProducts ? [{ label: 'Prodotti',  id: 'prodotti',  href: '#prodotti'  }] : []),
  ]

  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota`

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    scrollToSection(id, -80)
  }

  function handleDrawerAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    setDrawerOpen(false)
    setTimeout(() => scrollToSection(id, -80), 50)
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

  const ctaBg = scrolled ? 'var(--tenant-primary)' : '#fff'
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
          width: 'calc(100% - 48px)',
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
            padding: '0 8px 0 16px',
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
              onClick={() => setDrawerOpen(true)}
              aria-label="Apri menu"
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

      {/* Mobile drawer — slides up from bottom */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigazione"
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchStartY.current > 80) setDrawerOpen(false)
        }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1002,
          background: '#111',
          borderRadius: '24px 24px 0 0',
          padding: '16px 24px 40px',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.2)',
            margin: '0 auto 28px',
          }}
        />

        {/* Nav links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '24px' }}>
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
                borderRadius: '12px',
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
            background: 'var(--tenant-primary)',
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
