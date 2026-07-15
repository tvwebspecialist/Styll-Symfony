import { expect, test, type Page } from 'playwright/test'
import { buildDpaAcceptanceFields, ensureTenantDpaAcceptance, getCurrentDpaDocumentMetadata } from '../src/lib/legal/dpa'
import {
  consumePendingB2bTermsAcceptanceProof,
  createPendingB2bTermsAcceptanceProof,
} from '../src/lib/legal/b2b-register-acceptance'
import {
  EMAIL_PASSWORD_REGISTER_SOURCE,
  getCurrentB2bTermsAcceptanceDocument,
} from '../src/lib/legal/b2b-register-acceptance-shared'
import { assertNoSupabaseError, createTenantFixture, hasSupabaseSeedEnv, requireServiceClient } from './helpers/supabase-admin'
import { randomEmail } from './helpers/e2e-env'

interface AuthUserFixture {
  cleanup: () => Promise<void>
  email: string
  password: string
  userId: string
}

async function createVerifiedBarberUser(prefix: string): Promise<AuthUserFixture> {
  const service = requireServiceClient()
  const email = randomEmail(prefix)
  const password = 'Testpass123!'

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Playwright ${prefix}`, user_type: 'staff' },
  })
  await assertNoSupabaseError('create verified barber user', authError)

  const userId = authData.user?.id ?? null
  if (!userId) {
    throw new Error('create verified barber user: missing user id')
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright ${prefix}`,
      onboarding_completed: false,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError('seed verified barber profile', profileError)

  return {
    email,
    password,
    userId,
    cleanup: async () => {
      await service.auth.admin.deleteUser(userId)
    },
  }
}

async function loginForOnboarding(page: Page, email: string, password: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('styll_cookie_consent_v1', 'rejected')
  })

  await page.goto('/login?redirectTo=%2Fonboarding%2Fstep-1')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/\/onboarding\/step-1$/)
}

test.describe.serial('DPA acceptance persistence', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for DPA acceptance fixtures.')

  test('first barber onboarding records versioned DPA acceptance on the tenant', async ({ page }) => {
    test.setTimeout(120_000)
    const service = requireServiceClient()
    const user = await createVerifiedBarberUser('dpa-onboarding')
    const startedAt = Date.now()
    const businessName = `Playwright DPA ${Date.now()}`

    try {
      await loginForOnboarding(page, user.email, user.password)

      await page.getByLabel('Nome attività').fill(businessName)
      await page.getByLabel('Città').fill('Milano')
      await page.getByLabel('Indirizzo').fill('Via Roma 12')
      await page.getByLabel('Telefono').fill('+39 333 000 1234')
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-2$/)
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-3$/)
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-4$/)
      await page.getByRole('button', { name: 'Vai alla dashboard →' }).click()

      await expect
        .poll(async () => {
          const { data: ownerAfterFinalize, error: ownerAfterFinalizeError } = await service
            .from('staff_members')
            .select('tenant_id')
            .eq('profile_id', user.userId)
            .eq('role', 'owner')
            .maybeSingle()
          await assertNoSupabaseError('poll owner staff after finalize onboarding', ownerAfterFinalizeError)

          const tenantId = ownerAfterFinalize?.tenant_id ?? null
          if (!tenantId) return null

          const { data: tenantAfterFinalize, error: tenantAfterFinalizeError } = await service
            .from('tenants')
            .select('id, dpa_version, dpa_accepted_at, dpa_accepted_by')
            .eq('id', tenantId)
            .maybeSingle()
          await assertNoSupabaseError('poll tenant DPA acceptance after finalize onboarding', tenantAfterFinalizeError)

          if (!tenantAfterFinalize?.dpa_accepted_at) return null
          return tenantAfterFinalize
        }, {
        timeout: 60_000,
      })
        .not.toBeNull()

      const { data: ownerStaff, error: ownerStaffError } = await service
        .from('staff_members')
        .select('tenant_id')
        .eq('profile_id', user.userId)
        .eq('role', 'owner')
        .maybeSingle()
      await assertNoSupabaseError('read owner staff after onboarding', ownerStaffError)

      const tenantId = ownerStaff?.tenant_id ?? null
      expect(tenantId).not.toBeNull()

      const { data: tenant, error: tenantError } = await service
        .from('tenants')
        .select('id, business_name, dpa_version, dpa_accepted_at, dpa_accepted_by')
        .eq('id', tenantId!)
        .single()
      await assertNoSupabaseError('read tenant DPA acceptance after onboarding', tenantError)
      expect(tenant).not.toBeNull()
      if (!tenant) {
        throw new Error('read tenant DPA acceptance after onboarding: missing tenant row')
      }

      expect(tenant.business_name).toBe(businessName)
      expect(tenant.id).toBe(tenantId)
      expect(tenant.dpa_accepted_by).toBe(user.userId)
      expect(tenant.dpa_version).toBe(getCurrentDpaDocumentMetadata().version)
      expect(tenant.dpa_accepted_at).not.toBeNull()

      const acceptedAtMs = new Date(tenant.dpa_accepted_at!).getTime()
      expect(Number.isFinite(acceptedAtMs)).toBe(true)
      expect(acceptedAtMs).toBeGreaterThanOrEqual(startedAt - 5_000)
      expect(acceptedAtMs).toBeLessThanOrEqual(Date.now() + 5_000)

      await service.from('tenants').delete().eq('id', tenantId!)
    } finally {
      await user.cleanup()
    }
  })

  test('explicit B2B terms acceptance is linked to the tenant whose onboarding records the DPA', async ({ page }) => {
    test.setTimeout(120_000)
    const service = requireServiceClient()
    const user = await createVerifiedBarberUser('dpa-terms-link')
    const businessName = `Playwright DPA Terms ${Date.now()}`

    try {
      const currentTermsDocument = getCurrentB2bTermsAcceptanceDocument()
      const pendingProof = await createPendingB2bTermsAcceptanceProof({
        acceptedByEmail: user.email,
        db: service as any,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
      })

      await consumePendingB2bTermsAcceptanceProof({
        db: service as any,
        rawToken: pendingProof.rawToken,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        userEmail: user.email,
        userId: user.userId,
      })

      await loginForOnboarding(page, user.email, user.password)

      await page.getByLabel('Nome attività').fill(businessName)
      await page.getByLabel('Città').fill('Milano')
      await page.getByLabel('Indirizzo').fill('Via Torino 10')
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-2$/)
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-3$/)
      await page.getByRole('button', { name: 'Avanti →' }).click()

      await page.waitForURL(/\/onboarding\/step-4$/)
      await page.getByRole('button', { name: 'Vai alla dashboard →' }).click()

      await expect
        .poll(async () => {
          const { data: ownerStaff, error: ownerStaffError } = await service
            .from('staff_members')
            .select('tenant_id')
            .eq('profile_id', user.userId)
            .eq('role', 'owner')
            .maybeSingle()
          await assertNoSupabaseError('poll owner staff tenant for DPA terms link', ownerStaffError)
          return ownerStaff?.tenant_id ?? null
        }, {
          timeout: 60_000,
        })
        .not.toBeNull()

      const { data: ownerStaffAfterFinalize, error: ownerStaffAfterFinalizeError } = await service
        .from('staff_members')
        .select('tenant_id')
        .eq('profile_id', user.userId)
        .eq('role', 'owner')
        .maybeSingle()
      await assertNoSupabaseError('read owner staff tenant after DPA terms link onboarding', ownerStaffAfterFinalizeError)

      const resolvedTenantId = ownerStaffAfterFinalize?.tenant_id ?? null
      expect(resolvedTenantId).not.toBeNull()
      if (!resolvedTenantId) {
        throw new Error('missing tenant id after DPA terms link onboarding')
      }

      const { data: tenant, error: tenantError } = await service
        .from('tenants')
        .select('id, business_name, dpa_version, dpa_accepted_at, dpa_accepted_by')
        .eq('id', resolvedTenantId)
        .single()
      await assertNoSupabaseError('read tenant after DPA terms link onboarding', tenantError)

      expect(tenant).not.toBeNull()
      if (!tenant) {
        throw new Error('missing tenant after DPA terms link onboarding')
      }

      expect(tenant.business_name).toBe(businessName)
      expect(tenant.dpa_accepted_by).toBe(user.userId)
      expect(tenant.dpa_version).toBe(getCurrentDpaDocumentMetadata().version)
      expect(tenant.dpa_accepted_at).not.toBeNull()

      const { data: linkedAcceptance, error: linkedAcceptanceError } = await (service as any)
        .from('legal_acceptance_events')
        .select('tenant_id, document_type, document_version, privacy_notice_version, source')
        .eq('user_id', user.userId)
        .eq('document_type', currentTermsDocument.documentType)
        .maybeSingle()
      await assertNoSupabaseError('read linked legal acceptance event after onboarding', linkedAcceptanceError)

      expect(linkedAcceptance).toMatchObject({
        document_type: currentTermsDocument.documentType,
        document_version: currentTermsDocument.documentVersion,
        privacy_notice_version: currentTermsDocument.privacyNoticeVersion,
        source: EMAIL_PASSWORD_REGISTER_SOURCE,
        tenant_id: resolvedTenantId,
      })

      await service.from('tenants').delete().eq('id', resolvedTenantId)
    } finally {
      await user.cleanup()
    }
  })

  test('DPA acceptance is idempotent and a newer version only applies to new tenants', async () => {
    test.setTimeout(120_000)
    const service = requireServiceClient()
    const user = await createVerifiedBarberUser('dpa-versioning')
    const tenantV1 = await createTenantFixture('dpa-v1')
    const tenantV2 = await createTenantFixture('dpa-v2')
    const firstAcceptedAt = '2026-07-09T15:00:00.000Z'
    const secondAcceptedAt = '2026-07-09T16:00:00.000Z'

    try {
      const firstAcceptance = buildDpaAcceptanceFields({
        acceptedAt: firstAcceptedAt,
        acceptedBy: user.userId,
        version: '1.0-test',
      })
      const initialRecorded = await ensureTenantDpaAcceptance(service, tenantV1.tenantId, firstAcceptance)
      expect(initialRecorded).toBe(true)

      const secondAcceptance = buildDpaAcceptanceFields({
        acceptedAt: secondAcceptedAt,
        acceptedBy: user.userId,
        version: '2.0-test',
      })
      const duplicateRecorded = await ensureTenantDpaAcceptance(service, tenantV1.tenantId, secondAcceptance)
      expect(duplicateRecorded).toBe(false)

      const { data: persistedV1, error: persistedV1Error } = await service
        .from('tenants')
        .select('id, dpa_version, dpa_accepted_at, dpa_accepted_by')
        .eq('id', tenantV1.tenantId)
        .single()
      await assertNoSupabaseError('read v1 tenant DPA acceptance', persistedV1Error)
      expect(persistedV1).not.toBeNull()
      if (!persistedV1) {
        throw new Error('read v1 tenant DPA acceptance: missing tenant row')
      }

      expect(persistedV1.id).toBe(tenantV1.tenantId)
      expect(persistedV1.dpa_version).toBe('1.0-test')
      expect(new Date(persistedV1.dpa_accepted_at!).toISOString()).toBe(firstAcceptedAt)
      expect(persistedV1.dpa_accepted_by).toBe(user.userId)

      const newVersionRecorded = await ensureTenantDpaAcceptance(service, tenantV2.tenantId, secondAcceptance)
      expect(newVersionRecorded).toBe(true)

      const { data: persistedV2, error: persistedV2Error } = await service
        .from('tenants')
        .select('id, dpa_version, dpa_accepted_at, dpa_accepted_by')
        .eq('id', tenantV2.tenantId)
        .single()
      await assertNoSupabaseError('read v2 tenant DPA acceptance', persistedV2Error)
      expect(persistedV2).not.toBeNull()
      if (!persistedV2) {
        throw new Error('read v2 tenant DPA acceptance: missing tenant row')
      }

      expect(persistedV2.id).toBe(tenantV2.tenantId)
      expect(persistedV2.dpa_version).toBe('2.0-test')
      expect(new Date(persistedV2.dpa_accepted_at!).toISOString()).toBe(secondAcceptedAt)
      expect(persistedV2.dpa_accepted_by).toBe(user.userId)

      const { data: unchangedV1, error: unchangedV1Error } = await service
        .from('tenants')
        .select('dpa_version, dpa_accepted_at, dpa_accepted_by')
        .eq('id', tenantV1.tenantId)
        .single()
      await assertNoSupabaseError('re-read v1 tenant DPA acceptance', unchangedV1Error)

      expect(unchangedV1).toEqual({
        dpa_version: '1.0-test',
        dpa_accepted_at: persistedV1.dpa_accepted_at,
        dpa_accepted_by: user.userId,
      })
    } finally {
      await tenantV1.cleanup()
      await tenantV2.cleanup()
      await user.cleanup()
    }
  })
})
