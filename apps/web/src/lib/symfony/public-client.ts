import { getSymfonyApiBaseUrl } from './api-base-url.ts'

export type SymfonyPublicApiErrorCode =
  | 'tenant_not_found'
  | 'http_error'
  | 'network_error'
  | 'invalid_response'

export class SymfonyPublicApiError extends Error {
  constructor(
    message: string,
    public readonly code: SymfonyPublicApiErrorCode,
    public readonly details: {
      status?: number
      url: string
      body?: string
      cause?: unknown
    },
  ) {
    super(message)
    this.name = 'SymfonyPublicApiError'
  }
}

export interface SymfonyTenantDto {
  id: string
  businessName: string
  slug: string
  timezone: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  tagline: string | null
  description: string | null
  heroImageUrl: string | null
  aboutTitle: string | null
  aboutText: string | null
  aboutImageUrl: string | null
  googleRating: number | null
  googleReviewsCount: number | null
  teamDescription: string | null
  locationsDescription: string | null
  contactPhone: string | null
  contactEmail: string | null
  socialLinks: {
    instagram?: string
    facebook?: string
    tiktok?: string
    whatsapp?: string
  }
}

export interface SymfonyLocationDto {
  id: string
  name: string
  address: string | null
  city: string | null
  zipCode: string | null
  phone: string | null
  email: string | null
  photoUrl: string | null
  photos: string[]
  latitude: string | null
  longitude: string | null
  timezone: string | null
}

export interface SymfonyServiceCategoryDto {
  id: string
  name: string
  displayOrder: number
}

export interface SymfonyServiceDto {
  id: string
  serviceCategory?: SymfonyServiceCategoryDto | string | null
  name: string
  description: string | null
  price: string
  durationMinutes: number
  category: string | null
  displayOrder: number
}

export interface SymfonyStaffMemberDto {
  id: string
  role: string
  bio: string | null
  photoUrl: string | null
  fullName: string | null
}

export interface SymfonyProductDto {
  id: string
  name: string
  brand: string | null
  description: string | null
  priceSell: string
  photoUrl: string | null
  category: string | null
  available: boolean
  isNew: boolean
}

export interface SymfonyGalleryPhotoDto {
  id: string
  photoUrl: string
  caption: string | null
  displayOrder: number
}

export interface SymfonyPortfolioPhotoDto {
  id: string
  photoUrl: string
  serviceTags: string
  displayOrder: number
}

export interface SymfonyWebsitePhotoDto {
  id: string
  url: string
  sortOrder: number | null
}

export interface SymfonyPromotionDto {
  id: string
  title: string
  description: string | null
  discountType: string
  discountValue: string | null
  validFrom: string
  validUntil: string | null
  displayOrder: number
}

export interface SymfonyPromotionServiceDto {
  id: string
  promotion: SymfonyPromotionDto | string
  service: SymfonyServiceDto | string
  discountType: string
  discountValue: string
}

export interface SymfonyPromotionProductDto {
  id: string
  promotion: SymfonyPromotionDto | string
  product: SymfonyProductDto | string
  discountType: string
  discountValue: string
}

export interface SymfonyPublicLandingData {
  tenant: SymfonyTenantDto
  locations: SymfonyLocationDto[]
  serviceCategories: SymfonyServiceCategoryDto[]
  services: SymfonyServiceDto[]
  staffMembers: SymfonyStaffMemberDto[]
  products: SymfonyProductDto[]
  galleryPhotos: SymfonyGalleryPhotoDto[]
  portfolioPhotos: SymfonyPortfolioPhotoDto[]
  websitePhotos: SymfonyWebsitePhotoDto[]
  promotions: SymfonyPromotionDto[]
  promotionServices: SymfonyPromotionServiceDto[]
  promotionProducts: SymfonyPromotionProductDto[]
}

type CollectionPayload<T> = T[] | { member?: T[]; 'hydra:member'?: T[] }

export function getSymfonyPublicApiBaseUrl(): string {
  return getSymfonyApiBaseUrl()
}

export async function fetchSymfonyPublicTenant(slug: string): Promise<SymfonyTenantDto> {
  return fetchSymfonyPublicJson<SymfonyTenantDto>(tenantPath(slug))
}

export async function fetchSymfonyPublicLocations(slug: string): Promise<SymfonyLocationDto[]> {
  return fetchSymfonyPublicCollection<SymfonyLocationDto>(tenantPath(slug, 'locations'))
}

export async function fetchSymfonyPublicServiceCategories(slug: string): Promise<SymfonyServiceCategoryDto[]> {
  return fetchSymfonyPublicCollection<SymfonyServiceCategoryDto>(tenantPath(slug, 'service-categories'))
}

export async function fetchSymfonyPublicServices(slug: string): Promise<SymfonyServiceDto[]> {
  return fetchSymfonyPublicCollection<SymfonyServiceDto>(tenantPath(slug, 'services'))
}

export async function fetchSymfonyPublicStaffMembers(slug: string): Promise<SymfonyStaffMemberDto[]> {
  return fetchSymfonyPublicCollection<SymfonyStaffMemberDto>(tenantPath(slug, 'staff-members'))
}

export async function fetchSymfonyPublicProducts(slug: string): Promise<SymfonyProductDto[]> {
  return fetchSymfonyPublicCollection<SymfonyProductDto>(tenantPath(slug, 'products'))
}

export async function fetchSymfonyPublicGalleryPhotos(slug: string): Promise<SymfonyGalleryPhotoDto[]> {
  return fetchSymfonyPublicCollection<SymfonyGalleryPhotoDto>(tenantPath(slug, 'gallery-photos'))
}

export async function fetchSymfonyPublicPortfolioPhotos(slug: string): Promise<SymfonyPortfolioPhotoDto[]> {
  return fetchSymfonyPublicCollection<SymfonyPortfolioPhotoDto>(tenantPath(slug, 'portfolio-photos'))
}

export async function fetchSymfonyPublicWebsitePhotos(slug: string): Promise<SymfonyWebsitePhotoDto[]> {
  return fetchSymfonyPublicCollection<SymfonyWebsitePhotoDto>(tenantPath(slug, 'website-photos'))
}

export async function fetchSymfonyPublicPromotions(slug: string): Promise<SymfonyPromotionDto[]> {
  return fetchSymfonyPublicCollection<SymfonyPromotionDto>(tenantPath(slug, 'promotions'))
}

export async function fetchSymfonyPublicPromotionServices(slug: string): Promise<SymfonyPromotionServiceDto[]> {
  return fetchSymfonyPublicCollection<SymfonyPromotionServiceDto>(tenantPath(slug, 'promotion-services'))
}

export async function fetchSymfonyPublicPromotionProducts(slug: string): Promise<SymfonyPromotionProductDto[]> {
  return fetchSymfonyPublicCollection<SymfonyPromotionProductDto>(tenantPath(slug, 'promotion-products'))
}

export async function fetchSymfonyPublicLandingData(slug: string): Promise<SymfonyPublicLandingData> {
  const [
    tenant,
    locations,
    serviceCategories,
    services,
    staffMembers,
    products,
    galleryPhotos,
    portfolioPhotos,
    websitePhotos,
    promotions,
    promotionServices,
    promotionProducts,
  ] = await Promise.all([
    fetchSymfonyPublicTenant(slug),
    fetchSymfonyPublicLocations(slug),
    fetchSymfonyPublicServiceCategories(slug),
    fetchSymfonyPublicServices(slug),
    fetchSymfonyPublicStaffMembers(slug),
    fetchSymfonyPublicProducts(slug),
    fetchSymfonyPublicGalleryPhotos(slug),
    fetchSymfonyPublicPortfolioPhotos(slug),
    fetchSymfonyPublicWebsitePhotos(slug),
    fetchSymfonyPublicPromotions(slug),
    fetchSymfonyPublicPromotionServices(slug),
    fetchSymfonyPublicPromotionProducts(slug),
  ])

  return {
    tenant,
    locations,
    serviceCategories,
    services,
    staffMembers,
    products,
    galleryPhotos,
    portfolioPhotos,
    websitePhotos,
    promotions,
    promotionServices,
    promotionProducts,
  }
}

async function fetchSymfonyPublicCollection<T>(path: string): Promise<T[]> {
  const payload = await fetchSymfonyPublicJson<CollectionPayload<T>>(path)
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.member)) return payload.member
  if (Array.isArray(payload['hydra:member'])) return payload['hydra:member']
  throw new SymfonyPublicApiError('Symfony public API returned an invalid collection payload.', 'invalid_response', {
    url: buildUrl(path),
  })
}

async function fetchSymfonyPublicJson<T>(path: string): Promise<T> {
  const url = buildUrl(path)
  let response: Response

  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })
  } catch (cause) {
    throw new SymfonyPublicApiError('Unable to reach Symfony public API.', 'network_error', { url, cause })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined)
    throw new SymfonyPublicApiError(
      response.status === 404 ? 'Tenant or public resource not found.' : 'Symfony public API request failed.',
      response.status === 404 ? 'tenant_not_found' : 'http_error',
      { status: response.status, url, body },
    )
  }

  try {
    return await response.json() as T
  } catch (cause) {
    throw new SymfonyPublicApiError('Symfony public API returned invalid JSON.', 'invalid_response', { url, cause })
  }
}

function tenantPath(slug: string, resource?: string): string {
  const encodedSlug = encodeURIComponent(slug.trim())
  return resource ? `/api/public/tenants/${encodedSlug}/${resource}` : `/api/public/tenants/${encodedSlug}`
}

function buildUrl(path: string): string {
  return `${getSymfonyPublicApiBaseUrl()}${path}`
}
