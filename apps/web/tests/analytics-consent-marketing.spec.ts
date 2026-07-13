import { expect, test, type Page } from 'playwright/test'
import {
  ANALYTICS_CONSENT_ANON_KEY,
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_CONSENT_VERSION_KEY,
} from '../src/lib/analytics-consent'
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_CONSENT_SURFACE,
  ANALYTICS_PREFERENCES_SECTION_ID,
  buildAnalyticsPreferencesHref,
} from '../src/lib/analytics-consent-copy'

const PLATFORM_ANALYTICS_PREFERENCES_HREF = buildAnalyticsPreferencesHref({
  surface: ANALYTICS_CONSENT_SURFACE.PLATFORM,
})

async function installVercelAnalyticsSpy(page: Page) {
  const body = `
    window.__vaEvents = window.__vaEvents || [];
    window.__vaBeforeSend = null;
    const queued = Array.isArray(window.vaq) ? [...window.vaq] : [];
    window.va = function(type, payload) {
      if (type === 'beforeSend') {
        window.__vaBeforeSend = payload;
        return;
      }

      const beforeSend = window.__vaBeforeSend;
      if (typeof beforeSend === 'function') {
        const event = {
          type: type === 'pageview' ? 'pageview' : 'event',
          url: window.location.href,
        };
        if (!beforeSend(event)) {
          return;
        }
      }

      window.__vaEvents.push([type, payload]);
    };
    window.vaq = [];
    for (const args of queued) {
      window.va.apply(window, args);
    }
  `

  await page.route('https://va.vercel-scripts.com/v1/script.debug.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body,
    })
  })

  await page.route('**/_vercel/insights/script.js', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body,
    })
  })
}

async function readVercelEventCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    return Array.isArray((window as { __vaEvents?: unknown[] }).__vaEvents)
      ? (window as { __vaEvents?: unknown[] }).__vaEvents?.length ?? 0
      : 0
  })
}

async function installPostHogCounter(page: Page): Promise<() => number> {
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
  let count = 0

  await page.route(`${host}/**`, async (route) => {
    count += 1
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
      },
      body: '{"status":1}',
    })
  })

  return () => count
}

test.describe('marketing analytics consent', () => {
  test('accepting consent enables Vercel and PostHog, and revocation stops them again', async ({ page }) => {
    await installVercelAnalyticsSpy(page)
    const getPostHogCount = await installPostHogCounter(page)

    await page.addInitScript((keys: string[]) => {
      const [consentKey, versionKey, anonKey] = keys
      window.localStorage.removeItem(consentKey)
      window.localStorage.removeItem(versionKey)
      window.localStorage.removeItem(anonKey)
    }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

    await page.goto('/')

    await expect(page.getByText('Usiamo i cookie')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gestisci preferenze' })).toHaveAttribute(
      'href',
      PLATFORM_ANALYTICS_PREFERENCES_HREF,
    )

    expect(await readVercelEventCount(page)).toBe(0)
    expect(getPostHogCount()).toBe(0)

    await page.getByRole('button', { name: 'Accetta analytics' }).click()
    await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)

    await expect.poll(async () => (await readVercelEventCount(page)) > 0, { timeout: 5_000 }).toBe(true)
    const posthogEnabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
    if (posthogEnabled) {
      await expect.poll(() => getPostHogCount() > 0, { timeout: 5_000 }).toBe(true)
    }

    expect(await page.evaluate((key: string) => window.localStorage.getItem(key), ANALYTICS_CONSENT_KEY)).toBe('accepted')
    expect(await page.evaluate((key: string) => window.localStorage.getItem(key), ANALYTICS_CONSENT_VERSION_KEY)).toBe(
      ANALYTICS_CONSENT_POLICY_VERSION,
    )

    const footerManageLink = page.locator('footer').getByRole('link', { name: 'Gestisci cookie' })
    await expect(footerManageLink).toHaveAttribute('href', PLATFORM_ANALYTICS_PREFERENCES_HREF)
    await page.goto(PLATFORM_ANALYTICS_PREFERENCES_HREF)
    await expect(page).toHaveURL(new RegExp(`/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
    await expect(page.locator('body')).toContainText('Ultima scelta registrata lato server')

    const posthogRequestsBeforeRevocation = getPostHogCount()

    await page.getByRole('button', { name: 'Revoca analytics' }).click()
    await expect(page.locator('body')).toContainText('Analytics opzionali disattivati')
    expect(await page.evaluate((key: string) => window.localStorage.getItem(key), ANALYTICS_CONSENT_KEY)).toBe('rejected')

    await page.goto('/')
    await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
    await page.waitForTimeout(250)

    expect(await readVercelEventCount(page)).toBe(0)
    if (posthogEnabled) {
      expect(getPostHogCount()).toBe(posthogRequestsBeforeRevocation)
    }
  })

  test('rejecting analytics persists the choice and keeps marketing trackers off', async ({ page }) => {
    await installVercelAnalyticsSpy(page)
    const getPostHogCount = await installPostHogCounter(page)

    await page.addInitScript((keys: string[]) => {
      const [consentKey, versionKey, anonKey] = keys
      window.localStorage.removeItem(consentKey)
      window.localStorage.removeItem(versionKey)
      window.localStorage.removeItem(anonKey)
    }, [ANALYTICS_CONSENT_KEY, ANALYTICS_CONSENT_VERSION_KEY, ANALYTICS_CONSENT_ANON_KEY])

    await page.goto('/')

    await expect(page.getByText('Usiamo i cookie')).toBeVisible()
    await page.getByRole('link', { name: 'Gestisci preferenze' }).click()

    await expect(page).toHaveURL(new RegExp(`/cookie#${ANALYTICS_PREFERENCES_SECTION_ID}$`))
    await expect(page.locator('body')).toContainText(ANALYTICS_CONSENT_POLICY_VERSION)

    await page.locator(`#${ANALYTICS_PREFERENCES_SECTION_ID}`).getByRole('button', { name: 'Continua senza analytics' }).click()
    await expect(page.locator('body')).toContainText('Analytics opzionali disattivati')
    await expect(page.locator('body')).toContainText('Ultima scelta registrata lato server')

    expect(await page.evaluate((key: string) => window.localStorage.getItem(key), ANALYTICS_CONSENT_KEY)).toBe('rejected')
    expect(await page.evaluate((key: string) => window.localStorage.getItem(key), ANALYTICS_CONSENT_VERSION_KEY)).toBe(
      ANALYTICS_CONSENT_POLICY_VERSION,
    )

    await page.goto('/')
    await expect(page.getByText('Usiamo i cookie')).toHaveCount(0)
    await page.waitForTimeout(250)

    expect(await readVercelEventCount(page)).toBe(0)
    expect(getPostHogCount()).toBe(0)
  })
})
