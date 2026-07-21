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

export interface SupabaseLandingTenantFallback {
  tenant_id: string
  slug: string
  business_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  font_family: string | null
  status: string
  settings: Record<string, unknown> | null
}

export interface SupabaseLandingLocationFallback {
  id: string
  photo_url: string | null
  photos: string[]
}

export interface SupabaseLandingStaffFallback {
  id: string
  role: string
  photo_url: string | null
}

export interface SupabaseLandingProductFallback {
  id: string
  description: string | null
  available: boolean
  photo_url: string | null
  brand: string | null
  category: string | null
}

interface ParsedSettings {
  tagline: string | null
  description: string | null
  hero_image_url: string | null
  about_title: string | null
  about_text: string | null
  about_image_url: string | null
  google_rating: number | null
  google_reviews_count: number | null
  team_description: string | null
  locations_description: string | null
  contact_phone: string | null
  contact_email: string | null
  social_links: {
    instagram?: string
    facebook?: string
    tiktok?: string
    whatsapp?: string
  }
}

interface MapSymfonyLandingPageDataInput {
  symfonyData: SymfonyPublicLandingData
  tenantFallback: SupabaseLandingTenantFallback
  locationFallbacks: SupabaseLandingLocationFallback[]
  staffFallbacks: SupabaseLandingStaffFallback[]
  productFallbacks: SupabaseLandingProductFallback[]
}

export function mapSymfonyLandingPageData({
  symfonyData,
  tenantFallback,
  locationFallbacks,
  staffFallbacks,
  productFallbacks,
}: MapSymfonyLandingPageDataInput): LandingPageData {
  const settings = parseSettings(tenantFallback.settings)
  const locationMap = new Map(locationFallbacks.map((location) => [location.id, location]))
  const staffMap = new Map(staffFallbacks.map((staffMember) => [staffMember.id, staffMember]))
  const productMap = new Map(productFallbacks.map((product) => [product.id, product]))

  const websitePhotos: LandingWebsitePhoto[] = symfonyData.websitePhotos
    .slice(0, 9)
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
    }))

  const locations: LandingLocation[] = symfonyData.locations.map((location) => {
    const fallback = locationMap.get(location.id)
    const photoUrl = fallback?.photo_url ?? null

    return {
      id: location.id,
      name: location.name,
      address: location.address,
      city: location.city,
      zip_code: location.zipCode,
      phone: location.phone,
      email: location.email,
      latitude: parseNullableNumber(location.latitude),
      longitude: parseNullableNumber(location.longitude),
      photo_url: photoUrl,
      photos: fallback?.photos.length
        ? fallback.photos
        : photoUrl
          ? [photoUrl]
          : [],
    }
  })

  const staff: LandingStaffMember[] = symfonyData.staffMembers.map((staffMember) => {
    const fallback = staffMap.get(staffMember.id)

    return {
      id: staffMember.id,
      full_name: staffMember.fullName?.trim() || 'Barbiere',
      photo_url: staffMember.photoUrl ?? fallback?.photo_url ?? null,
      role: fallback?.role ?? 'staff',
      bio: staffMember.bio,
    }
  })

  const services: LandingService[] = symfonyData.services.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    price: Number(service.price ?? 0),
    duration_minutes: Number(service.durationMinutes ?? 0),
    category: service.category,
  }))

  const products: LandingProduct[] = symfonyData.products.map((product) => {
    const fallback = productMap.get(product.id)

    return {
      id: product.id,
      name: product.name,
      brand: product.brand ?? fallback?.brand ?? null,
      category: product.category ?? fallback?.category ?? null,
      price_sell: Number(product.priceSell ?? 0),
      photo_url: product.photoUrl ?? fallback?.photo_url ?? null,
      description: fallback?.description ?? null,
      available: fallback?.available ?? false,
    }
  })

  const heroImageUrl =
    settings.hero_image_url
    ?? websitePhotos[0]?.url
    ?? locations[0]?.photo_url
    ?? null

  const tenant: LandingTenant = {
    id: symfonyData.tenant.id || tenantFallback.tenant_id,
    business_name: symfonyData.tenant.businessName || tenantFallback.business_name,
    slug: symfonyData.tenant.slug || tenantFallback.slug,
    logo_url: symfonyData.tenant.logoUrl ?? tenantFallback.logo_url,
    primary_color: symfonyData.tenant.primaryColor ?? tenantFallback.primary_color ?? '#1a1a1a',
    secondary_color: symfonyData.tenant.secondaryColor ?? tenantFallback.secondary_color ?? '#666666',
    font_family: tenantFallback.font_family ?? symfonyData.tenant.fontFamily ?? 'outfit',
    tagline: settings.tagline,
    description: settings.description,
    hero_image_url: heroImageUrl,
    about_title: settings.about_title,
    about_text: settings.about_text,
    about_image_url: settings.about_image_url,
    google_rating: settings.google_rating,
    google_reviews_count: settings.google_reviews_count,
    team_description: settings.team_description,
    locations_description: settings.locations_description,
    contact_phone: settings.contact_phone,
    contact_email: settings.contact_email,
    social_links: settings.social_links,
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

function parseSettings(raw: unknown): ParsedSettings {
  const fallback: ParsedSettings = {
    tagline: null,
    description: null,
    hero_image_url: null,
    about_title: null,
    about_text: null,
    about_image_url: null,
    google_rating: null,
    google_reviews_count: null,
    team_description: null,
    locations_description: null,
    contact_phone: null,
    contact_email: null,
    social_links: {},
  }

  if (!raw || typeof raw !== 'object') return fallback

  const settings = raw as Record<string, unknown>
  const about = settings.about && typeof settings.about === 'object'
    ? settings.about as Record<string, unknown>
    : {}
  const socialLinks = settings.social_links && typeof settings.social_links === 'object'
    ? settings.social_links as Record<string, unknown>
    : {}

  return {
    tagline: typeof settings.tagline === 'string' ? settings.tagline : null,
    description: typeof settings.bio === 'string' ? settings.bio : null,
    hero_image_url: typeof settings.hero_image_url === 'string' ? settings.hero_image_url : null,
    about_title: typeof about.title === 'string' ? about.title : null,
    about_text: typeof about.text === 'string' ? about.text : null,
    about_image_url: typeof about.image_url === 'string' ? about.image_url : null,
    google_rating: typeof settings.google_rating === 'number' ? settings.google_rating : null,
    google_reviews_count: typeof settings.google_reviews_count === 'number' ? settings.google_reviews_count : null,
    team_description: typeof settings.team_description === 'string' ? settings.team_description : null,
    locations_description: typeof settings.locations_description === 'string' ? settings.locations_description : null,
    contact_phone: typeof settings.contact_phone === 'string' ? settings.contact_phone : null,
    contact_email: typeof settings.contact_email === 'string' ? settings.contact_email : null,
    social_links: {
      instagram: typeof socialLinks.instagram === 'string' ? socialLinks.instagram : undefined,
      facebook: typeof socialLinks.facebook === 'string' ? socialLinks.facebook : undefined,
      tiktok: typeof socialLinks.tiktok === 'string' ? socialLinks.tiktok : undefined,
      whatsapp: typeof socialLinks.whatsapp === 'string' ? socialLinks.whatsapp : undefined,
    },
  }
}
