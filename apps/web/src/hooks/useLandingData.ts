'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  LandingData,
  LandingLocation,
  LandingProduct,
  LandingService,
  LandingStaffMember,
  LandingTenant,
} from '@/types/landing'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseLandingDataResult {
  data: LandingData | null
  isLoading: boolean
  error: Error | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  const s = raw as Record<string, unknown>
  const about = s.about && typeof s.about === 'object'
    ? (s.about as Record<string, unknown>)
    : {}
  const socialLinks = s.social_links && typeof s.social_links === 'object'
    ? (s.social_links as Record<string, unknown>)
    : {}

  return {
    tagline: typeof s.tagline === 'string' ? s.tagline : null,
    description: typeof s.bio === 'string' ? s.bio : null,
    hero_image_url: typeof s.hero_image_url === 'string' ? s.hero_image_url : null,
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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Recupera tutti i dati pubblici della landing page di un tenant in due fasi:
 * 1. Fetch del tenant per ottenere tenant_id
 * 2. Fetch parallelo di locations, staff, services, products, foto hero
 *
 * Usa il client browser (anon key) — richiede policy RLS che permettano
 * letture pubbliche sulle tabelle tenant, locations, staff_members,
 * services, products, website_photos.
 *
 * Per la landing page server-rendered, preferire le server actions in
 * `lib/actions/public-booking.ts` che usano il client admin.
 */
export function useLandingData(slug: string): UseLandingDataResult {
  const [data, setData] = useState<LandingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const slugRef = useRef(slug)
  slugRef.current = slug

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function fetchAll() {
      setIsLoading(true)
      setError(null)

      try {
        // ── Stage 1: tenant ────────────────────────────────────────────────
        const { data: tenantRow, error: tenantErr } = await supabase
          .from('tenants')
          .select(
            'id, business_name, slug, logo_url, primary_color, secondary_color, font_family, settings',
          )
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle()

        if (cancelled) return

        if (tenantErr || !tenantRow) {
          throw Object.assign(new Error('TENANT_NOT_FOUND'), { code: 'TENANT_NOT_FOUND' })
        }

        const tenantId: string = tenantRow.id
        const settings = parseSettings(tenantRow.settings)

        // ── Stage 2: parallel ─────────────────────────────────────────────
        const [locRes, staffRes, svcRes, productRes, photoRes] = await Promise.all([

          // Locations
          supabase
            .from('locations')
            .select(
              'id, name, address, city, zip_code, phone, email, latitude, longitude, photo_url, photos',
            )
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('show_on_website', true)
            .order('created_at', { ascending: true }),

          // Staff con join profiles
          supabase
            .from('staff_members')
            .select(
              'id, bio, photo_url, role, profiles!profile_id(full_name, avatar_url)',
            )
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('show_on_website', true)
            .is('deleted_at', null)
            .order('created_at', { ascending: true }),

          // Services
          supabase
            .from('services')
            .select(
              'id, name, description, price, duration_minutes, category, display_order, color',
            )
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('show_on_website', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true }),

          // Products (solo show_on_site = true) con inventory per sede
          supabase
            .from('products')
            .select(
              'id, name, brand, price_sell, photo_url, category, description, display_order, product_inventory(quantity)',
            )
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
            .eq('show_on_site', true)
            .order('display_order', { ascending: true })
            .order('name', { ascending: true }),

          // Prima foto hero dal sito
          supabase
            .from('website_photos')
            .select('url, sort_order')
            .eq('tenant_id', tenantId)
            .order('sort_order', { ascending: true })
            .limit(1),
        ])

        if (cancelled) return

        // ── Mapping locations ──────────────────────────────────────────────
        const locations: LandingLocation[] = (locRes.data ?? []).map((loc) => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          zip_code: loc.zip_code,
          phone: loc.phone,
          email: loc.email,
          latitude: loc.latitude,
          longitude: loc.longitude,
          photo_url: loc.photo_url,
          photos: Array.isArray(loc.photos) ? (loc.photos as string[]) : [],
        }))

        // ── Mapping staff ──────────────────────────────────────────────────
        const staff: LandingStaffMember[] = (staffRes.data ?? []).map((member) => {
          const profile = (member as Record<string, unknown>).profiles as
            | Record<string, unknown>
            | null
          const fullName =
            typeof profile?.full_name === 'string' ? profile.full_name : 'Barbiere'
          const avatarUrl =
            typeof profile?.avatar_url === 'string' ? profile.avatar_url : null
          return {
            id: member.id,
            full_name: fullName,
            photo_url: member.photo_url ?? avatarUrl,
            role: (member as Record<string, unknown>).role as string ?? 'staff',
            bio: member.bio,
          }
        })

        // ── Mapping services ───────────────────────────────────────────────
        const services: LandingService[] = (svcRes.data ?? []).map((svc) => ({
          id: svc.id,
          name: svc.name,
          description: svc.description,
          price: Number(svc.price ?? 0),
          duration_minutes: Number(svc.duration_minutes ?? 0),
          category: svc.category,
          display_order: Number(svc.display_order ?? 0),
          color: svc.color,
        }))

        // ── Mapping products ───────────────────────────────────────────────
        const products: LandingProduct[] = (productRes.data ?? []).map((row) => {
          const p = row as Record<string, unknown>
          const invRaw = p.product_inventory
          const available = Array.isArray(invRaw)
            ? invRaw.some((invRow: unknown) => {
                const inv = invRow as Record<string, unknown>
                return Number(inv.quantity ?? 0) > 0
              })
            : false

          return {
            id: p.id as string,
            name: p.name as string,
            brand: (p.brand as string | null) ?? null,
            category: (p.category as string | null) ?? null,
            price_sell: Number(p.price_sell ?? 0),
            photo_url: (p.photo_url as string | null) ?? null,
            description: (p.description as string | null) ?? null,
            display_order: Number(p.display_order ?? 0),
            available,
          }
        })

        // ── Hero image ─────────────────────────────────────────────────────
        const firstWebPhoto =
          (photoRes.data?.[0] as Record<string, unknown> | undefined)?.url as string | null ?? null
        const heroImageUrl =
          settings.hero_image_url ?? firstWebPhoto ?? locations[0]?.photo_url ?? null

        // ── Tenant ─────────────────────────────────────────────────────────
        const tenant: LandingTenant = {
          id: tenantRow.id,
          business_name: tenantRow.business_name,
          slug: tenantRow.slug,
          logo_url: tenantRow.logo_url,
          primary_color: tenantRow.primary_color ?? '#1a1a1a',
          secondary_color: tenantRow.secondary_color ?? '#666666',
          font_family: tenantRow.font_family ?? 'inter',
          tagline: settings.tagline,
          description: settings.description,
          hero_image_url: heroImageUrl,
          about_title: settings.about_title,
          about_text: settings.about_text,
          about_image_url: settings.about_image_url,
          google_rating: settings.google_rating,
          google_reviews_count: settings.google_reviews_count,
          team_description: settings.team_description ?? null,
          locations_description: settings.locations_description ?? null,
          contact_phone: settings.contact_phone ?? null,
          contact_email: settings.contact_email ?? null,
          social_links: settings.social_links,
        }

        // ── Section flags ──────────────────────────────────────────────────
        const sections = {
          showAbout: Boolean(tenant.about_text?.trim()),
          showTeam: staff.length > 1,
          showProducts: products.length > 0,
          showPortfolio: false,
          multipleLocations: locations.length > 1,
        }

        setData({ tenant, locations, staff, services, products, sections })
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Errore caricamento dati landing'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void fetchAll()
    return () => {
      cancelled = true
    }
  }, [slug])

  return { data, isLoading, error }
}
