'use client'

import Link from 'next/link'
import {
  Scissors,
  Smile,
  Sparkles,
  Star,
  Hand,
  Eye,
  Layers,
  Zap,
} from 'lucide-react'
import AnimatedSection from '@/components/landing/AnimatedSection'
import AnimatedList from '@/components/landing/AnimatedList'
import type { LandingService, LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
  services: LandingService[]
}


function renderServiceIcon(category: string | null, name: string, color: string) {
  const text = ((category ?? '') + ' ' + name).toLowerCase()
  const props = { size: 22, color, strokeWidth: 1.75 }
  if (text.includes('taglio') || text.includes('capell') || text.includes('hair') || text.includes('cut')) return <Scissors {...props} />
  if (text.includes('barba') || text.includes('beard') || text.includes('shave')) return <Smile {...props} />
  if (text.includes('color') || text.includes('tinta') || text.includes('highlight')) return <Sparkles {...props} />
  if (text.includes('trattament') || text.includes('cura') || text.includes('treatment')) return <Star {...props} />
  if (text.includes('massagg') || text.includes('massage')) return <Hand {...props} />
  if (text.includes('sopraccig') || text.includes('brow') || text.includes('ciglia')) return <Eye {...props} />
  if (text.includes('rasatura')) return <Zap {...props} />
  if (text.includes('pacchetto') || text.includes('combo') || text.includes('pack')) return <Layers {...props} />
  return <Scissors {...props} />
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(price)
}

interface ServiceCardProps {
  service: LandingService
  primaryColor: string
}

function ServiceCard({ service, primaryColor }: ServiceCardProps) {
  return (
    <article className="flex flex-col h-full bg-white rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Icon */}
      <div
        className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 shrink-0"
        aria-hidden="true"
        style={{ background: `color-mix(in srgb, ${primaryColor} 10%, transparent)` }}
      >
        {renderServiceIcon(service.category, service.name, primaryColor)}
      </div>

      {/* Name */}
      <p className="font-semibold text-[#111] text-[15px] mb-2">{service.name}</p>

      {/* Description */}
      {service.description && (
        <p
          className="text-sm text-[#888] leading-relaxed overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}
        >
          {service.description}
        </p>
      )}

      <div className="flex-1" />

      {/* Duration + price */}
      <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[#f0f0f0]">
        <span className="text-xs font-medium text-[#999]">{service.duration_minutes} min</span>
        <span className="font-black text-[15px]" style={{ color: primaryColor }}>
          {formatPrice(service.price)} €
        </span>
      </div>
    </article>
  )
}

export default function LandingServices({ tenant, services }: Props) {
  if (!services.length) return null

  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota`

  return (
    <section id="servizi" aria-label="Servizi" className="w-full py-20 sm:py-24" style={{ background: '#F5F5F5' }}>
      <div className="w-full max-w-[1120px] mx-auto px-5">

        {/* Header */}
        <AnimatedSection direction="up" className="mb-12 text-center">
          <h2
            className="font-black text-[#111] mb-3"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}
          >
            I nostri Servizi
          </h2>
          <p className="text-[#888] text-base max-w-md mx-auto">
            Curated grooming experience crafted by master barbers
          </p>
        </AnimatedSection>

        {/* Cards */}
        <AnimatedList staggerDelay={0.06} className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-stretch">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              primaryColor={tenant.primary_color}
            />
          ))}
        </AnimatedList>

        {/* CTA */}
        <AnimatedSection direction="up" delay={0.1} className="mt-12 text-center">
          <Link
            href={bookingUrl}
            aria-label="Prenota un servizio"
            className="inline-flex items-center gap-2 font-bold text-sm no-underline text-white rounded-full hover:opacity-90 transition-opacity"
            style={{ background: tenant.primary_color, padding: '14px 32px' }}
          >
            Prenota un servizio
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </AnimatedSection>
      </div>
    </section>
  )
}
