'use client'

import { EmailOtpForm } from '@/components/pwa/auth/EmailOtpForm'

interface ProfileLoginGateProps {
  slug: string
  tenantId: string
}

export function ProfileLoginGate({ slug, tenantId }: ProfileLoginGateProps) {
  return <EmailOtpForm tenantId={tenantId} tenantSlug={slug} mode="page" />
}
