import type { SymfonyPublicLandingData } from './public-client.ts'
import type {
  LandingData,
  LandingLocation,
  LandingProduct,
  LandingSections,
  LandingService,
  LandingStaffMember,
  LandingTenant,
} from '../../types/landing.ts'

export interface LandingWebsitePhoto {
  id: string
  url: string
}

export interface LandingPageData extends LandingData {
  websitePhotos: LandingWebsitePhoto[]
}

export function mapSymfonyLandingPageData(symfonyData: SymfonyPublicLandingData): LandingPageData {
  const websitePhotos: LandingWebsitePhoto[] = symfonyData.websitePhotos
    .slice(0, 9)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
    }))

  const locations: LandingLocation[] = symfonyData.locations.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    city: location.city,
    zip_code: location.zipCode,
    phone: location.phone,
    email: location.email,
    latitude: parseNullableNumber(location.latitude),
    longitude: parseNullableNumber(location.longitude),
    photo_url: location.photoUrl,
    photos: location.photos.length
      ? location.photos
      : location.photoUrl
        ? [location.photoUrl]
        : [],
  }))

  const staff: LandingStaffMember[] = symfonyData.staffMembers.map((staffMember) => ({
    id: staffMember.id,
    full_name: staffMember.fullName?.trim() || 'Barbiere',
    photo_url: staffMember.photoUrl,
    role: staffMember.role || 'staff',
    bio: staffMember.bio,
  }))

  const services: LandingService[] = symfonyData.services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price ?? 0),
    duration_minutes: Number(service.durationMinutes ?? 0),
    category: service.category,
  }))

  const products: LandingProduct[] = symfonyData.products.map((product) => ({
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price_sell: Number(product.priceSell ?? 0),
    photo_url: product.photoUrl,
    description: product.description,
    available: product.available,
  }))

  const heroImageUrl =
    symfonyData.tenant.heroImageUrl
    ?? websitePhotos[0]?.url
    ?? locations[0]?.photo_url
    ?? null

  const tenant: LandingTenant = {
    id: symfonyData.tenant.id,
    business_name: symfonyData.tenant.businessName,
    slug: symfonyData.tenant.slug,
    logo_url: symfonyData.tenant.logoUrl,
    primary_color: symfonyData.tenant.primaryColor ?? '#1a1a1a',
    secondary_color: symfonyData.tenant.secondaryColor ?? '#666666',
    font_family: symfonyData.tenant.fontFamily ?? 'outfit',
    tagline: symfonyData.tenant.tagline,
    description: symfonyData.tenant.description,
    hero_image_url: heroImageUrl,
    about_title: symfonyData.tenant.aboutTitle,
    about_text: symfonyData.tenant.aboutText,
    about_image_url: symfonyData.tenant.aboutImageUrl,
    google_rating: symfonyData.tenant.googleRating,
    google_reviews_count: symfonyData.tenant.googleReviewsCount,
    team_description: symfonyData.tenant.teamDescription,
    locations_description: symfonyData.tenant.locationsDescription,
    contact_phone: symfonyData.tenant.contactPhone,
    contact_email: symfonyData.tenant.contactEmail,
    social_links: symfonyData.tenant.socialLinks ?? {},
  }

  const sections: LandingSections = {
    showAbout: Boolean(tenant.about_text?.trim()),
    showTeam: staff.length > 1,
    showProducts: products.length > 0,
    showPortfolio: websitePhotos.length > 0,
    multipleLocations: locations.length > 1,
  }

  return {
    tenant,
    locations,
    staff,
    services,
    products,
    websitePhotos,
    sections,
  }
}

function parseNullableNumber(value: string | null): number | null {
  if (value == null || value.trim() === '') return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
