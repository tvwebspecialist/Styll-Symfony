import { randomUUID } from 'crypto'
import { expect, test } from 'playwright/test'
import { buildTenantAppPath } from './helpers/e2e-env'
import {
  createTenantFixture,
  hasSupabaseSeedEnv,
  requireServiceClient,
} from './helpers/supabase-admin'
import {
  ANALYTICS_CONSENT_ANON_KEY,
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION_KEY,
} from '../src/lib/analytics-consent'
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_PREFERENCES_SECTION_ID,
} from '../src/lib/analytics-consent-copy'

type AnalyticsEventsDb = {
  from(table: 'site_events'): {
    select(columns: string, options: { count: 'exact'; head: true }): {
      eq(column: string, value: string): Promise<{ count: number | null; error: { message: string } | null }>
    }
  }
}

async function countSiteEvents(tenantId: string): Promise<number> {
  const service = requireServiceClient() as unknown as AnalyticsEventsDb
  const { count, error } = await service
    .from('site_events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`count site events: ${error.message}`)
  }

  return count ?? 0
}

async function readAnalyticsConsentEvents(params: {
  anonymousId: string
  host: string
}) {
  const service = requireServiceClient()
  const { data, error } = await service
    .from('analytics_consent_events')
    .select('status, source, policy_version, surface, host, metadata, occurred_at')
    .eq('anonymous_id', params.anonymousId)
    .eq('host', params.host)
    .order('occurred_at', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`read analytics consent events: ${error.message}`)
  }

  return data ?? []
}

test.describe('analytics consent preferences', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for analytics consent fixtures.')

  test('accept from banner stores server proof, footer reopens the center, and revocation stops tracking', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-consent')

    try {
      await page.addInitScript(([consentKey, versionKey, anonKey]) => {
        window.localStorage.removeItem(consentKey)
        window.localStorage.removeItem(versionKey)
        window.localStorage.removeItem(anonKey)
      }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

      const tenantPath = buildTenantAppPath(fixture.slug)
      await page.goto(tenantPath)

      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Gestisci preferenze' })).toHaveAttribute(
        'href',
        `/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}`,
      )
      await expect.poll(() => countSiteEvents(fixture.tenantId), { timeout: 2_000 }).toBe(0)

      await page.getByRole('button', { name: 'Accetta analytics' }).click()

      const anonymousId = await page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY)
      const cachedConsent = await page.evaluate((consentKey) => window.localStorage.getItem(consentKey), ANALYTICS_CONSENT_KEY)
      const cachedVersion = await page.evaluate((versionKey) => window.localStorage.getItem(versionKey), ANALYTICS_CONSENT_VERSION_KEY)
      const currentHost = await page.evaluate(() => window.location.hostname)

      expect(anonymousId).toBeTruthy()
      expect(cachedConsent).toBe('accepted')
      expect(cachedVersion).toBe(ANALYTICS_CONSENT_POLICY_VERSION)

      await expect.poll(async () => (await countSiteEvents(fixture.tenantId)) > 0, { timeout: 10_000 }).toBe(true)

      const acceptedEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(acceptedEvents).toHaveLength(1)
      expect(acceptedEvents[0]?.status).toBe('accepted')
      expect(acceptedEvents[0]?.source).toBe('BANNER')
      expect(acceptedEvents[0]?.policy_version).toBe(ANALYTICS_CONSENT_POLICY_VERSION)

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)

      await page.getByRole('link', { name: 'Gestisci cookie' }).click()
      await expect(page).toHaveURL(new RegExp(`/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
      await expect(page.getByRole('heading', { name: 'Preferenze analytics' })).toBeVisible()
      await expect(page.locator('body')).toContainText(ANALYTICS_CONSENT_POLICY_VERSION)
      await expect(page.locator('body')).toContainText('Analytics opzionali attivi')

      const countBeforeRevocation = await countSiteEvents(fixture.tenantId)
      await page.getByRole('button', { name: 'Revoca analytics' }).click()
      await expect(page.locator('body')).toContainText('Analytics opzionali disattivati')

      const routeSnapshot = await page.evaluate(async () => {
        const response = await fetch('/api/analytics-consent', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        })
        return response.json()
      })

      expect(routeSnapshot.state).toBe('rejected')
      expect(routeSnapshot.policyVersion).toBe(ANALYTICS_CONSENT_POLICY_VERSION)

      const allEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(allEvents).toHaveLength(2)
      expect(allEvents[1]?.status).toBe('rejected')
      expect(allEvents[1]?.source).toBe('COOKIE_POLICY')

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
      await expect.poll(() => countSiteEvents(fixture.tenantId), { timeout: 2_000 }).toBe(countBeforeRevocation)
    } finally {
      await fixture.cleanup()
    }
  })

  test('the preferences center is reachable from the banner and rejecting analytics records proof without starting tracking', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-reject')

    try {
      await page.addInitScript(([consentKey, versionKey, anonKey]) => {
        window.localStorage.removeItem(consentKey)
        window.localStorage.removeItem(versionKey)
        window.localStorage.removeItem(anonKey)
      }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

      const tenantPath = buildTenantAppPath(fixture.slug)
      await page.goto(tenantPath)

      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      await page.getByRole('link', { name: 'Gestisci preferenze' }).click()

      await expect(page).toHaveURL(new RegExp(`/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
      await expect(page.getByRole('heading', { name: 'Preferenze analytics' })).toBeVisible()
      await expect(page.locator('body')).toContainText('Scelta non ancora registrata')
      await expect(page.locator('body')).toContainText(ANALYTICS_CONSENT_POLICY_VERSION)

      await page.getByRole('button', { name: 'Continua senza analytics' }).click()
      await expect(page.locator('body')).toContainText('Analytics opzionali disattivati')

      const anonymousId = await page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY)
      const currentHost = await page.evaluate(() => window.location.hostname)
      expect(anonymousId).toBeTruthy()

      const rejectedEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(rejectedEvents).toHaveLength(1)
      expect(rejectedEvents[0]?.status).toBe('rejected')
      expect(rejectedEvents[0]?.source).toBe('COOKIE_POLICY')
      expect(rejectedEvents[0]?.policy_version).toBe(ANALYTICS_CONSENT_POLICY_VERSION)

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
      await expect.poll(() => countSiteEvents(fixture.tenantId), { timeout: 2_000 }).toBe(0)
    } finally {
      await fixture.cleanup()
    }
  })

  test('existing local analytics choice is backfilled server-side without showing the banner again', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-backfill')

    try {
      const anonymousId = randomUUID()
      await page.addInitScript(({ anonKey, anonymousId, consentKey }) => {
        window.localStorage.setItem(consentKey, 'accepted')
        window.localStorage.setItem(anonKey, anonymousId)
      }, {
        consentKey: ANALYTICS_CONSENT_KEY,
        anonKey: ANALYTICS_CONSENT_ANON_KEY,
        anonymousId,
      })

      const tenantPath = buildTenantAppPath(fixture.slug)
      await page.goto(tenantPath)

      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
      await expect.poll(async () => (await countSiteEvents(fixture.tenantId)) > 0, { timeout: 10_000 }).toBe(true)

      const currentHost = await page.evaluate(() => window.location.hostname)
      const events = await readAnalyticsConsentEvents({
        anonymousId,
        host: currentHost,
      })

      expect(events).toHaveLength(1)
      expect(events[0]?.source).toBe('LOCAL_STORAGE_MIGRATION')
      expect(events[0]?.status).toBe('accepted')
      expect(events[0]?.policy_version).toBe(ANALYTICS_CONSENT_POLICY_VERSION)
    } finally {
      await fixture.cleanup()
    }
  })
})
