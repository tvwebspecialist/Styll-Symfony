import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicService } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  services: PublicService[]
  slug: string
}

interface ServiceGroup {
  category: string
  services: PublicService[]
}

function groupServicesByCategory(services: PublicService[]): ServiceGroup[] {
  const groups = new Map<string, PublicService[]>()
  for (const service of services) {
    const cat = service.category?.trim() || 'Servizi principali'
    const current = groups.get(cat) ?? []
    current.push(service)
    groups.set(cat, current)
  }
  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    services: items.sort((a, b) => a.display_order - b.display_order),
  }))
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price)
}

interface ServiceRowProps {
  service: PublicService
  isLast: boolean
}

function ServiceRow({ service, isLast }: ServiceRowProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-5 animate-fade-in-up ${!isLast ? 'border-b' : ''}`}
      style={!isLast ? { borderColor: 'var(--landing-border)' } : undefined}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-2 size-2 shrink-0 rounded-full"
          style={{ background: 'var(--brand-primary)' }}
        />
        <div>
          <p
            className="font-bold"
            style={{ fontSize: '1.1rem', color: 'var(--landing-text-primary)' }}
          >
            {service.name}
          </p>
          {service.description && (
            <p
              className="mt-0.5 text-[0.875rem]"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              {service.description}
            </p>
          )}
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.75rem]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--landing-text-muted)',
            }}
          >
            <Clock size={10} />
            {service.duration_minutes} min
          </div>
        </div>
      </div>
      <span
        className="shrink-0 font-extrabold"
        style={{ fontSize: '1.5rem', color: 'var(--brand-primary)' }}
      >
        {formatPrice(service.price)}
      </span>
    </div>
  )
}

export default function LandingServices({ tenant, services, slug }: Props) {
  if (services.length === 0) return null
  const grouped = groupServicesByCategory(services)

  return (
    <section
      aria-label="Servizi"
      id="servizi"
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{ background: 'var(--landing-bg)' }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <h2
          className="mb-12 font-bold tracking-[-0.02em]"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: 'var(--landing-text-primary)',
          }}
        >
          Servizi
        </h2>

        <div className="space-y-16">
          {grouped.map((group) => {
            const mid = Math.ceil(group.services.length / 2)
            const col1 = group.services.slice(0, mid)
            const col2 = group.services.slice(mid)

            return (
              <div key={group.category}>
                <h3
                  className="mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  {group.category}
                </h3>

                <div className="md:grid md:grid-cols-2 md:gap-x-12">
                  <div>
                    {col1.map((service, index) => (
                      <ServiceRow
                        key={service.id}
                        service={service}
                        isLast={index === col1.length - 1 && col2.length === 0}
                      />
                    ))}
                  </div>
                  {col2.length > 0 && (
                    <div>
                      {col2.map((service, index) => (
                        <ServiceRow
                          key={service.id}
                          service={service}
                          isLast={index === col2.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href={`/tenant/app/${slug}/prenota?categoria=${encodeURIComponent(group.category)}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    borderColor: 'var(--brand-primary)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  Prenota {group.category}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
