/**
 * Tipi TypeScript per i dati della landing page pubblica del barbiere.
 *
 * Mappatura schema DB reale:
 * - I campi tenant come tagline, description, social_links ecc. vengono estratti
 *   dal JSONB `tenants.settings` — non sono colonne dirette.
 * - staff_members non ha `specialization` né `display_order`: il campo `role`
 *   viene esposto e l'ordinamento avviene per `created_at`.
 * - `hero_image_url` è derivato da `website_photos` o da `settings.hero_image_url`.
 */

export interface LandingTenant {
  id: string
  business_name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  font_family: string
  /** Da settings.tagline */
  tagline: string | null
  /** Da settings.bio — testo breve hero */
  description: string | null
  /** Da website_photos[0].url o settings.hero_image_url */
  hero_image_url: string | null
  /** Da settings.about.title */
  about_title: string | null
  /** Da settings.about.text */
  about_text: string | null
  /** Da settings.about.image_url */
  about_image_url: string | null
  /** Da settings.google_rating */
  google_rating: number | null
  /** Da settings.google_reviews_count */
  google_reviews_count: number | null
  /** Da settings.team_description */
  team_description: string | null
  /** Da settings.locations_description */
  locations_description: string | null
  /** Da settings.contact_phone */
  contact_phone: string | null
  /** Da settings.contact_email */
  contact_email: string | null
  /** Da settings.social_links */
  social_links: {
    instagram?: string
    facebook?: string
    tiktok?: string
    whatsapp?: string
  }
}

export interface LandingLocation {
  id: string
  name: string
  address: string | null
  city: string | null
  zip_code: string | null
  phone: string | null
  email: string | null
  latitude: number | null
  longitude: number | null
  photo_url: string | null
  photos: string[]
}

export interface LandingStaffMember {
  id: string
  /** Da profiles.full_name, fallback "Barbiere" */
  full_name: string
  /** Da staff_members.photo_url, fallback profiles.avatar_url */
  photo_url: string | null
  role: string
  bio: string | null
}

export interface LandingService {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  display_order: number
  color: string | null
}

export interface LandingProduct {
  id: string
  name: string
  brand: string | null
  price_sell: number
  photo_url: string | null
  description: string | null
  display_order: number
}

export interface LandingSections {
  /** true se tenant.about_text non è null/vuoto */
  showAbout: boolean
  /** true se staff attivi con show_on_website > 1 */
  showTeam: boolean
  /** true se almeno 1 prodotto con show_on_site = true */
  showProducts: boolean
  /** true se locations.length > 1 */
  multipleLocations: boolean
}

export interface LandingData {
  tenant: LandingTenant
  locations: LandingLocation[]
  staff: LandingStaffMember[]
  services: LandingService[]
  products: LandingProduct[]
  sections: LandingSections
}
