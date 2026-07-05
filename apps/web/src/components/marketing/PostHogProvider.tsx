'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { hasAnalyticsConsent } from '@/lib/analytics-consent'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

let initialized = false

function ensurePostHogInitialized(): boolean {
  if (initialized || !hasAnalyticsConsent()) return initialized

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
  if (!key) return false

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false,
  })
  initialized = true
  return true
}

export function PostHogProvider() {
  const { hasConsent } = useAnalyticsConsent()

  useEffect(() => {
    if (!hasConsent) return
    ensurePostHogInitialized()
  }, [hasConsent])

  return null
}

export function identifyLead(email: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return

  try {
    ensurePostHogInitialized()
    if (!initialized) return
    posthog.identify(email, { email, ...properties })
  } catch {
    // best-effort
  }
}
