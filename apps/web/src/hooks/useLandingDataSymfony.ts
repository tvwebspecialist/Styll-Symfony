import {
  type LandingPageData,
  mapSymfonyLandingPageData,
} from '@/lib/symfony/landing-page-data'
import { fetchSymfonyPublicLandingData } from '@/lib/symfony/public-client'

export type { LandingPageData } from '@/lib/symfony/landing-page-data'

export async function getLandingDataSymfony(slug: string): Promise<LandingPageData> {
  return mapSymfonyLandingPageData(await fetchSymfonyPublicLandingData(slug))
}
