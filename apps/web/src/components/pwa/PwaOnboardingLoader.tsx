'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

const PwaOnboarding = dynamic(
  () => import('./PwaOnboarding').then((m) => ({ default: m.PwaOnboarding })),
  { ssr: false },
)

const LS_KEY = 'pwa_onboarding_done'

export function PwaOnboardingLoader(props: {
  primaryColor: string
  logoUrl?:     string | null
  businessName: string
  tenantId:     string
}) {
  const [shouldLoad, setShouldLoad] = React.useState(false)

  React.useEffect(() => {
    // Only trigger the dynamic import (and download GSAP) when onboarding
    // has not been completed yet. Returning users never download the chunk.
    if (localStorage.getItem(LS_KEY) !== 'true') {
      setShouldLoad(true)
    }
  }, [])

  if (!shouldLoad) return null

  return <PwaOnboarding {...props} />
}
