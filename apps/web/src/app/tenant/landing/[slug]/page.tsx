import { notFound } from 'next/navigation'
import { getLandingDataSymfony, type LandingPageData } from '@/hooks/useLandingDataSymfony'
import AnimatedSection from '@/components/landing/AnimatedSection'
import LandingLayout from '@/components/landing/LandingLayout'
import LandingNavbar from '@/components/landing/LandingNavbar'
import LandingHero from '@/components/landing/LandingHero'
import LandingAbout from '@/components/landing/LandingAbout'
import LandingTeam from '@/components/landing/LandingTeam'
import LandingLocations from '@/components/landing/LandingLocations'
import LandingServices from '@/components/landing/LandingServices'
import LandingProducts from '@/components/landing/LandingProducts'
import LandingGallery from '@/components/landing/LandingGallery'
import LandingPWACta from '@/components/landing/LandingPWACta'
import LandingFooter from '@/components/landing/LandingFooter'
import { createTenantSurfacePaths } from '@/lib/pwa-redirect'
import { SymfonyPublicApiError } from '@/lib/symfony/public-client'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params
  let landingData: LandingPageData

  try {
    landingData = await getLandingDataSymfony(slug)
  } catch (error) {
    if (error instanceof SymfonyPublicApiError && error.code === 'tenant_not_found') {
      notFound()
    }

    throw error
  }

  const { tenant, locations, staff, services, products, websitePhotos, sections } = landingData
  const landingPath = await createTenantSurfacePaths('landing', slug)

  return (
    <>
      {/* Hero scroll-indicator bounce + reduced-motion guard */}
      <style>{`
        @keyframes lpBounce {
          0%, 100% { transform: translateY(0) translateX(-50%); }
          50%       { transform: translateY(6px) translateX(-50%); }
        }
        .lp-scroll-indicator { animation: lpBounce 1.8s ease-in-out infinite; }

        @media (max-width: 600px) { .lp-hero-stats { display: none !important; } }

        @media (prefers-reduced-motion: reduce) {
          .lp-scroll-indicator { animation: none; }
        }
      `}</style>

      {/* Navbar sits outside LandingLayout so it's never inside the animated main */}
      <LandingNavbar tenant={tenant} sections={sections} />

      {/* LandingLayout initialises Lenis and wraps <main> */}
      <LandingLayout>

        {/* Hero — no animation, already above the fold */}
        <LandingHero tenant={tenant} />

        {/* Team — internal AnimatedSection + AnimatedList */}
        {sections.showTeam && (
          <LandingTeam
            staff={staff}
            teamDescription={tenant.team_description}
            googleRating={tenant.google_rating}
          />
        )}

        {/* About — slides up */}
        {sections.showAbout && (
          <AnimatedSection direction="up">
            <LandingAbout tenant={tenant} />
          </AnimatedSection>
        )}

        {/* Locations — single wraps its own AnimatedSection; multi handles sticky internally */}
        <LandingLocations
          locations={locations}
          isMultiple={sections.multipleLocations}
          locationsDescription={tenant.locations_description}
          primaryColor={tenant.primary_color}
        />

        {/* Services — internal AnimatedSection + AnimatedList */}
        <LandingServices tenant={tenant} services={services} />

        {/* Products — slides up */}
        {sections.showProducts && (
          <AnimatedSection direction="up">
            <LandingProducts tenant={tenant} products={products} />
          </AnimatedSection>
        )}

        {/* Portfolio — visible only when photos exist */}
        {sections.showPortfolio && (
          <AnimatedSection direction="up">
            <LandingGallery websitePhotos={websitePhotos} />
          </AnimatedSection>
        )}

        {/* PWA CTA — slides up */}
        <AnimatedSection direction="up">
          <LandingPWACta tenant={tenant} />
        </AnimatedSection>

        {/* Footer — fade only, no movement */}
        <AnimatedSection direction="none">
          <LandingFooter
            cookiePath={landingPath('/cookie')}
            tenant={tenant}
            locations={locations}
          />
        </AnimatedSection>

      </LandingLayout>

    </>
  )
}
