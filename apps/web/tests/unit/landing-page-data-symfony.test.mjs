import test from 'node:test'
import assert from 'node:assert/strict'

import { mapSymfonyLandingPageData } from '../../src/lib/symfony/landing-page-data.ts'

test('mapSymfonyLandingPageData keeps the landing shape using Symfony as the only source', () => {
  const result = mapSymfonyLandingPageData({
    tenant: {
      id: 'tenant-symfony',
      businessName: 'Symfony Barber',
      slug: 'symfony-barber',
      timezone: 'Europe/Rome',
      logoUrl: 'https://cdn.example.test/logo.png',
      primaryColor: '#123456',
      secondaryColor: '#654321',
      fontFamily: 'Outfit',
      tagline: 'Barberia di quartiere',
      description: 'Fade, barba e trattamenti su misura.',
      heroImageUrl: null,
      aboutTitle: 'Chi siamo',
      aboutText: 'Team specializzato in tagli moderni.',
      aboutImageUrl: 'https://cdn.example.test/about.jpg',
      googleRating: 4.9,
      googleReviewsCount: 128,
      teamDescription: 'Professionisti dedicati.',
      locationsDescription: 'Due sedi nel cuore di Milano.',
      contactPhone: '+3902000000',
      contactEmail: 'ciao@example.test',
      socialLinks: {
        instagram: 'https://instagram.com/styll',
        whatsapp: '+39 333 000 0000',
      },
    },
    locations: [
      {
        id: 'loc-1',
        name: 'Sede Centro',
        address: 'Via Roma 1',
        city: 'Milano',
        zipCode: '20100',
        phone: '+3902111111',
        email: 'centro@example.test',
        photoUrl: 'https://cdn.example.test/location-1-cover.jpg',
        photos: ['https://cdn.example.test/location-1-gallery.jpg'],
        latitude: '45.4642',
        longitude: '9.19',
        timezone: 'Europe/Rome',
      },
      {
        id: 'loc-2',
        name: 'Sede Navigli',
        address: 'Via Navigli 9',
        city: 'Milano',
        zipCode: '20144',
        phone: null,
        email: null,
        photoUrl: null,
        photos: [],
        latitude: null,
        longitude: null,
        timezone: 'Europe/Rome',
      },
    ],
    serviceCategories: [],
    services: [
      {
        id: 'svc-1',
        name: 'Taglio',
        description: 'Taglio classico',
        price: '25.00',
        durationMinutes: 30,
        category: 'Hair',
        displayOrder: 1,
      },
    ],
    staffMembers: [
      {
        id: 'staff-1',
        role: 'owner',
        fullName: 'Mario Rossi',
        bio: 'Barber senior',
        photoUrl: 'https://cdn.example.test/staff-1.jpg',
      },
      {
        id: 'staff-2',
        role: 'manager',
        fullName: null,
        bio: null,
        photoUrl: 'https://cdn.example.test/staff-2.jpg',
      },
    ],
    products: [
      {
        id: 'prod-1',
        name: 'Pomade',
        brand: 'Styll Lab',
        description: 'Tenuta forte e finish opaco.',
        priceSell: '19.90',
        photoUrl: 'https://cdn.example.test/product.jpg',
        category: 'Care',
        available: true,
        isNew: true,
      },
    ],
    galleryPhotos: [],
    portfolioPhotos: [],
    websitePhotos: [
      {
        id: 'web-1',
        url: 'https://cdn.example.test/website.jpg',
        sortOrder: 1,
      },
    ],
    promotions: [],
    promotionServices: [],
    promotionProducts: [],
  })

  assert.equal(result.tenant.id, 'tenant-symfony')
  assert.equal(result.tenant.business_name, 'Symfony Barber')
  assert.equal(result.tenant.tagline, 'Barberia di quartiere')
  assert.equal(result.tenant.description, 'Fade, barba e trattamenti su misura.')
  assert.equal(result.tenant.hero_image_url, 'https://cdn.example.test/website.jpg')
  assert.equal(result.tenant.about_text, 'Team specializzato in tagli moderni.')
  assert.equal(result.tenant.social_links.instagram, 'https://instagram.com/styll')
  assert.equal(result.tenant.social_links.whatsapp, '+39 333 000 0000')

  assert.equal(result.locations[0]?.photo_url, 'https://cdn.example.test/location-1-cover.jpg')
  assert.deepEqual(result.locations[0]?.photos, ['https://cdn.example.test/location-1-gallery.jpg'])
  assert.equal(result.locations[0]?.latitude, 45.4642)
  assert.equal(result.locations[0]?.longitude, 9.19)

  assert.equal(result.staff[0]?.role, 'owner')
  assert.equal(result.staff[0]?.photo_url, 'https://cdn.example.test/staff-1.jpg')
  assert.equal(result.staff[1]?.full_name, 'Barbiere')

  assert.equal(result.products[0]?.description, 'Tenuta forte e finish opaco.')
  assert.equal(result.products[0]?.available, true)
  assert.equal(result.products[0]?.brand, 'Styll Lab')
  assert.equal(result.products[0]?.category, 'Care')

  assert.equal(result.sections.showAbout, true)
  assert.equal(result.sections.showTeam, true)
  assert.equal(result.sections.showProducts, true)
  assert.equal(result.sections.showPortfolio, true)
  assert.equal(result.sections.multipleLocations, true)
  assert.equal(result.websitePhotos.length, 1)
})

test('mapSymfonyLandingPageData falls back to location photoUrl when tenant hero and location gallery are missing', () => {
  const result = mapSymfonyLandingPageData({
    tenant: {
      id: 'tenant',
      businessName: 'Single Seat',
      slug: 'single-seat',
      timezone: 'Europe/Rome',
      logoUrl: null,
      primaryColor: null,
      secondaryColor: null,
      fontFamily: null,
      tagline: null,
      description: null,
      heroImageUrl: null,
      aboutTitle: null,
      aboutText: 'Solo appuntamento.',
      aboutImageUrl: null,
      googleRating: null,
      googleReviewsCount: null,
      teamDescription: null,
      locationsDescription: null,
      contactPhone: null,
      contactEmail: null,
      socialLinks: {},
    },
    locations: [
      {
        id: 'loc-1',
        name: 'Solo',
        address: null,
        city: null,
        zipCode: null,
        phone: null,
        email: null,
        photoUrl: 'https://cdn.example.test/location-cover.jpg',
        photos: [],
        latitude: null,
        longitude: null,
        timezone: null,
      },
    ],
    serviceCategories: [],
    services: [],
    staffMembers: [
      {
        id: 'staff-1',
        role: 'staff',
        fullName: 'Luca',
        bio: null,
        photoUrl: null,
      },
    ],
    products: [],
    galleryPhotos: [],
    portfolioPhotos: [],
    websitePhotos: [],
    promotions: [],
    promotionServices: [],
    promotionProducts: [],
  })

  assert.deepEqual(result.locations[0]?.photos, ['https://cdn.example.test/location-cover.jpg'])
  assert.equal(result.tenant.hero_image_url, 'https://cdn.example.test/location-cover.jpg')
  assert.equal(result.sections.showTeam, false)
  assert.equal(result.sections.showPortfolio, false)
})
