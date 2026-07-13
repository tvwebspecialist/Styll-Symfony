'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { hasAnalyticsConsent } from '@/lib/analytics-consent'
import { useAnalyticsConsent } from '@/hooks/use-analytics-consent'

let hasInitializedClient = false

function enablePostHog(): boolean {
  if (!hasAnalyticsConsent()) return false

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
  if (!key) return false

  if (!hasInitializedClient) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: false,
    })
    hasInitializedClient = true
  }

  posthog.opt_in_capturing()
  return true
}

function disablePostHog(): void {
  if (!hasInitializedClient) return

  try {
    posthog.opt_out_capturing()
    posthog.reset(true)
  } catch (error) {
    console.error('[posthog] failed to disable analytics after consent revocation', error)
  }
}

export function PostHogProvider() {
  const { hasConsent, ready } = useAnalyticsConsent()

  useEffect(() => {
    if (!ready) return

    if (!hasConsent) {
      disablePostHog()
      return
    }

    enablePostHog()
  }, [hasConsent, ready])

  return null
}

export function identifyLead(email: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return

  try {
    if (!enablePostHog()) return
    posthog.identify(email, { email, ...properties })
  } catch (error) {
    console.error('[posthog] failed to identify marketing lead', error)
  }
}
