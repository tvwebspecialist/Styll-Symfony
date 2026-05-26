'use client'

import type { CSSProperties } from 'react'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Menu } from 'lucide-react'

interface NavLink {
  label: string
  href: string
}

interface Props {
  businessName: string
  logoUrl: string | null
  slug: string
  primaryColor: string
  hasAbout: boolean
  hasTeam: boolean
}

export default function LandingNavbar({
  businessName,
  logoUrl,
  slug,
  primaryColor,
  hasAbout,
  hasTeam,
}: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const links: NavLink[] = [
    ...(hasAbout ? [{ label: 'Chi siamo', href: '#chi-siamo' }] : []),
    ...(hasTeam ? [{ label: 'Team', href: '#team' }] : []),
    { label: 'Sedi', href: '#sedi' },
    { label: 'Servizi', href: '#servizi' },
  ]

  const bookingUrl = `https://${slug}-app.styll.it/prenota`

  const navStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    transition: 'background 0.3s ease, box-shadow 0.3s ease, backdrop-filter 0.3s ease',
    background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
    backdropFilter: scrolled ? 'blur(16px)' : 'none',
    WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
    boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.08)' : 'none',
  }

  return (
    <>
      <nav style={navStyle} aria-label="Navigazione principale">
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 clamp(20px, 4vw, 48px)',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
          }}
        >
          {/* Logo */}
          <Link
            href="#"
            aria-label={businessName}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={businessName}
                width={36}
                height={36}
                className="rounded-xl object-cover"
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: scrolled ? '#111111' : '#FFFFFF',
                transition: 'color 0.3s ease',
                letterSpacing: '-0.01em',
              }}
            >
              {businessName}
            </span>
          </Link>

          {/* Desktop links */}
          <div
            className="hidden md:flex"
            style={{ alignItems: 'center', gap: 'clamp(20px, 3vw, 36px)' }}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-label={link.label}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: scrolled ? '#444444' : 'rgba(255,255,255,0.85)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.01em',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Link
              href={bookingUrl}
              aria-label={`Prenota da ${businessName}`}
              className="hidden md:inline-flex"
              style={{
                alignItems: 'center',
                gap: 8,
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: primaryColor,
                textDecoration: 'none',
                transition: 'opacity 0.2s ease',
                whiteSpace: 'nowrap',
              } as CSSProperties}
            >
              Prenota
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Apri menu"
              className="md:hidden"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                background: scrolled ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
                color: scrolled ? '#111111' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigazione"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Panel */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(320px, 85vw)',
              background: '#FFFFFF',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
                {businessName}
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Chiudi menu"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: 'none',
                  background: '#F0F0F0',
                  color: '#111111',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#333333',
                  textDecoration: 'none',
                  borderRadius: 12,
                  transition: 'background 0.15s',
                }}
              >
                {link.label}
              </a>
            ))}

            <Link
              href={bookingUrl}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                padding: '14px 24px',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: primaryColor,
                textDecoration: 'none',
                marginTop: 16,
              } as CSSProperties}
            >
              Prenota ora
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
