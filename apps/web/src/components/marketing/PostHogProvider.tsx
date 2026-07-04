'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

let initialized = false

export function PostHogProvider() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
    if (!key || initialized) return
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      autocapture: false,
    })
    initialized = true
  }, [])

  return null
}

export function identifyLead(email: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    posthog.identify(email, { email, ...properties })
  } catch {
    // best-effort
  }
}
