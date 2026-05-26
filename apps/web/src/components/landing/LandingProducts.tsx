import type { CSSProperties } from 'react'
import type { PublicProduct } from '@/lib/actions/public-booking'

interface Props {
  products: PublicProduct[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(price)
}

export default function LandingProducts({ products }: Props) {
  if (!products.length) return null

  return (
    <section
      id="prodotti"
      aria-label="I nostri prodotti"
      style={{ background: '#F8F8F8', padding: 'clamp(5rem, 10vw, 8rem) 0', overflow: 'hidden' } as CSSProperties}
    >
      <style>{`
        .lp-products-track {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          gap: 16px;
          padding: 0 clamp(20px, 5vw, 48px);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .lp-products-track::-webkit-scrollbar { display: none; }
        .lp-product-card {
          scroll-snap-align: start;
          flex-shrink: 0;
          width: 240px;
          background: #FFFFFF;
          border-radius: 18px;
          overflow: hidden;
          border: 1.5px solid #EBEBEB;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
        }
        .lp-product-card:hover {
          box-shadow: 0 12px 32px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }
        @media (max-width: 640px) {
          .lp-product-card { width: 180px; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 48px)',
          marginBottom: 'clamp(2rem, 4vw, 3rem)',
        }}
      >
        <div data-reveal>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--brand-primary)',
              marginBottom: 14,
            }}
          >
            Shop
          </span>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            I nostri prodotti
          </h2>
        </div>
      </div>

      {/* Scrollable track */}
      <div className="lp-products-track" role="list" aria-label="Lista prodotti">
        {products.map((product) => (
          <div key={product.id} className="lp-product-card" role="listitem">
            {/* Photo */}
            <div style={{ aspectRatio: '1/1', background: '#F0F0F0', overflow: 'hidden', position: 'relative' }}>
              {product.photo_url ? (
                <img
                  src={product.photo_url}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" aria-hidden="true">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ padding: '14px 16px 18px' }}>
              {product.brand && (
                <p
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--brand-primary)',
                    marginBottom: 4,
                  }}
                >
                  {product.brand}
                </p>
              )}
              <p
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#111111',
                  lineHeight: 1.3,
                  marginBottom: 8,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                } as CSSProperties}
              >
                {product.name}
              </p>
              <p
                style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#111111',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatPrice(product.price_sell)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
