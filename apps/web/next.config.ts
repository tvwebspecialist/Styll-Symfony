import path from 'node:path'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const repoRoot = path.resolve(__dirname, '..', '..')
const symfonyApiBaseUrl =
  process.env.SYMFONY_API_URL ??
  process.env.NEXT_PUBLIC_SYMFONY_API_URL ??
  'https://api.styll.it'

function buildRemotePattern(url: string) {
  try {
    const parsed = new URL(url)
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    }
  } catch {
    return null
  }
}

const symfonyRemotePattern = buildRemotePattern(symfonyApiBaseUrl)

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  allowedDevOrigins: ['localhost', '127.0.0.1', '*.localhost'],
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
  experimental: {
    authInterrupts: true,
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
      ...(symfonyRemotePattern ? [symfonyRemotePattern] : []),
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'ngrok-skip-browser-warning', value: '1' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // CSP and X-Frame-Options are set per-request in apps/web/src/proxy.ts so
      // public tenant surfaces can stay embeddable while private/admin routes do not.
    ]

    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Next 16 Turbopack builds in this repo do not emit the legacy
  // `.next/server/pages-manifest.json` file expected by Sentry's
  // runAfterProductionCompile hook, so keep that hook disabled.
  useRunAfterProductionCompileHook: false,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
