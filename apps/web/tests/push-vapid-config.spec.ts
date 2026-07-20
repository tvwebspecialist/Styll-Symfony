import { expect, test } from 'playwright/test'

const expectedState = process.env.PLAYWRIGHT_PUSH_EXPECTED_STATE ?? null
const configuredPrivateKey = process.env.VAPID_PRIVATE_KEY ?? ''

test.describe('push VAPID runtime contract', () => {
  test('the app stays reachable even when push is unavailable or misconfigured', async ({ request }) => {
    const response = await request.get('/')
    expect(response.ok()).toBeTruthy()
  })

  test('GET /api/push/subscribe exposes only the enabled public key and otherwise fails closed', async ({ request }) => {
    const response = await request.get('/api/push/subscribe')
    const rawBody = await response.text()
    const body = JSON.parse(rawBody) as Record<string, string>

    expect(rawBody).not.toContain('vapidPrivateKey')
    if (configuredPrivateKey) {
      expect(rawBody).not.toContain(configuredPrivateKey)
    }

    if (expectedState === 'enabled') {
      expect(response.status()).toBe(200)
      expect(body.vapidPublicKey).toBeTruthy()
      expect(body.code).toBeUndefined()
      return
    }

    if (expectedState === 'misconfigured') {
      expect(response.status()).toBe(500)
      expect(body.code).toBe('PUSH_MISCONFIGURED')
      expect(body.error).toBe('Push not available')
      return
    }

    if (expectedState === 'disabled') {
      expect(response.status()).toBe(503)
      expect(body.code).toBe('PUSH_DISABLED')
      expect(body.error).toBe('Push not available')
      return
    }

    expect([200, 500, 503]).toContain(response.status())
    if (response.status() === 200) {
      expect(body.vapidPublicKey).toBeTruthy()
      expect(body.code).toBeUndefined()
      return
    }

    expect(body.error).toBe('Push not available')
    expect(['PUSH_DISABLED', 'PUSH_MISCONFIGURED']).toContain(body.code)
  })
})
