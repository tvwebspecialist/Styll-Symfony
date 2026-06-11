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
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'ngrok-skip-browser-warning', value: '1' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
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
