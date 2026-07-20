import { expect, test } from 'playwright/test'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
} from './helpers/supabase-admin'
import {
  buildMarketingEmailLinks,
  issueMarketingUnsubscribeToken,
} from '../src/lib/marketing-unsubscribe'

interface ClientFixture {
  clientId: string
  email: string
}

async function createClientFixture(
  tenantId: string,
  {
    email,
    marketingConsent,
  }: {
    email?: string
    marketingConsent: boolean
  },
): Promise<ClientFixture> {
  const service = requireServiceClient()
  const resolvedEmail = email ?? `unsubscribe-${randomSuffix()}@example.com`
  const { data, error } = await service
    .from('clients')
    .insert({
      tenant_id: tenantId,
      full_name: 'Cliente Marketing',
      email: resolvedEmail,
      phone: '+39 333 222 1111',
      marketing_consent: marketingConsent,
      tags: [],
    })
    .select('id, email')
    .single()
  await assertNoSupabaseError('create marketing unsubscribe client', error)

  if (!data?.id || !data.email) {
    throw new Error('create marketing unsubscribe client: missing data')
  }

  return {
    clientId: data.id,
    email: data.email,
  }
}

test.describe('marketing unsubscribe flow', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for unsubscribe fixtures.')

  test('valid token shows confirmation page and GET does not revoke consent', async ({ page }) => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('unsubscribe-confirm')
    const client = await createClientFixture(tenant.tenantId, { marketingConsent: true })
    const token = await issueMarketingUnsubscribeToken(service, {
      tenantId: tenant.tenantId,
      clientId: client.clientId,
    })

    try {
      const response = await page.goto(
        buildTenantAppPath(tenant.slug, `/preferenze-marketing?token=${encodeURIComponent(token)}`),
      )

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: `Gestisci le email di ${tenant.businessName}` })).toBeVisible()
      await expect(page.locator('body')).toContainText('Annulla iscrizione alle email promozionali')

      const { data: clientAfterGet, error: clientAfterGetError } = await service
        .from('clients')
        .select('marketing_consent')
        .eq('id', client.clientId)
        .single()
      await assertNoSupabaseError('read client after unsubscribe GET', clientAfterGetError)
      expect(clientAfterGet?.marketing_consent).toBe(true)
      expect(token).not.toContain(client.clientId)
      expect(token).not.toContain(client.email)
      await expect(page.locator('body')).not.toContainText(client.clientId)
      await expect(page.locator('body')).not.toContainText(client.email)
    } finally {
      await tenant.cleanup()
    }
  })

  test('POST valid token revokes consent and remains idempotent', async ({ page }) => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('unsubscribe-post')
    const client = await createClientFixture(tenant.tenantId, { marketingConsent: true })
    const token = await issueMarketingUnsubscribeToken(service, {
      tenantId: tenant.tenantId,
      clientId: client.clientId,
    })
    const tokenPage = buildTenantAppPath(
      tenant.slug,
      `/preferenze-marketing?token=${encodeURIComponent(token)}`,
    )
    const confirmUrl = buildTenantAppPath(
      tenant.slug,
      `/preferenze-marketing/confirm?token=${encodeURIComponent(token)}`,
    )

    try {
      await page.goto(tokenPage)
      await page.getByRole('button', { name: 'Annulla iscrizione alle email promozionali' }).click()
      await expect(page.getByText('Preferenze aggiornate')).toBeVisible()

      const { data: revokedClient, error: revokedClientError } = await service
        .from('clients')
        .select('marketing_consent')
        .eq('id', client.clientId)
        .single()
      await assertNoSupabaseError('read client after unsubscribe POST', revokedClientError)
      expect(revokedClient?.marketing_consent).toBe(false)

      const secondResponse = await page.context().request.post(confirmUrl, {
        form: { confirm: '1' },
        maxRedirects: 0,
      })
      expect(secondResponse.status()).toBe(303)
      expect(secondResponse.headers()['location']).toContain('status=already')
    } finally {
      await tenant.cleanup()
    }
  })

  test('altered token, expired token, and tenant mismatch never revoke consent', async ({ page }) => {
    const service = requireServiceClient()
    const tenantA = await createTenantFixture('unsubscribe-a')
    const tenantB = await createTenantFixture('unsubscribe-b')
    const clientA = await createClientFixture(tenantA.tenantId, { marketingConsent: true })
    const clientB = await createClientFixture(tenantB.tenantId, { marketingConsent: true })

    const validToken = await issueMarketingUnsubscribeToken(service, {
      tenantId: tenantA.tenantId,
      clientId: clientA.clientId,
    })
    const expiredToken = await issueMarketingUnsubscribeToken(service, {
      tenantId: tenantA.tenantId,
      clientId: clientA.clientId,
      expiresAt: '2020-01-01T00:00:00.000Z',
    })

    try {
      const alteredUrl = buildTenantAppPath(
        tenantA.slug,
        `/preferenze-marketing?token=${encodeURIComponent(`${validToken}tampered`)}`,
      )
      await page.goto(alteredUrl)
      await expect(page.getByText(/link scaduto|link non valido/i)).toBeVisible()

      const expiredUrl = buildTenantAppPath(
        tenantA.slug,
        `/preferenze-marketing?token=${encodeURIComponent(expiredToken)}`,
      )
      await page.goto(expiredUrl)
      await expect(page.getByText(/link scaduto|link non valido/i)).toBeVisible()

      const crossTenantResponse = await page.context().request.post(
        buildTenantAppPath(
          tenantB.slug,
          `/preferenze-marketing/confirm?token=${encodeURIComponent(validToken)}`,
        ),
        {
          form: { confirm: '1' },
          maxRedirects: 0,
        },
      )
      expect(crossTenantResponse.status()).toBe(303)

      const unknownSlug = `unknown-unsubscribe-${randomSuffix()}`
      const unknownResponse = await page.goto(
        buildTenantAppPath(unknownSlug, `/preferenze-marketing?token=${encodeURIComponent(validToken)}`),
      )
      expect(unknownResponse?.status()).toBe(404)

      const { data: clientsAfter, error: clientsAfterError } = await service
        .from('clients')
        .select('id, marketing_consent')
        .in('id', [clientA.clientId, clientB.clientId])
      await assertNoSupabaseError('read clients after invalid unsubscribe attempts', clientsAfterError)

      const consentById = new Map((clientsAfter ?? []).map((row) => [row.id, row.marketing_consent]))
      expect(consentById.get(clientA.clientId)).toBe(true)
      expect(consentById.get(clientB.clientId)).toBe(true)
    } finally {
      await tenantA.cleanup()
      await tenantB.cleanup()
    }
  })

  test('marketing email helper exposes tenant unsubscribe and preferences links', async () => {
    const links = buildMarketingEmailLinks('demo-salone', 'opaque-token')

    expect(links.unsubscribeUrl).toContain('/tenant/app/demo-salone/preferenze-marketing?token=')
    expect(links.oneClickUrl).toContain('/tenant/app/demo-salone/preferenze-marketing/confirm?token=')
    expect(links.managePreferencesUrl).toContain('/tenant/app/demo-salone/profilo/preferenze')
  })
})
