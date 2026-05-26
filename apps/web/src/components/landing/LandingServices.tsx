import Link from 'next/link'
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

function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(price)
}

interface ServiceRowProps {
  service: PublicService
  slug: string
}

function ServiceRow({ service, slug }: ServiceRowProps) {
  return (
    <Link
      href={`/tenant/app/${slug}/prenota?service=${service.id}`}
      className="group flex items-start justify-between gap-4 py-5 transition-colors"
      style={{ borderBottom: '1px solid #F3F4F6' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="font-semibold leading-snug transition-colors group-hover:text-[var(--brand-primary)]"
          style={{ fontSize: '1.05rem', color: '#111111' }}
        >
          {service.name}
        </p>
        {service.description && (
          <p className="mt-1 line-clamp-1 text-[0.8rem]" style={{ color: '#6B7280' }}>
            {service.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: '#F3F4F6', color: '#6B7280' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {service.duration_minutes} min
          </span>
          <span
            className="flex items-center gap-1 text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color: 'var(--brand-primary)' }}
          >
            Prenota
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      <div className="shrink-0 pt-0.5 text-right">
        <span
          className="font-black leading-none"
          style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}
        >
          {formatPriceNumber(service.price)}
        </span>
        <span className="ml-0.5 text-[0.7rem] font-medium" style={{ color: '#6B7280' }}>
          €
        </span>
      </div>
    </Link>
  )
}

interface CategoryBlockProps {
  group: ServiceGroup
  slug: string
}

function CategoryBlock({ group, slug }: CategoryBlockProps) {
  const mid = Math.ceil(group.services.length / 2)
  const col1 = group.services.slice(0, mid)
  const col2 = group.services.slice(mid)

  return (
    <div>
      <div
        className="mb-4 flex items-center gap-3 pb-3"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <div className="h-5 w-1 rounded-full" style={{ background: 'var(--brand-primary)' }} />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: '#9CA3AF' }}>
          {group.category}
        </span>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-x-12">
        <div>
          {col1.map((service) => (
            <ServiceRow key={service.id} service={service} slug={slug} />
          ))}
        </div>
        {col2.length > 0 && (
          <div>
            {col2.map((service) => (
              <ServiceRow key={service.id} service={service} slug={slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LandingServices({ services, slug }: Props) {
  if (services.length === 0) return null
  const grouped = groupServicesByCategory(services)

  return (
    <section
      aria-label="Servizi"
      id="servizi"
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{ background: '#FFFFFF' }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mb-12">
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--brand-primary)' }}
          >
            Cosa offriamo
          </span>
          <h2
            className="mt-2 font-bold tracking-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#111111' }}
          >
            Servizi
          </h2>
        </div>

        <div className="space-y-14">
          {grouped.map((group) => (
            <CategoryBlock key={group.category} group={group} slug={slug} />
          ))}
        </div>
      </div>
    </section>
  )
}
