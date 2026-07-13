import { randomUUID } from 'crypto'
import { expect, test, type Page, type Request as PWRequest, type Response as PWResponse } from 'playwright/test'
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
  ANALYTICS_CONSENT_COPY,
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_PREFERENCES_SECTION_ID,
} from '../src/lib/analytics-consent-copy'

type AnalyticsEventsDb = {
  from(table: 'site_events'): {
    select(columns: string): {
      eq(column: string, value: string): {
        limit(count: number): Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }>
      }
    }
  }
}

async function readSiteEventIds(tenantId: string): Promise<string[]> {
  const service = requireServiceClient() as unknown as AnalyticsEventsDb
  const { data, error } = await service
    .from('site_events')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(20)

  if (error) {
    throw new Error(`read site events: ${error.message}`)
  }

  return (data ?? []).map((row) => row.id).sort()
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

function trackSiteAnalyticsRequests(page: Page) {
  let pending = 0
  let lastActivityAt = Date.now()
  let successfulResponses = 0

  const markActivity = () => {
    lastActivityAt = Date.now()
  }

  const handleRequest = (request: PWRequest) => {
    if (!request.url().includes('/api/site-analytics/track')) return
    pending += 1
    markActivity()
  }

  const handleResponse = (response: PWResponse) => {
    if (!response.url().includes('/api/site-analytics/track')) return
    pending = Math.max(0, pending - 1)
    if (response.status() >= 200 && response.status() < 300) {
      successfulResponses += 1
    }
    markActivity()
  }

  const handleRequestFailed = (request: PWRequest) => {
    if (!request.url().includes('/api/site-analytics/track')) return
    pending = Math.max(0, pending - 1)
    markActivity()
  }

  page.on('request', handleRequest)
  page.on('response', handleResponse)
  page.on('requestfailed', handleRequestFailed)

  return {
    successfulResponses() {
      return successfulResponses
    },
    async waitForSuccessfulResponsesAtLeast(expected: number) {
      await expect.poll(() => successfulResponses, { timeout: 10_000 }).toBeGreaterThanOrEqual(expected)
    },
    async waitForIdle() {
      await expect.poll(
        () => (pending === 0 && Date.now() - lastActivityAt >= 200 ? 'idle' : 'busy'),
        { timeout: 10_000 },
      ).toBe('idle')
    },
    dispose() {
      page.off('request', handleRequest)
      page.off('response', handleResponse)
      page.off('requestfailed', handleRequestFailed)
    },
  }
}

test.describe('analytics consent preferences', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for analytics consent fixtures.')

  test('accept from banner stores server proof, footer reopens the center, and revocation stops tracking', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-consent')
    const siteAnalytics = trackSiteAnalyticsRequests(page)

    try {
      await page.addInitScript(([consentKey, versionKey, anonKey]) => {
        window.localStorage.removeItem(consentKey)
        window.localStorage.removeItem(versionKey)
        window.localStorage.removeItem(anonKey)
      }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

      const tenantPath = buildTenantAppPath(fixture.slug)
      await page.goto(tenantPath)

      const tenantCookiePath = buildTenantAppPath(fixture.slug, '/cookie')
      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Gestisci preferenze' })).toHaveAttribute(
        'href',
        `${tenantCookiePath}#${ANALYTICS_PREFERENCES_SECTION_ID}`,
      )
      await expect.poll(() => readSiteEventIds(fixture.tenantId), { timeout: 2_000 }).toEqual([])

      await page.getByRole('button', { name: 'Accetta analytics' }).click()

      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)

      await expect.poll(
        () => page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY),
        { timeout: 5_000 },
      ).not.toBeNull()
      await expect.poll(
        () => page.evaluate((consentKey) => window.localStorage.getItem(consentKey), ANALYTICS_CONSENT_KEY),
        { timeout: 5_000 },
      ).toBe('accepted')
      await expect.poll(
        () => page.evaluate((versionKey) => window.localStorage.getItem(versionKey), ANALYTICS_CONSENT_VERSION_KEY),
        { timeout: 5_000 },
      ).toBe(ANALYTICS_CONSENT_POLICY_VERSION)

      const anonymousId = await page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY)
      const cachedConsent = await page.evaluate((consentKey) => window.localStorage.getItem(consentKey), ANALYTICS_CONSENT_KEY)
      const cachedVersion = await page.evaluate((versionKey) => window.localStorage.getItem(versionKey), ANALYTICS_CONSENT_VERSION_KEY)
      const currentHost = await page.evaluate(() => window.location.hostname)

      expect(anonymousId).toBeTruthy()
      expect(cachedConsent).toBe('accepted')
      expect(cachedVersion).toBe(ANALYTICS_CONSENT_POLICY_VERSION)
      expect(await page.evaluate(() => document.cookie)).not.toContain('styll_cookie_consent_v1=')

      await siteAnalytics.waitForSuccessfulResponsesAtLeast(1)
      await siteAnalytics.waitForIdle()
      await expect.poll(async () => (await readSiteEventIds(fixture.tenantId)).length > 0, { timeout: 2_000 }).toBe(true)

      const acceptedEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(acceptedEvents).toHaveLength(1)
      expect(acceptedEvents[0]?.status).toBe('accepted')
      expect(acceptedEvents[0]?.source).toBe('BANNER')
      expect(acceptedEvents[0]?.policy_version).toBe(ANALYTICS_CONSENT_POLICY_VERSION)
      expect(acceptedEvents[0]?.occurred_at).toBeTruthy()

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)

      await page.getByRole('link', { name: 'Gestisci cookie' }).click()
      await expect(page).toHaveURL(new RegExp(`/tenant/app/${fixture.slug}/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
      await expect(page.getByRole('heading', { name: 'Preferenze analytics', exact: true })).toBeVisible()
      await expect(page.locator('body')).toContainText(ANALYTICS_CONSENT_POLICY_VERSION)
      await expect(page.locator('body')).toContainText('Analytics opzionali attivi')
      await expect(page.locator('body')).toContainText('Ultima scelta registrata lato server')

      await siteAnalytics.waitForIdle()
      const siteEventIdsBeforeRevocation = await readSiteEventIds(fixture.tenantId)
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
      expect(routeSnapshot.occurredAt).toBeTruthy()

      const allEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(allEvents).toHaveLength(2)
      expect(allEvents[1]?.status).toBe('rejected')
      expect(allEvents[1]?.source).toBe('PREFERENCES_CENTER')
      expect(allEvents[1]?.occurred_at).toBeTruthy()

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
      await siteAnalytics.waitForIdle()
      await expect.poll(() => readSiteEventIds(fixture.tenantId), { timeout: 2_000 }).toEqual(siteEventIdsBeforeRevocation)
    } finally {
      siteAnalytics.dispose()
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

      await expect(page).toHaveURL(new RegExp(`/tenant/app/${fixture.slug}/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
      await expect(page.getByRole('heading', { name: 'Preferenze analytics', exact: true })).toBeVisible()
      await expect(page.locator('body')).toContainText('Scelta non ancora registrata')
      await expect(page.locator('body')).toContainText(ANALYTICS_CONSENT_POLICY_VERSION)
      await expect(page.getByRole('link', { name: '← Torna all’app' })).toHaveAttribute('href', tenantPath)
      await expect(page.getByRole('link', { name: 'Gestisci preferenze' })).toHaveCount(1)

      await page.locator(`#${ANALYTICS_PREFERENCES_SECTION_ID}`).getByRole('button', { name: 'Continua senza analytics' }).click()
      await expect(page.locator('body')).toContainText('Analytics opzionali disattivati')
      await expect(page.locator('body')).toContainText('Ultima scelta registrata lato server')

      const anonymousId = await page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY)
      const currentHost = await page.evaluate(() => window.location.hostname)
      expect(anonymousId).toBeTruthy()

      const rejectedEvents = await readAnalyticsConsentEvents({
        anonymousId: anonymousId!,
        host: currentHost,
      })
      expect(rejectedEvents).toHaveLength(1)
      expect(rejectedEvents[0]?.status).toBe('rejected')
      expect(rejectedEvents[0]?.source).toBe('PREFERENCES_CENTER')
      expect(rejectedEvents[0]?.policy_version).toBe(ANALYTICS_CONSENT_POLICY_VERSION)
      expect(rejectedEvents[0]?.occurred_at).toBeTruthy()

      await page.goto(tenantPath)
      await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
      await expect.poll(() => readSiteEventIds(fixture.tenantId), { timeout: 2_000 }).toEqual([])
    } finally {
      await fixture.cleanup()
    }
  })

  test('existing local analytics choice is backfilled server-side without showing the banner again', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-backfill')
    const siteAnalytics = trackSiteAnalyticsRequests(page)

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
      await expect.poll(
        () => page.evaluate((versionKey) => window.localStorage.getItem(versionKey), ANALYTICS_CONSENT_VERSION_KEY),
        { timeout: 5_000 },
      ).toBe(ANALYTICS_CONSENT_POLICY_VERSION)
      await siteAnalytics.waitForSuccessfulResponsesAtLeast(1)
      await siteAnalytics.waitForIdle()
      await expect.poll(async () => (await readSiteEventIds(fixture.tenantId)).length > 0, { timeout: 2_000 }).toBe(true)

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
      siteAnalytics.dispose()
      await fixture.cleanup()
    }
  })

  test('a failed save never turns localStorage into the source of truth and keeps tracking disabled', async ({ page }) => {
    const fixture = await createTenantFixture('analytics-consent-failure')

    try {
      await page.addInitScript(([consentKey, versionKey, anonKey]) => {
        window.localStorage.removeItem(consentKey)
        window.localStorage.removeItem(versionKey)
        window.localStorage.removeItem(anonKey)
      }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

      await page.route(/\/api\/analytics-consent(?:\?.*)?$/, async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'persist_failed' }),
          })
          return
        }

        await route.continue()
      })

      const tenantPath = buildTenantAppPath(fixture.slug)
      await page.goto(tenantPath)

      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      await page.getByRole('button', { name: 'Accetta analytics' }).click()

      await expect(page.getByText(ANALYTICS_CONSENT_COPY.saveError)).toBeVisible()
      await expect(page.getByText('Usiamo i cookie')).toBeVisible()
      const cachedConsent = await page.evaluate((consentKey) => window.localStorage.getItem(consentKey), ANALYTICS_CONSENT_KEY)
      const cachedVersion = await page.evaluate((versionKey) => window.localStorage.getItem(versionKey), ANALYTICS_CONSENT_VERSION_KEY)
      const anonymousId = await page.evaluate((anonKey) => window.localStorage.getItem(anonKey), ANALYTICS_CONSENT_ANON_KEY)
      const currentHost = await page.evaluate(() => window.location.hostname)
      expect(cachedConsent).toBeNull()
      expect(cachedVersion).toBeNull()

      if (anonymousId) {
        const persistedEvents = await readAnalyticsConsentEvents({
          anonymousId,
          host: currentHost,
        })
        expect(persistedEvents).toHaveLength(0)
      }

      const routeSnapshot = await page.evaluate(async () => {
        const response = await fetch('/api/analytics-consent', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        })
        return response.json()
      })

      expect(routeSnapshot.state).toBe('unknown')
      await expect.poll(() => readSiteEventIds(fixture.tenantId), { timeout: 2_000 }).toEqual([])
    } finally {
      await fixture.cleanup()
    }
  })
})
