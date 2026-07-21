import {
  getPublicLocations,
  getPublicProducts,
  getPublicTeam,
} from '@/lib/actions/public-booking'
import {
  type LandingPageData,
  mapSymfonyLandingPageData,
} from '@/lib/symfony/landing-page-data'
import { fetchSymfonyPublicLandingData } from '@/lib/symfony/public-client'
import { getTenantBySlug } from '@/lib/tenant'

export type { LandingPageData } from '@/lib/symfony/landing-page-data'

export async function getLandingDataSymfony(slug: string): Promise<LandingPageData> {
  const [symfonyData, tenantRow] = await Promise.all([
    fetchSymfonyPublicLandingData(slug),
    getTenantBySlug(slug),
  ])

  if (!tenantRow || tenantRow.status !== 'active') {
    throw Object.assign(new Error('TENANT_NOT_FOUND'), { code: 'TENANT_NOT_FOUND' })
  }

  const [locationFallbacks, staffFallbacks, productFallbacks] = await Promise.all([
    getPublicLocations(tenantRow.tenant_id),
    getPublicTeam(tenantRow.tenant_id),
    getPublicProducts(tenantRow.tenant_id),
  ])

  return mapSymfonyLandingPageData({
    symfonyData,
    tenantFallback: tenantRow,
    locationFallbacks,
    staffFallbacks,
    productFallbacks,
  })
}
