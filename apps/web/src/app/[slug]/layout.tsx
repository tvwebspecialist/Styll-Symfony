import { CookieBanner } from '@/components/shared/CookieBanner'
import {
  ANALYTICS_CONSENT_SURFACE,
  buildAnalyticsCookiePath,
} from '@/lib/analytics-consent-copy'

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  const cookiePath = buildAnalyticsCookiePath({
    surface: ANALYTICS_CONSENT_SURFACE.PLATFORM,
  })

  return (
    <>
      {children}
      <CookieBanner cookiePath={cookiePath} />
    </>
  )
}
