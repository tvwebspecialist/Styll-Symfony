import { expect, test, type Page } from 'playwright/test'
import { getVisibleHomeProducts } from '../src/lib/actions/pwa-home'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const EXTRA_HIDDEN_PRODUCT_COUNT = 120
const MAX_PRODUCTS_PAYLOAD_BYTES = 1_000
const MAX_HOME_HTML_LENGTH = 250_000

interface TenantSeed {
  tenantId: string
  slug: string
  locationId: string
  productIds: string[]
  productIdsByName: Record<string, string>
}

interface ProductSeed {
  name: string
  showOnSite: boolean
  displayOrder: number
  priceSell: number
}

interface InventorySeed {
  productName: string
  quantity: number
}

interface PwaHomeInventoryFixture {
  tenantA: TenantSeed
  tenantB: TenantSeed
  cleanup: () => Promise<void>
}

const TENANT_A_VISIBLE_STOCKED_ONE = 'PWA Home Visible Stocked 1'
const TENANT_A_VISIBLE_OUT_OF_STOCK = 'PWA Home Visible Out Of Stock'
const TENANT_A_VISIBLE_STOCKED_TWO = 'PWA Home Visible Stocked 2'
const TENANT_A_VISIBLE_NINTH_STOCKED = 'PWA Home Visible Ninth Stocked'
const TENANT_A_HIDDEN_STOCKED = 'PWA Home Hidden Stocked'
const TENANT_B_SECRET_PRODUCT = 'PWA Home Tenant B Secret'

function buildHiddenProductName(index: number): string {
  return `PWA Home Hidden Extra ${String(index + 1).padStart(3, '0')}`
}

async function createTenant(
  service: ServiceClient,
  suffix: string,
  label: 'a' | 'b',
): Promise<TenantSeed> {
  const slug = `pw-pwa-home-${label}-${suffix}`
  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright PWA Home ${label.toUpperCase()} ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id, slug')
    .single()
  await assertNoSupabaseError(`create tenant ${label}`, tenantError)

  const tenantId = tenant?.id
  const tenantSlug = tenant?.slug
  if (!tenantId || !tenantSlug) {
    throw new Error(`create tenant ${label}: missing tenant data`)
  }

  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `PWA Home Location ${label.toUpperCase()}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create location ${label}`, locationError)

  const locationId = location?.id
  if (!locationId) {
    throw new Error(`create location ${label}: missing location id`)
  }

  return {
    tenantId,
    slug: tenantSlug,
    locationId,
    productIds: [],
    productIdsByName: {},
  }
}

async function insertProducts(
  service: ServiceClient,
  tenant: TenantSeed,
  label: string,
  products: ProductSeed[],
): Promise<void> {
  const { data: insertedProducts, error } = await service
    .from('products')
    .insert(products.map((product) => ({
      display_order: product.displayOrder,
      is_active: true,
      is_new: false,
      name: product.name,
      price_sell: product.priceSell,
      show_on_site: product.showOnSite,
      tenant_id: tenant.tenantId,
    })))
    .select('id, name')
  await assertNoSupabaseError(`insert products ${label}`, error)

  for (const product of insertedProducts ?? []) {
    tenant.productIds.push(product.id)
    tenant.productIdsByName[product.name] = product.id
  }
}

async function insertInventory(
  service: ServiceClient,
  tenant: TenantSeed,
  label: string,
  items: InventorySeed[],
): Promise<void> {
  const rows = items.map((item) => {
    const productId = tenant.productIdsByName[item.productName]
    if (!productId) {
      throw new Error(`insert inventory ${label}: missing product id for ${item.productName}`)
    }

    return {
      location_id: tenant.locationId,
      low_stock_threshold: 0,
      product_id: productId,
      quantity: item.quantity,
      tenant_id: tenant.tenantId,
    }
  })

  const { error } = await service.from('product_inventory').insert(rows)
  await assertNoSupabaseError(`insert inventory ${label}`, error)
}

async function seedPwaHomeInventoryFixture(): Promise<PwaHomeInventoryFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const tenantIds: string[] = []
  const locationIds: string[] = []

  const tenantA = await createTenant(service, suffix, 'a')
  const tenantB = await createTenant(service, suffix, 'b')

  tenantIds.push(tenantA.tenantId, tenantB.tenantId)
  locationIds.push(tenantA.locationId, tenantB.locationId)

  await insertProducts(service, tenantA, 'tenant-a', [
    { name: TENANT_A_VISIBLE_STOCKED_ONE, showOnSite: true, displayOrder: 1, priceSell: 12 },
    { name: TENANT_A_VISIBLE_OUT_OF_STOCK, showOnSite: true, displayOrder: 2, priceSell: 13 },
    { name: TENANT_A_VISIBLE_STOCKED_TWO, showOnSite: true, displayOrder: 3, priceSell: 14 },
    { name: 'PWA Home Visible Filler 4', showOnSite: true, displayOrder: 4, priceSell: 15 },
    { name: 'PWA Home Visible Filler 5', showOnSite: true, displayOrder: 5, priceSell: 16 },
    { name: 'PWA Home Visible Filler 6', showOnSite: true, displayOrder: 6, priceSell: 17 },
    { name: 'PWA Home Visible Filler 7', showOnSite: true, displayOrder: 7, priceSell: 18 },
    { name: 'PWA Home Visible Filler 8', showOnSite: true, displayOrder: 8, priceSell: 19 },
    { name: TENANT_A_VISIBLE_NINTH_STOCKED, showOnSite: true, displayOrder: 9, priceSell: 20 },
    { name: TENANT_A_HIDDEN_STOCKED, showOnSite: false, displayOrder: 10, priceSell: 21 },
    ...Array.from({ length: EXTRA_HIDDEN_PRODUCT_COUNT }, (_, index) => ({
      name: buildHiddenProductName(index),
      showOnSite: false,
      displayOrder: 100 + index,
      priceSell: 30 + index,
    })),
  ])

  await insertProducts(service, tenantB, 'tenant-b', [
    { name: TENANT_B_SECRET_PRODUCT, showOnSite: true, displayOrder: 1, priceSell: 99 },
  ])

  await insertInventory(service, tenantA, 'tenant-a', [
    { productName: TENANT_A_VISIBLE_STOCKED_ONE, quantity: 5 },
    { productName: TENANT_A_VISIBLE_OUT_OF_STOCK, quantity: 0 },
    { productName: TENANT_A_VISIBLE_STOCKED_TWO, quantity: 2 },
    { productName: 'PWA Home Visible Filler 4', quantity: 0 },
    { productName: 'PWA Home Visible Filler 5', quantity: 0 },
    { productName: 'PWA Home Visible Filler 6', quantity: 0 },
    { productName: 'PWA Home Visible Filler 7', quantity: 0 },
    { productName: 'PWA Home Visible Filler 8', quantity: 0 },
    { productName: TENANT_A_VISIBLE_NINTH_STOCKED, quantity: 8 },
    { productName: TENANT_A_HIDDEN_STOCKED, quantity: 999 },
    ...Array.from({ length: EXTRA_HIDDEN_PRODUCT_COUNT }, (_, index) => ({
      productName: buildHiddenProductName(index),
      quantity: 1,
    })),
  ])

  await insertInventory(service, tenantB, 'tenant-b', [
    { productName: TENANT_B_SECRET_PRODUCT, quantity: 4 },
  ])

  return {
    tenantA,
    tenantB,
    cleanup: async () => {
      if (tenantIds.length > 0) {
        await service.from('product_inventory').delete().in('tenant_id', tenantIds)
        await service.from('products').delete().in('tenant_id', tenantIds)
      }
      if (locationIds.length > 0) {
        await service.from('locations').delete().in('id', locationIds)
      }
      if (tenantIds.length > 0) {
        await service.from('tenants').delete().in('id', tenantIds)
      }
    },
  }
}

async function gotoAndReadHtml(page: Page, path: string): Promise<string> {
  const response = await page.goto(path)
  if (response) {
    return response.text()
  }
  return page.content()
}

test.describe.serial('pwa home inventory bounded SS-06', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for PWA home SS-06 fixtures.')

  let fixture: PwaHomeInventoryFixture | null = null

  test.beforeAll(async () => {
    fixture = await seedPwaHomeInventoryFixture()
  })

  test.afterAll(async () => {
    if (fixture) {
      await fixture.cleanup()
      fixture = null
    }
  })

  function getFixture(): PwaHomeInventoryFixture {
    if (!fixture) {
      throw new Error('PWA home inventory fixture not initialized')
    }
    return fixture
  }

  test('visible products keep correct availability and stay tenant-isolated', async () => {
    const service = requireServiceClient()
    const fixture = getFixture()

    const tenantAProducts = await getVisibleHomeProducts(service, fixture.tenantA.tenantId)
    expect(tenantAProducts.map((product) => product.name)).toEqual([
      TENANT_A_VISIBLE_STOCKED_ONE,
      TENANT_A_VISIBLE_STOCKED_TWO,
    ])
    expect(tenantAProducts.some((product) => product.name === TENANT_A_VISIBLE_OUT_OF_STOCK)).toBe(false)
    expect(tenantAProducts.some((product) => product.name === TENANT_A_VISIBLE_NINTH_STOCKED)).toBe(false)
    expect(tenantAProducts.some((product) => product.name === TENANT_A_HIDDEN_STOCKED)).toBe(false)
    expect(tenantAProducts.some((product) => product.name === TENANT_B_SECRET_PRODUCT)).toBe(false)
    expect(JSON.stringify(tenantAProducts).length).toBeLessThan(MAX_PRODUCTS_PAYLOAD_BYTES)

    const tenantBProducts = await getVisibleHomeProducts(service, fixture.tenantB.tenantId)
    expect(tenantBProducts.map((product) => product.name)).toEqual([TENANT_B_SECRET_PRODUCT])
  })

  test('guest PWA home renders only the bounded in-stock visible products', async ({ page }) => {
    const fixture = getFixture()
    await page.addInitScript(() => {
      window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
    })

    const html = await gotoAndReadHtml(page, buildTenantAppPath(fixture.tenantA.slug))

    await expect(page.getByText(TENANT_A_VISIBLE_STOCKED_ONE, { exact: true })).toBeVisible()
    await expect(page.getByText(TENANT_A_VISIBLE_STOCKED_TWO, { exact: true })).toBeVisible()
    await expect(page.getByText(TENANT_A_VISIBLE_OUT_OF_STOCK, { exact: true })).toHaveCount(0)
    await expect(page.getByText(TENANT_A_VISIBLE_NINTH_STOCKED, { exact: true })).toHaveCount(0)
    await expect(page.getByText(TENANT_A_HIDDEN_STOCKED, { exact: true })).toHaveCount(0)
    await expect(page.getByText(TENANT_B_SECRET_PRODUCT, { exact: true })).toHaveCount(0)

    expect(html.length).toBeLessThan(MAX_HOME_HTML_LENGTH)
    expect(html).not.toContain(TENANT_A_VISIBLE_NINTH_STOCKED)
    expect(html).not.toContain(TENANT_A_HIDDEN_STOCKED)
    expect(html).not.toContain(TENANT_B_SECRET_PRODUCT)
  })
})
