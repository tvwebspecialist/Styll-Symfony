import { expect, test } from 'playwright/test'
import { buildCspHeader, buildFrameAncestorsDirective } from '../src/lib/security/csp'
import { buildTenantAppPath } from './helpers/e2e-env'
import { createTenantFixture, hasSupabaseSeedEnv } from './helpers/supabase-admin'

test.describe('CSP and frame policy headers', () => {
  test('production CSP for embeddable surfaces excludes localhost and is not over-permissive', () => {
    const csp = buildCspHeader({
      allowEmbedding: true,
      isDev: false,
      rootDomain: 'styll.it',
    })

    expect(csp).not.toContain('localhost')
    expect(csp).not.toContain('127.0.0.1')
    expect(csp).toContain("frame-ancestors 'self' https://styll.it https://*.styll.it")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toContain("frame-ancestors *")
    expect(
      buildFrameAncestorsDirective({
        allowEmbedding: false,
        isDev: false,
        rootDomain: 'styll.it',
      })
    ).toBe("frame-ancestors 'none'")
  })

  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('headers stay coherent across root, dashboard, PWA and tenant site', async ({ request }) => {
    const fixture = await createTenantFixture('csp-headers')

    try {
      const rootResponse = await request.get('/', { maxRedirects: 0 })
      const dashboardResponse = await request.get('/dashboard', { maxRedirects: 0 })
      const pwaResponse = await request.get(buildTenantAppPath(fixture.slug), { maxRedirects: 0 })
      const landingResponse = await request.get(`/tenant/landing/${fixture.slug}`, { maxRedirects: 0 })

      const rootCsp = rootResponse.headers()['content-security-policy']
      const dashboardCsp = dashboardResponse.headers()['content-security-policy']
      const pwaCsp = pwaResponse.headers()['content-security-policy']
      const landingCsp = landingResponse.headers()['content-security-policy']

      expect(rootCsp).toContain("frame-ancestors 'none'")
      expect(dashboardCsp).toContain("frame-ancestors 'none'")
      expect(pwaCsp).toContain("frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000")
      expect(landingCsp).toContain("frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000")

      for (const csp of [rootCsp, dashboardCsp, pwaCsp, landingCsp]) {
        expect(csp).toContain("default-src 'self'")
        expect(csp).toContain("frame-src 'self' https://accounts.google.com")
        expect(csp).toContain("object-src 'none'")
        expect(csp).toContain('https://*.supabase.co')
      }

      expect(rootResponse.headers()['x-frame-options']).toBe('SAMEORIGIN')
      expect(dashboardResponse.headers()['x-frame-options']).toBe('SAMEORIGIN')
      expect(pwaResponse.headers()['x-frame-options']).toBeUndefined()
      expect(landingResponse.headers()['x-frame-options']).toBeUndefined()
    } finally {
      await fixture.cleanup()
    }
  })
})
