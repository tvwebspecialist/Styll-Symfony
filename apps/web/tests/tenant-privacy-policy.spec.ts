import { expect, test } from 'playwright/test'
import { buildTenantAppPath, randomEmail } from './helpers/e2e-env'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
} from './helpers/supabase-admin'

test.describe('tenant privacy policy', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for tenant privacy fixtures.')

  test('tenant privacy contains required sections, salon identity, routing, retention, analytics, and Silent Churn disclosure', async ({ page }) => {
    const service = requireServiceClient()
    const fixture = await createTenantFixture('tenant-privacy')
    const ownerEmail = randomEmail('tenant-privacy-owner')
    const ownerPhone = '+39 333 987 6543'
    let ownerUserId: string | null = null

    try {
      const { data: authData, error: authError } = await service.auth.admin.createUser({
        email: ownerEmail,
        password: 'Testpass123!',
        email_confirm: true,
        user_metadata: { full_name: 'Privacy Owner', user_type: 'staff' },
      })
      await assertNoSupabaseError('create tenant privacy owner', authError)

      ownerUserId = authData.user?.id ?? null
      if (!ownerUserId) {
        throw new Error('create tenant privacy owner: missing user id')
      }

      const { error: profileError } = await service
        .from('profiles')
        .update({
          email: ownerEmail,
          email_verified: true,
          full_name: 'Privacy Owner',
          phone: ownerPhone,
          user_type: 'staff',
        })
        .eq('id', ownerUserId)
      await assertNoSupabaseError('seed tenant privacy owner profile', profileError)

      const { error: ownerStaffError } = await service.from('staff_members').insert({
        tenant_id: fixture.tenantId,
        profile_id: ownerUserId,
        role: 'owner',
        is_active: true,
      })
      await assertNoSupabaseError('seed tenant privacy owner staff row', ownerStaffError)

      const { error: locationError } = await service.from('locations').insert({
        tenant_id: fixture.tenantId,
        name: `${fixture.businessName} HQ`,
        address: 'Via Roma 12',
        city: 'Milano',
        zip_code: '20121',
        phone: ownerPhone,
        email: ownerEmail,
        is_active: true,
      })
      await assertNoSupabaseError('seed tenant privacy location', locationError)

      const response = await page.goto(buildTenantAppPath(fixture.slug, '/privacy'))
      expect(response?.status()).toBe(200)

      await expect(page.getByRole('heading', { name: `Privacy Policy di ${fixture.businessName}` })).toBeVisible()
      await expect(page.locator('body')).toContainText(fixture.businessName)
      await expect(page.locator('body')).toContainText(ownerEmail)
      await expect(page.locator('body')).toContainText('Titolare del trattamento')
      await expect(page.locator('body')).toContainText('Styll come Responsabile del trattamento')
      await expect(page.locator('body')).toContainText('Finalità e basi giuridiche')
      await expect(page.locator('body')).toContainText('Destinatari, sub-responsabili e trasferimenti extra SEE')
      await expect(page.locator('body')).toContainText('Per quanto tempo conserviamo i dati')
      await expect(page.locator('body')).toContainText('I tuoi diritti e come esercitarli')
      await expect(page.locator('body')).toContainText('workflow assistito')
      await expect(page.locator('body')).toContainText('contatta prima di tutto il Titolare')
      await expect(page.locator('body')).toContainText('inoltrerà al Titolare competente')
      await expect(page.locator('body')).toContainText('Garante per la protezione dei dati personali')
      await expect(page.locator('body')).toContainText('Analytics e collegamento al profilo cliente')
      await expect(page.locator('body')).toContainText('identificativo anonimo')
      await expect(page.locator('body')).toContainText('può essere collegata al tuo profilo cliente')
      await expect(page.locator('body')).toContainText('Analisi della frequenza delle visite (Silent Churn)')
      await expect(page.locator('body')).toContainText('nessuna decisione automatica')
      await expect(page.locator('body')).toContainText('consenso marketing')
      await expect(page.locator('body')).toContainText('90 giorni')
      await expect(page.locator('body')).toContainText('Entrata in vigore')
    } finally {
      if (ownerUserId) {
        await service.auth.admin.deleteUser(ownerUserId)
      }
      await fixture.cleanup()
    }
  })

  test('unknown tenant privacy returns 404 without leaking another salon identity', async ({ page }) => {
    const fixture = await createTenantFixture('tenant-privacy-no-leak')
    const unknownSlug = `unknown-privacy-${randomSuffix()}`

    try {
      const response = await page.goto(buildTenantAppPath(unknownSlug, '/privacy'))

      expect(response?.status()).toBe(404)
      await expect(page.getByText('Pagina non trovata.')).toBeVisible()
      await expect(page.getByText(fixture.businessName)).toHaveCount(0)
      await expect(page.getByText('Privacy Policy di')).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
})
