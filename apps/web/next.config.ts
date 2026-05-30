import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'v7djgxewvqehlgrhzksj.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            // Prevent browsers from MIME-sniffing the content type
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Prevent clickjacking — only allow framing from same origin
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            // Force HTTPS for 1 year, include subdomains
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            // Limit referrer info sent to external sites
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Disable browser features not needed by the app
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // Basic XSS protection for older browsers
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
