import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import {
  getPublicServices,
  getActivePromotions,
  getPublicLocations,
  getPublicWebsitePhotos,
  getPublicTeam,
} from '@/lib/actions/public-booking'
import LandingHero from '@/components/landing/LandingHero'
import LandingAbout from '@/components/landing/LandingAbout'
import LandingServices from '@/components/landing/LandingServices'
import LandingTeam from '@/components/landing/LandingTeam'
import LandingLocations from '@/components/landing/LandingLocations'
import LandingGallery from '@/components/landing/LandingGallery'
import LandingPromo from '@/components/landing/LandingPromo'
import LandingPWACta from '@/components/landing/LandingPWACta'
import LandingFooter from '@/components/landing/LandingFooter'
import LandingInstallBanner from '@/components/landing/LandingInstallBanner'
import ScrollRevealInit from '@/components/landing/ScrollRevealInit'

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

  const [services, promotions, locations, websitePhotos, team] = await Promise.all([
    getPublicServices(tenant.tenant_id),
    getActivePromotions(tenant.tenant_id, 'landing'),
    getPublicLocations(tenant.tenant_id),
    getPublicWebsitePhotos(tenant.tenant_id),
    getPublicTeam(tenant.tenant_id),
  ])

  const firstLocation = locations[0] ?? null
  const aboutData = tenant.settings?.about as { title?: string; text?: string; image_url?: string } | undefined

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }

        [data-reveal] {
          opacity: 0;
          transform: translateY(44px);
          transition: opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
        }
        [data-reveal].is-revealed {
          opacity: 1;
          transform: translateY(0);
        }

        .lp-service-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: pointer;
        }
        .lp-service-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.12) !important;
        }

        .lp-team-card {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
        }
        .lp-team-card:hover {
          transform: scale(1.02);
          box-shadow: 0 24px 56px rgba(0,0,0,0.4);
        }
        .lp-team-card .lp-team-photo {
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-team-card:hover .lp-team-photo {
          transform: scale(1.06);
        }

        .lp-gallery-img {
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-gallery-img:hover {
          transform: scale(1.04);
        }

        .lp-location-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .lp-location-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important;
        }

        @keyframes lpBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .lp-scroll-indicator {
          animation: lpBounce 1.8s ease-in-out infinite;
        }

        @media (max-width: 600px) {
          .lp-hero-stats { display: none !important; }
        }
      `}</style>

      <ScrollRevealInit />

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

      <LandingServices
        tenant={tenant}
        services={services}
        slug={slug}
      />

      <LandingTeam
        team={team}
        slug={slug}
      />

      <LandingLocations locations={locations} />

      <LandingGallery websitePhotos={websitePhotos} />

      <LandingPromo
        tenant={tenant}
        promotions={promotions}
        slug={slug}
      />

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
