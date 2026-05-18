import Link from 'next/link'
import type { TenantBranding } from '@/lib/tenant'
import type { Promotion } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  promotions: Promotion[]
  slug: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}

function DiscountBadge({ promotion }: { promotion: Promotion }) {
  if (promotion.discount_type === 'percent' && promotion.discount_value) {
    return (
      <p className="mb-3 font-black text-white" style={{ fontSize: '3rem', lineHeight: 1 }}>
        -{promotion.discount_value}%
      </p>
    )
  }
  if (promotion.discount_type === 'fixed' && promotion.discount_value) {
    return (
      <p className="mb-3 font-black text-white" style={{ fontSize: '3rem', lineHeight: 1 }}>
        -€{promotion.discount_value}
      </p>
    )
  }
  return null
}

export default function LandingPromo({ tenant, promotions, slug }: Props) {
  if (promotions.length === 0) return null

  const primary = tenant.primary_color ?? '#1a1a1a'

  return (
    <section
      aria-label="Promozioni"
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{
        background: `linear-gradient(180deg, var(--landing-bg) 0%, ${primary}22 50%, var(--landing-bg) 100%)`,
      }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <h2
          className="mb-10 font-bold tracking-[-0.02em]"
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            color: 'var(--landing-text-primary)',
          }}
        >
          Promozioni
        </h2>

        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className="w-[80vw] shrink-0 snap-start rounded-2xl p-6 md:w-auto"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, #1a1a1a 100%)`,
              }}
            >
              <DiscountBadge promotion={promo} />

              <p
                className="mb-2 font-semibold text-white"
                style={{ fontSize: '1.25rem' }}
              >
                {promo.title}
              </p>

              {promo.description && (
                <p
                  className="mb-4 text-[0.875rem] leading-relaxed"
                  style={{ color: 'rgba(255,255,255,0.65)' }}
                >
                  {promo.description}
                </p>
              )}

              {promo.valid_until && (
                <p
                  className="mb-5 text-[0.75rem]"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Valida fino al {formatDate(promo.valid_until)}
                </p>
              )}

              <Link
                href={`/tenant/app/${slug}/prenota`}
                className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: '#ffffff', color: primary }}
              >
                Approfitta
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
