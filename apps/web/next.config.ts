import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '*.styll.it',
        process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `*.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : 'styll.it',
      ].filter(Boolean) as string[],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'http', hostname: '127.0.0.1', port: '54321' },
      { protocol: 'http', hostname: 'localhost', port: '54321' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'ngrok-skip-browser-warning', value: '1' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP solo in produzione — in dev Turbopack usa script inline e blob: che il CSP blocca
      ...(process.env.NODE_ENV === 'production'
        ? [{
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' https://va.vercel-scripts.com",
              "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://accounts.google.com https://va.vercel-scripts.com",
              "img-src 'self' https://*.supabase.co data: blob:",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              "frame-src 'self' https://accounts.google.com",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          }]
        : []),
    ]

    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
