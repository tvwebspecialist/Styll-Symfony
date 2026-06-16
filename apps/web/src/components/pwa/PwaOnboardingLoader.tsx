'use client'

import dynamic from 'next/dynamic'

const PwaOnboarding = dynamic(
  () => import('./PwaOnboarding').then((m) => ({ default: m.PwaOnboarding })),
  { ssr: false },
)

export function PwaOnboardingLoader(props: {
  primaryColor: string
  logoUrl?:     string | null
  businessName: string
  tenantId:     string
}) {
  return <PwaOnboarding {...props} />
}
