import { expect, test } from 'playwright/test'
import { serializeJsonLd } from '../src/lib/security/json-ld'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
} from './helpers/supabase-admin'

async function createLandingTenantFixture(businessName: string) {
  const supabase = requireServiceClient()
  const suffix = randomSuffix()
  const slug = `jsonld-xss-${suffix}`.toLowerCase()

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      business_name: businessName,
      primary_color: '#111111',
      settings: {},
      slug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()

  await assertNoSupabaseError('create JSON-LD tenant fixture', error)

  const tenantId = data?.id
  if (!tenantId) {
    throw new Error('create JSON-LD tenant fixture: missing tenant id')
  }

  return {
    slug,
    cleanup: async () => {
      await supabase.from('tenants').delete().eq('id', tenantId)
    },
  }
}

test.describe('JSON-LD sanitization', () => {
  test('keeps a normal business name valid and parseable', () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: 'Barberia Classica Milano',
      url: 'https://barberia-classica.styll.it',
    }

    const serialized = serializeJsonLd(jsonLd)

    expect(JSON.parse(serialized)).toEqual(jsonLd)
    expect(serialized).toContain('"Barberia Classica Milano"')
  })

  test('neutralizes a closing script payload while preserving valid JSON-LD', () => {
    const businessName = "Barber </script><script>window.__xss='hit'</script>"
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: businessName,
    }

    const serialized = serializeJsonLd(jsonLd)

    expect(serialized).not.toContain('</script>')
    expect(serialized).toContain('\\u003c/script\\u003e\\u003cscript\\u003ewindow.__xss=\'hit\'\\u003c/script\\u003e')
    expect(JSON.parse(serialized)).toEqual(jsonLd)
  })

  test('neutralizes raw HTML payloads such as img onerror without corrupting JSON-LD', () => {
    const businessName = 'Barber <img src=x onerror="window.__imgXss=\'hit\'">'
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: businessName,
    }

    const serialized = serializeJsonLd(jsonLd)

    expect(serialized).not.toContain('<img')
    expect(serialized).toContain('\\u003cimg src=x onerror=\\"window.__imgXss=\'hit\'\\"\\u003e')
    expect(JSON.parse(serialized)).toEqual(jsonLd)
  })

  test('escapes U+2028 and U+2029 while keeping JSON-LD valid', () => {
    const businessName = 'Linea\u2028Separatore\u2029Paragrafo'
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'HealthAndBeautyBusiness',
      name: businessName,
    }

    const serialized = serializeJsonLd(jsonLd)

    expect(serialized).not.toContain('\u2028')
    expect(serialized).not.toContain('\u2029')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
    expect(JSON.parse(serialized)).toEqual(jsonLd)
  })

  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant fixtures.')

  test('landing JSON-LD stays valid and injected JS does not execute', async ({ page }) => {
    const businessName = `Barber </script><script>window.__landingJsonLdScriptXss='hit'</script><img src=x onerror="window.__landingJsonLdImgXss='hit'">`
    const fixture = await createLandingTenantFixture(businessName)

    try {
      const response = await page.goto(`/tenant/landing/${fixture.slug}`)

      expect(response?.status()).toBe(200)

      const jsonLdScript = page.locator('script[type="application/ld+json"]')
      await expect(jsonLdScript).toHaveCount(1)

      const rawJsonLd = await jsonLdScript.textContent()
      expect(rawJsonLd).not.toBeNull()
      expect(rawJsonLd).not.toContain('</script>')
      expect(rawJsonLd).not.toContain('<img')

      const parsed = JSON.parse(rawJsonLd ?? '')
      expect(parsed.name).toBe(businessName)

      const scriptXss = await page.evaluate(
        () => (window as Window & { __landingJsonLdScriptXss?: string }).__landingJsonLdScriptXss
      )
      const imgXss = await page.evaluate(
        () => (window as Window & { __landingJsonLdImgXss?: string }).__landingJsonLdImgXss
      )

      expect(scriptXss).toBeUndefined()
      expect(imgXss).toBeUndefined()
    } finally {
      await fixture.cleanup()
    }
  })
})
