import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import {
  getPublicServices,
  getPublicLocations,
  getPublicWebsitePhotos,
  getPublicTeam,
  getPublicProducts,
} from '@/lib/actions/public-booking'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingHero from '@/components/landing/LandingHero'
import LandingAbout from '@/components/landing/LandingAbout'
import LandingTeam from '@/components/landing/LandingTeam'
import LandingLocations from '@/components/landing/LandingLocations'
import LandingServices from '@/components/landing/LandingServices'
import LandingProducts from '@/components/landing/LandingProducts'
import LandingPWACta from '@/components/landing/LandingPWACta'
import LandingFooter from '@/components/landing/LandingFooter'
import LandingInstallBanner from '@/components/landing/LandingInstallBanner'
import ScrollRevealInit from '@/components/landing/ScrollRevealInit'
import LenisInit from '@/components/landing/LenisInit'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') return {}

  const [websitePhotos, locations] = await Promise.all([
    getPublicWebsitePhotos(tenant.tenant_id),
    getPublicLocations(tenant.tenant_id),
  ])

  const heroImage = websitePhotos[0]?.url ?? locations[0]?.photo_url ?? null

  return {
    openGraph: {
      title: tenant.business_name,
      description: `Prenota online da ${tenant.business_name}`,
      images: heroImage ? [{ url: heroImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      images: heroImage ? [heroImage] : [],
    },
  }
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const [services, locations, websitePhotos, team, products] = await Promise.all([
    getPublicServices(tenant.tenant_id),
    getPublicLocations(tenant.tenant_id),
    getPublicWebsitePhotos(tenant.tenant_id),
    getPublicTeam(tenant.tenant_id),
    getPublicProducts(tenant.tenant_id),
  ])

  const firstLocation = locations[0] ?? null
  const aboutData = tenant.settings?.about as { title?: string; text?: string; image_url?: string } | undefined

  const hasAbout = Boolean(
    aboutData?.text?.trim() ||
    (tenant.settings?.bio as string | undefined)?.trim()
  )
  const hasTeam = team.length > 1
  const hasProducts = products.length > 0

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        [data-reveal] {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].is-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .lp-service-card,
        .lp-svc-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .lp-team-card:hover {
          box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important;
          transform: translateY(-3px);
        }

        .lp-location-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .lp-location-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important;
        }

        @keyframes lpBounce {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50% { transform: translateY(6px) translateX(-50%); }
        }
        .lp-scroll-indicator {
          animation: lpBounce 1.8s ease-in-out infinite;
        }

        @media (max-width: 600px) {
          .lp-hero-stats { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-reveal] {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .lp-scroll-indicator {
            animation: none;
          }
        }
      `}</style>

      <LenisInit />
      <ScrollRevealInit />

      <LandingNavbar
        businessName={tenant.business_name}
        logoUrl={tenant.logo_url}
        slug={slug}
        primaryColor={tenant.primary_color ?? '#1a1a1a'}
        hasAbout={hasAbout}
        hasTeam={hasTeam}
      />

      <LandingHero
        tenant={tenant}
        firstLocation={firstLocation}
        websitePhotos={websitePhotos}
        slug={slug}
        servicesCount={services.length}
      />

      <LandingAbout
        tenant={tenant}
        websitePhotos={websitePhotos}
        firstLocation={firstLocation}
        aboutData={aboutData}
      />

      <LandingTeam
        team={team}
      />

      <LandingLocations locations={locations} />

      <LandingServices
        tenant={tenant}
        services={services}
        slug={slug}
      />

      {hasProducts && (
        <LandingProducts products={products} />
      )}

      <LandingPWACta
        tenantName={tenant.business_name}
        logoUrl={tenant.logo_url}
        primaryColor={tenant.primary_color ?? '#1a1a1a'}
      />

      <LandingFooter
        tenant={tenant}
        firstLocation={firstLocation}
        slug={slug}
      />

      <LandingInstallBanner
        tenantName={tenant.business_name}
        logoUrl={tenant.logo_url}
        primaryColor={tenant.primary_color ?? '#1a1a1a'}
      />
    </>
  )
}
