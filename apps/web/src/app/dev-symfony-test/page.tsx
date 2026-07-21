import type { CSSProperties } from 'react'
import {
  fetchSymfonyPublicLandingData,
  getSymfonyPublicApiBaseUrl,
  SymfonyPublicApiError,
} from '@/lib/symfony/public-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ slug?: string }>
}

export default async function DevSymfonyTestPage({ searchParams }: PageProps) {
  const { slug: rawSlug } = await searchParams
  const slug = rawSlug?.trim()

  if (!slug) {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.eyebrow}>Temporaneo</p>
          <h1 style={styles.title}>Symfony public API test</h1>
          <p style={styles.text}>
            Passa uno slug reale nella query string per verificare il collegamento:
          </p>
          <code style={styles.code}>/dev-symfony-test?slug=&lt;slug-tenant&gt;</code>
          <p style={styles.muted}>Base API: {getSymfonyPublicApiBaseUrl()}</p>
        </section>
      </main>
    )
  }

  try {
    const data = await fetchSymfonyPublicLandingData(slug)
    const counts = {
      locations: data.locations.length,
      serviceCategories: data.serviceCategories.length,
      services: data.services.length,
      staffMembers: data.staffMembers.length,
      products: data.products.length,
      galleryPhotos: data.galleryPhotos.length,
      portfolioPhotos: data.portfolioPhotos.length,
      websitePhotos: data.websitePhotos.length,
      promotions: data.promotions.length,
      promotionServices: data.promotionServices.length,
      promotionProducts: data.promotionProducts.length,
    }

    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.eyebrow}>Temporaneo</p>
          <h1 style={styles.title}>Symfony public API test</h1>
          <p style={styles.text}>
            Collegamento riuscito per <strong>{data.tenant.businessName}</strong> (<code>{data.tenant.slug}</code>).
          </p>
          <p style={styles.muted}>Base API: {getSymfonyPublicApiBaseUrl()}</p>
        </section>

        <section style={styles.grid}>
          {Object.entries(counts).map(([label, value]) => (
            <article key={label} style={styles.metric}>
              <span style={styles.metricValue}>{value}</span>
              <span style={styles.metricLabel}>{label}</span>
            </article>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.subtitle}>Risposta aggregata</h2>
          <pre style={styles.pre}>{JSON.stringify(data, null, 2)}</pre>
        </section>
      </main>
    )
  } catch (error) {
    const apiError = error instanceof SymfonyPublicApiError ? error : null

    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.eyebrow}>Temporaneo</p>
          <h1 style={styles.title}>Symfony public API test</h1>
          <p style={styles.error}>
            {apiError?.code === 'tenant_not_found'
              ? `Tenant non trovato per slug "${slug}".`
              : 'Errore durante la chiamata alle API Symfony.'}
          </p>
          <p style={styles.muted}>Base API: {getSymfonyPublicApiBaseUrl()}</p>
          <pre style={styles.pre}>
            {JSON.stringify(
              {
                message: error instanceof Error ? error.message : 'Unknown error',
                ...(apiError
                  ? {
                      code: apiError.code,
                      status: apiError.details.status,
                      url: apiError.details.url,
                    }
                  : {}),
              },
              null,
              2,
            )}
          </pre>
        </section>
      </main>
    )
  }
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: '100dvh',
    background: '#f6f7fb',
    color: '#111827',
    padding: 32,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    maxWidth: 1040,
    margin: '0 auto 24px',
    border: '1px solid #e5e7eb',
    borderRadius: 24,
    background: '#fff',
    padding: 24,
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
  },
  eyebrow: {
    margin: 0,
    color: '#6366f1',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    margin: '8px 0 12px',
    fontSize: 32,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: '0 0 16px',
    fontSize: 20,
  },
  text: {
    margin: '0 0 16px',
    color: '#374151',
    lineHeight: 1.6,
  },
  muted: {
    margin: '12px 0 0',
    color: '#6b7280',
    fontSize: 13,
  },
  code: {
    display: 'inline-block',
    borderRadius: 12,
    background: '#111827',
    color: '#f9fafb',
    padding: '10px 12px',
  },
  grid: {
    display: 'grid',
    maxWidth: 1040,
    margin: '0 auto 24px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
  },
  metric: {
    border: '1px solid #e5e7eb',
    borderRadius: 18,
    background: '#fff',
    padding: 16,
  },
  metricValue: {
    display: 'block',
    fontSize: 28,
    fontWeight: 800,
  },
  metricLabel: {
    display: 'block',
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  pre: {
    maxHeight: 520,
    overflow: 'auto',
    borderRadius: 16,
    background: '#0f172a',
    color: '#e5e7eb',
    padding: 16,
    fontSize: 12,
    lineHeight: 1.5,
  },
  error: {
    margin: '0 0 16px',
    color: '#b91c1c',
    fontWeight: 700,
  },
}
