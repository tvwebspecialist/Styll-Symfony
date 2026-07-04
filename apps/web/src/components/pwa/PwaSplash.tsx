'use client'

// Thin wrapper — kept for import compatibility with PwaPreviewShell.
// All logic and visual language live in BrandedSplash.
import { BrandedSplash } from './BrandedSplash'

interface PwaSplashProps {
  businessName: string
  primaryColor: string
  splashColor?: string | null
  logoUrl: string | null
}

export function PwaSplash({ businessName, primaryColor, splashColor, logoUrl }: PwaSplashProps) {
  return (
    <BrandedSplash
      variant="fullscreen"
      businessName={businessName}
      primaryColor={primaryColor}
      splashColor={splashColor}
      logoUrl={logoUrl}
    />
  )
}
