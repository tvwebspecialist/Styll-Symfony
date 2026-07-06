import type { NextResponse } from 'next/server'

export interface CspOptions {
  allowEmbedding: boolean
  isDev: boolean
  rootDomain: string
}

function uniqueSources(sources: string[]): string[] {
  return [...new Set(sources.filter(Boolean))]
}

export function buildFrameAncestorsDirective({
  allowEmbedding,
  isDev,
  rootDomain,
}: CspOptions): string {
  if (!allowEmbedding) {
    return "frame-ancestors 'none'"
  }

  const sources = ["'self'"]

  if (isDev) {
    sources.push('http://localhost:3000', 'http://127.0.0.1:3000')
  } else {
    sources.push(`https://${rootDomain}`, `https://*.${rootDomain}`)
  }

  return `frame-ancestors ${uniqueSources(sources).join(' ')}`
}

function buildConnectSrc({ isDev }: CspOptions): string {
  const sources = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://*.sentry.io',
    'https://accounts.google.com',
    'https://www.google-analytics.com',
    'https://va.vercel-scripts.com',
  ]

  if (isDev) {
    sources.push(
      'http://localhost:54321',
      'ws://localhost:54321',
      'http://127.0.0.1:54321',
      'ws://127.0.0.1:54321',
    )
  }

  return `connect-src ${uniqueSources(sources).join(' ')}`
}

function buildImgSrc({ isDev }: CspOptions): string {
  const sources = [
    "'self'",
    'https://*.supabase.co',
    'https://*.vercel.app',
    'data:',
    'blob:',
  ]

  if (isDev) {
    sources.push('http://localhost:54321', 'http://127.0.0.1:54321')
  }

  return `img-src ${uniqueSources(sources).join(' ')}`
}

export function buildCspHeader(options: CspOptions): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' blob: https://va.vercel-scripts.com${options.isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    buildConnectSrc(options),
    buildImgSrc(options),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'self' https://accounts.google.com",
    buildFrameAncestorsDirective(options),
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ')
}

export function buildXFrameOptionsHeader(allowEmbedding: boolean): string | null {
  return allowEmbedding ? null : 'SAMEORIGIN'
}

export function applySecurityHeaders(
  response: NextResponse,
  options: CspOptions,
): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader(options))

  const xFrameOptions = buildXFrameOptionsHeader(options.allowEmbedding)
  if (xFrameOptions) {
    response.headers.set('X-Frame-Options', xFrameOptions)
  } else {
    response.headers.delete('X-Frame-Options')
  }

  return response
}
