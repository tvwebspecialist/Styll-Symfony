'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Menu } from 'lucide-react'
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

  useEffect(() => {
    function handleScroll() { setScrolled(window.scrollY > 60) }
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
    scrollToSection(id)
  }

  function handleDrawerAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault()
    setDrawerOpen(false)
    setTimeout(() => scrollToSection(id), 50)
  }

  return (
    <>
      <nav
        aria-label="Navigazione principale"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/96 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.07)]'
            : 'bg-transparent'
        }`}
      >
        <div className="flex items-center justify-between gap-6 w-full max-w-[1120px] mx-auto px-5 h-[68px]">

          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); scrollToSection('hero', 0) }}
            aria-label={tenant.business_name}
            className="flex items-center gap-2.5 shrink-0 no-underline"
          >
            {tenant.logo_url ? (
              <Image
                src={tenant.logo_url}
                alt={tenant.business_name}
                width={34}
                height={34}
                className="rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-primary)' }}
              >
                <span className="text-white font-black text-xs">
                  {tenant.business_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span
              className={`font-bold text-sm transition-colors duration-300 ${
                scrolled ? 'text-[#111]' : 'text-white'
              }`}
            >
              {tenant.business_name}
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.id)}
                className={`text-sm font-medium no-underline transition-colors duration-300 ${
                  scrolled ? 'text-[#555] hover:text-[#111]' : 'text-white/75 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={bookingUrl}
              aria-label={`Prenota da ${tenant.business_name}`}
              className="hidden md:inline-flex items-center font-semibold text-[13px] no-underline rounded-full transition-all duration-300 px-5 py-[9px]"
              style={
                scrolled
                  ? { background: '#111', color: '#fff' }
                  : { background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.28)' }
              }
            >
              Prenota ora
            </Link>

            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Apri menu"
              className={`md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-300 ${
                scrolled ? 'text-[#111]' : 'text-white'
              }`}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigazione"
            className="fixed top-0 right-0 bottom-0 z-[200] w-[min(320px,85vw)] bg-white flex flex-col p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="font-black text-base text-[#111]">{tenant.business_name}</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Chiudi menu"
                className="flex items-center justify-center w-9 h-9 rounded-xl text-[#666] hover:text-[#111] hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-col gap-1 flex-1">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleDrawerAnchorClick(e, link.id)}
                  className="block py-3 px-4 font-medium text-base text-[#333] no-underline rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="pt-6">
              <Link
                href={bookingUrl}
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-center font-bold text-sm no-underline py-4 px-6 rounded-full text-white"
                style={{ background: 'var(--brand-primary)' }}
              >
                Prenota ora
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
