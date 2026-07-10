import { expect, test } from 'playwright/test'
import {
  buildClientFacingEmailLegalLinks,
  buildClientFacingEmailTenantBranding,
  buildEmailHtml,
  buildMarketingEmailHeaders,
} from '../src/lib/email'
import { buildMarketingEmailLinks } from '../src/lib/marketing-unsubscribe'
import { buildRootAppUrl } from '../src/lib/auth/urls'

test.describe('email legal links', () => {
  test('client-facing marketing emails use tenant-specific legal links and unsubscribe links', async () => {
    const legalLinks = buildClientFacingEmailLegalLinks('demo-salone')
    const marketingLinks = buildMarketingEmailLinks('demo-salone', 'opaque-token-value')
    const tenantBranding = buildClientFacingEmailTenantBranding({
      business_name: 'Demo Salone',
      primary_color: '#111111',
      slug: 'demo-salone',
    })

    const html = buildEmailHtml({
      body: 'Ciao cliente',
      tenant: tenantBranding,
      marketing: {
        unsubscribeUrl: marketingLinks.unsubscribeUrl,
        oneClickUrl: marketingLinks.oneClickUrl,
        managePreferencesUrl: marketingLinks.managePreferencesUrl,
      },
      category: 'Promemoria',
    })
    const headers = buildMarketingEmailHeaders({
      unsubscribeUrl: marketingLinks.unsubscribeUrl,
      oneClickUrl: marketingLinks.oneClickUrl,
      managePreferencesUrl: marketingLinks.managePreferencesUrl,
    })

    expect(html).toContain(legalLinks.termsUrl)
    expect(html).toContain(legalLinks.privacyUrl)
    expect(html).toContain(marketingLinks.unsubscribeUrl)
    expect(html).toContain(marketingLinks.managePreferencesUrl)
    expect(html).toContain('Annulla iscrizione')
    expect(html).not.toContain(buildRootAppUrl('/termini'))
    expect(html).not.toContain(buildRootAppUrl('/privacy'))
    expect(headers['List-Unsubscribe']).toBe(`<${marketingLinks.oneClickUrl}>`)
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  test('transactional and B2B/global emails keep global legal links without unsubscribe', async () => {
    const html = buildEmailHtml({
      body: 'Ciao barbiere',
      tenant: { business_name: 'Styll', primary_color: '#111111' },
      category: 'Benvenuto',
    })

    expect(html).toContain(buildRootAppUrl('/termini'))
    expect(html).toContain(buildRootAppUrl('/privacy'))
    expect(html).not.toContain('Annulla iscrizione')
    expect(html).not.toContain('Gestisci preferenze')
  })
})
