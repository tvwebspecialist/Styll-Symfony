import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import {
  getPublicServices,
  getPublicLocations,
  getPublicWebsitePhotos,
  getPublicTeam,
  getPublicProducts,
  getPublicPortfolioPhotos,
} from '@/lib/actions/public-booking'
import type {
  LandingTenant,
  LandingLocation,
  LandingStaffMember,
  LandingService,
  LandingProduct,
  LandingSections,
} from '@/types/landing'
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
import LandingInstallBanner from '@/components/landing/LandingInstallBanner'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tenantRow = await getTenantBySlug(slug)
  if (!tenantRow || tenantRow.status !== 'active') return {}

  const [websitePhotos, locations] = await Promise.all([
    getPublicWebsitePhotos(tenantRow.tenant_id),
    getPublicLocations(tenantRow.tenant_id),
  ])

  const heroImage = websitePhotos[0]?.url ?? locations[0]?.photo_url ?? null

  return {
    openGraph: {
      title: tenantRow.business_name,
      description: `Prenota online da ${tenantRow.business_name}`,
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
  const tenantRow = await getTenantBySlug(slug)

  if (!tenantRow || tenantRow.status !== 'active') {
    notFound()
  }

  const [rawServices, rawLocations, websitePhotos, rawTeam, rawProducts, portfolioPhotos] = await Promise.all([
    getPublicServices(tenantRow.tenant_id),
    getPublicLocations(tenantRow.tenant_id),
    getPublicWebsitePhotos(tenantRow.tenant_id),
    getPublicTeam(tenantRow.tenant_id),
    getPublicProducts(tenantRow.tenant_id),
    getPublicPortfolioPhotos(tenantRow.tenant_id),
  ])

  // ── Settings parsing ──────────────────────────────────────────────────────
  const s = tenantRow.settings ?? {}
  const about = (s.about && typeof s.about === 'object' ? s.about : {}) as Record<string, unknown>
  const socialLinks = (s.social_links && typeof s.social_links === 'object' ? s.social_links : {}) as Record<string, unknown>

  // ── Build LandingTenant ───────────────────────────────────────────────────
  const heroImageUrl: string | null =
    (typeof s.hero_image_url === 'string' ? s.hero_image_url : null) ??
    websitePhotos[0]?.url ??
    rawLocations[0]?.photo_url ??
    null

  const tenant: LandingTenant = {
    id: tenantRow.tenant_id,
    business_name: tenantRow.business_name,
    slug,
    logo_url: tenantRow.logo_url,
    primary_color: tenantRow.primary_color ?? '#1a1a1a',
    secondary_color: tenantRow.secondary_color ?? '#666666',
    font_family: tenantRow.font_family ?? 'outfit',
    tagline: typeof s.tagline === 'string' ? s.tagline : null,
    description: typeof s.bio === 'string' ? s.bio : null,
    hero_image_url: heroImageUrl,
    about_title: typeof about.title === 'string' ? about.title : null,
    about_text: typeof about.text === 'string' ? about.text : null,
    about_image_url: typeof about.image_url === 'string' ? about.image_url : null,
    google_rating: typeof s.google_rating === 'number' ? s.google_rating : null,
    google_reviews_count: typeof s.google_reviews_count === 'number' ? s.google_reviews_count : null,
    team_description: typeof s.team_description === 'string' ? s.team_description : null,
    locations_description: typeof s.locations_description === 'string' ? s.locations_description : null,
    contact_phone: typeof s.contact_phone === 'string' ? s.contact_phone : null,
    contact_email: typeof s.contact_email === 'string' ? s.contact_email : null,
    social_links: {
      instagram: typeof socialLinks.instagram === 'string' ? socialLinks.instagram : undefined,
      facebook: typeof socialLinks.facebook === 'string' ? socialLinks.facebook : undefined,
      tiktok: typeof socialLinks.tiktok === 'string' ? socialLinks.tiktok : undefined,
      whatsapp: typeof socialLinks.whatsapp === 'string' ? socialLinks.whatsapp : undefined,
    },
  }

  // ── Build typed arrays ────────────────────────────────────────────────────
  const locations: LandingLocation[] = rawLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    address: loc.address ?? null,
    city: loc.city ?? null,
    zip_code: null,
    phone: loc.phone ?? null,
    email: loc.email ?? null,
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    photo_url: loc.photo_url ?? null,
    photos: Array.isArray(loc.photos) ? (loc.photos as string[]) : [],
  }))

  const staff: LandingStaffMember[] = rawTeam.map((m) => ({
    id: m.id,
    full_name: m.full_name ?? 'Barbiere',
    photo_url: m.photo_url,
    role: m.role,
    bio: m.bio,
  }))

  const services: LandingService[] = rawServices.map((svc) => ({
    id: svc.id,
    name: svc.name,
    description: svc.description ?? null,
    price: Number(svc.price ?? 0),
    duration_minutes: Number(svc.duration_minutes ?? 0),
    category: svc.category ?? null,
    display_order: Number(svc.display_order ?? 0),
    color: svc.color ?? null,
  }))

  const products: LandingProduct[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    price_sell: Number(p.price_sell ?? 0),
    photo_url: p.photo_url ?? null,
    description: p.description ?? null,
    display_order: Number(p.display_order ?? 0),
  }))

  // ── Section flags ─────────────────────────────────────────────────────────
  const sections: LandingSections = {
    showAbout: Boolean(tenant.about_text?.trim()),
    showTeam: staff.length > 1,
    showProducts: products.length > 0,
    showPortfolio: portfolioPhotos.length > 0,
    multipleLocations: locations.length > 1,
  }

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
            <LandingGallery websitePhotos={portfolioPhotos.map((p) => ({
              id: p.id,
              url: p.photo_url,
              sort_order: p.display_order,
            }))} />
          </AnimatedSection>
        )}

        {/* PWA CTA — slides up */}
        <AnimatedSection direction="up">
          <LandingPWACta tenant={tenant} />
        </AnimatedSection>

        {/* Footer — fade only, no movement */}
        <AnimatedSection direction="none">
          <LandingFooter tenant={tenant} locations={locations} />
        </AnimatedSection>

      </LandingLayout>

      <LandingInstallBanner
        tenantName={tenant.business_name}
        logoUrl={tenant.logo_url}
        primaryColor={tenant.primary_color}
      />
    </>
  )
}
