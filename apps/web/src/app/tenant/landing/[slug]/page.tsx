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
import LandingFooter from '@/components/landing/LandingFooter'
import LandingInstallBanner from '@/components/landing/LandingInstallBanner'

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

const darkVars: CSSProperties = {
  '--landing-bg': '#0a0a0a',
  '--landing-surface': '#141414',
  '--landing-border': 'rgba(255,255,255,0.08)',
  '--landing-text-primary': '#ffffff',
  '--landing-text-muted': 'rgba(255,255,255,0.55)',
  '--landing-text-dim': 'rgba(255,255,255,0.30)',
} as CSSProperties

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
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out both;
        }
      `}</style>

      <div style={darkVars}>
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
      </div>
    </>
  )
}
