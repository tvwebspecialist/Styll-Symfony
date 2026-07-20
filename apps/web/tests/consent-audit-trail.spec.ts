import { randomBytes } from 'crypto'
import { expect, test } from 'playwright/test'
import {
  applyClientConsentEvents,
  buildChurnProfilingEvent,
  buildMarketingConsentEvents,
  getConsentHistory,
  readClientConsentSnapshot,
  seedClientConsentState,
} from '../src/lib/consent-events'
import {
  CONSENT_ACTOR,
  CONSENT_CHANNEL,
  CONSENT_PURPOSE,
  CONSENT_SOURCE,
  CONSENT_STATUS,
  CONSENT_TEXT_VERSION,
} from '../src/lib/consent-copy'
import {
  hashMarketingUnsubscribeToken,
  revokeMarketingConsentWithToken,
} from '../src/lib/marketing-unsubscribe'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

interface ActorFixture {
  id: string
}

interface ClientFixture {
  clientId: string
  createdAt: string
}

async function createActor(service: ServiceClient, label: string): Promise<ActorFixture> {
  const email = `consent-audit-${label}-${randomSuffix()}@example.com`
  const password = randomBytes(18).toString('hex')
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError(`create consent actor ${label}`, error)

  const id = data.user?.id
  if (!id) {
    throw new Error(`create consent actor ${label}: missing id`)
  }

  return { id }
}

async function createRawClient(
  service: ServiceClient,
  params: {
    tenantId: string
    profileId?: string | null
    marketingConsent: boolean
    churnObjectedAt?: string | null
    fullName?: string
  },
): Promise<ClientFixture> {
  const now = new Date().toISOString()
  const { data, error } = await service
    .from('clients')
    .insert({
      tenant_id: params.tenantId,
      profile_id: params.profileId ?? null,
      full_name: params.fullName ?? 'Cliente Audit',
      email: `consent-client-${randomSuffix()}@example.com`,
      phone: '+39 333 555 0000',
      marketing_consent: params.marketingConsent,
      churn_profiling_objected_at: params.churnObjectedAt ?? null,
      created_at: now,
      updated_at: now,
      tags: [],
    })
    .select('id, created_at')
    .single()

  await assertNoSupabaseError('create raw consent client', error)

  if (!data?.id || !data.created_at) {
    throw new Error('create raw consent client: missing row')
  }

  return {
    clientId: data.id,
    createdAt: data.created_at,
  }
}

async function deleteActor(service: ServiceClient, actorId: string) {
  await service.auth.admin.deleteUser(actorId)
}

test.describe.serial('consent audit trail', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for consent audit fixtures.')

  test('marketing consent history stays append-only, ordered, tenant-scoped, and keeps the boolean cache coherent', async () => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('consent-history')
    const actor = await createActor(service, 'client-history')
    const client = await createRawClient(service, {
      tenantId: tenant.tenantId,
      profileId: actor.id,
      marketingConsent: false,
    })

    try {
      await seedClientConsentState(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        marketingAllowed: false,
        churnAllowed: true,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_EMAIL_OTP_BOOTSTRAP,
        occurredAt: '2026-07-10T09:00:00.000Z',
        metadata: { scenario: 'bootstrap' },
      })

      const initialHistory = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })
      expect(initialHistory).toHaveLength(3)
      const initialIds = new Set(initialHistory.map((event) => event.id))

      await applyClientConsentEvents(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
        events: buildMarketingConsentEvents({
          allowed: true,
          channel: CONSENT_CHANNEL.PWA,
          source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
          occurredAt: '2026-07-10T09:05:00.000Z',
          metadata: { scenario: 'grant' },
        }),
      })

      await applyClientConsentEvents(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
        events: buildMarketingConsentEvents({
          allowed: false,
          channel: CONSENT_CHANNEL.PWA,
          source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
          occurredAt: '2026-07-10T09:10:00.000Z',
          metadata: { scenario: 'revoke' },
        }),
      })

      const marketingEmailHistory = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        purpose: CONSENT_PURPOSE.MARKETING_EMAIL,
      })
      const marketingPushHistory = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        purpose: CONSENT_PURPOSE.MARKETING_PUSH,
      })
      const fullHistory = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })
      const snapshot = await readClientConsentSnapshot(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })

      expect(marketingEmailHistory.map((event) => [event.previous_status, event.status])).toEqual([
        [CONSENT_STATUS.UNKNOWN, CONSENT_STATUS.DISALLOWED],
        [CONSENT_STATUS.DISALLOWED, CONSENT_STATUS.ALLOWED],
        [CONSENT_STATUS.ALLOWED, CONSENT_STATUS.DISALLOWED],
      ])
      expect(marketingPushHistory.map((event) => [event.previous_status, event.status])).toEqual([
        [CONSENT_STATUS.UNKNOWN, CONSENT_STATUS.DISALLOWED],
        [CONSENT_STATUS.DISALLOWED, CONSENT_STATUS.ALLOWED],
        [CONSENT_STATUS.ALLOWED, CONSENT_STATUS.DISALLOWED],
      ])
      expect(
        marketingEmailHistory.every(
          (event) =>
            event.channel === CONSENT_CHANNEL.PWA
            && event.tenant_id === tenant.tenantId
            && event.client_id === client.clientId
            && event.purpose === CONSENT_PURPOSE.MARKETING_EMAIL,
        ),
      ).toBe(true)
      expect(marketingEmailHistory[1]?.consent_text_version).toBe(
        CONSENT_TEXT_VERSION.MARKETING_PWA_PREFERENCES,
      )
      expect(marketingEmailHistory[1]?.changed_by).toBe(CONSENT_ACTOR.CLIENT_PROFILE)
      expect(marketingEmailHistory[1]?.changed_by_profile_id).toBe(actor.id)
      expect(snapshot.marketing_consent).toBe(false)
      expect(snapshot.churn_profiling_objected_at).toBeNull()
      expect(fullHistory.every((event) => event.tenant_id === tenant.tenantId)).toBe(true)
      expect(
        fullHistory.map((event) => event.occurred_at).slice(0, 5),
      ).toEqual([
        '2026-07-10T09:00:00+00:00',
        '2026-07-10T09:00:00+00:00',
        '2026-07-10T09:00:00+00:00',
        '2026-07-10T09:05:00+00:00',
        '2026-07-10T09:05:00+00:00',
      ])
      expect(initialHistory.every((event) => initialIds.has(event.id))).toBe(true)
      expect(
        [...initialIds].every((id) => fullHistory.some((event) => event.id === id)),
      ).toBe(true)

      const directDelete = await service
        .from('consent_events')
        .delete()
        .eq('id', fullHistory[0]!.id)
      expect(directDelete.error).toBeTruthy()
    } finally {
      await tenant.cleanup()
      await deleteActor(service, actor.id)
    }
  })

  test('profiling objection history is append-only and keeps churn cache coherent', async () => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('consent-churn')
    const actor = await createActor(service, 'client-churn')
    const client = await createRawClient(service, {
      tenantId: tenant.tenantId,
      profileId: actor.id,
      marketingConsent: false,
    })

    try {
      await seedClientConsentState(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        marketingAllowed: false,
        churnAllowed: true,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_EMAIL_OTP_BOOTSTRAP,
        occurredAt: '2026-07-10T11:00:00.000Z',
        metadata: { scenario: 'bootstrap' },
      })

      await applyClientConsentEvents(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
        events: [
          buildChurnProfilingEvent({
            allowed: false,
            channel: CONSENT_CHANNEL.PWA,
            source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
            occurredAt: '2026-07-10T11:05:00.000Z',
            metadata: { scenario: 'object' },
          }),
        ],
      })

      await applyClientConsentEvents(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
        events: [
          buildChurnProfilingEvent({
            allowed: true,
            channel: CONSENT_CHANNEL.PWA,
            source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
            occurredAt: '2026-07-10T11:10:00.000Z',
            metadata: { scenario: 'allow-again' },
          }),
        ],
      })

      const history = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        purpose: CONSENT_PURPOSE.CHURN_PROFILING,
      })
      const snapshot = await readClientConsentSnapshot(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })

      expect(history.map((event) => [event.previous_status, event.status])).toEqual([
        [CONSENT_STATUS.UNKNOWN, CONSENT_STATUS.ALLOWED],
        [CONSENT_STATUS.ALLOWED, CONSENT_STATUS.DISALLOWED],
        [CONSENT_STATUS.DISALLOWED, CONSENT_STATUS.ALLOWED],
      ])
      expect(history[1]?.channel).toBe(CONSENT_CHANNEL.PWA)
      expect(history[1]?.consent_text_version).toBe(
        CONSENT_TEXT_VERSION.CHURN_PWA_PREFERENCES,
      )
      expect(snapshot.churn_profiling_objected_at).toBeNull()
    } finally {
      await tenant.cleanup()
      await deleteActor(service, actor.id)
    }
  })

  test('unsubscribe and repeated retry append revocation events without breaking the boolean cache', async () => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('consent-unsubscribe')
    const actor = await createActor(service, 'unsubscribe-baseline')
    const client = await createRawClient(service, {
      tenantId: tenant.tenantId,
      profileId: actor.id,
      marketingConsent: true,
    })

    try {
      await seedClientConsentState(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        marketingAllowed: true,
        churnAllowed: true,
        actor: CONSENT_ACTOR.STAFF_MEMBER,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.STAFF_DASHBOARD,
        occurredAt: '2026-07-10T12:00:00.000Z',
        metadata: { scenario: 'baseline-marketing-on' },
      })

      const { data: tokenRow, error: tokenError } = await service
        .from('marketing_unsubscribe_tokens')
        .insert({
          tenant_id: tenant.tenantId,
          client_id: client.clientId,
          token_hash: randomBytes(24).toString('hex'),
          expires_at: '2099-01-01T00:00:00.000Z',
        })
        .select('id')
        .single()
      await assertNoSupabaseError('create unsubscribe token row', tokenError)
      expect(tokenRow?.id).toBeTruthy()

      const rawToken = 'opaque-consent-audit-token'
      const hashed = hashMarketingUnsubscribeToken(rawToken)
      const { error: tokenUpdateError } = await service
        .from('marketing_unsubscribe_tokens')
        .update({ token_hash: hashed })
        .eq('id', tokenRow!.id)
      await assertNoSupabaseError('update unsubscribe token hash', tokenUpdateError)

      const first = await revokeMarketingConsentWithToken(service, {
        tenantId: tenant.tenantId,
        token: rawToken,
        requestContext: { ipAddress: '127.0.0.1', userAgent: 'playwright-unsubscribe' },
      })
      const second = await revokeMarketingConsentWithToken(service, {
        tenantId: tenant.tenantId,
        token: rawToken,
        requestContext: { ipAddress: '127.0.0.1', userAgent: 'playwright-unsubscribe' },
      })

      const emailHistory = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        purpose: CONSENT_PURPOSE.MARKETING_EMAIL,
      })
      const snapshot = await readClientConsentSnapshot(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })

      expect(first).toBe('revoked')
      expect(second).toBe('already_unsubscribed')
      expect(emailHistory.slice(-2).map((event) => event.source)).toEqual([
        CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK,
        CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK,
      ])
      expect(emailHistory.slice(-2).every((event) => event.channel === CONSENT_CHANNEL.EMAIL)).toBe(true)
      expect(emailHistory.slice(-2).every((event) => event.status === CONSENT_STATUS.DISALLOWED)).toBe(true)
      expect(emailHistory.slice(-2).every((event) => event.changed_by === CONSENT_ACTOR.UNSUBSCRIBE_LINK)).toBe(true)
      expect(emailHistory.slice(-2).every((event) => event.consent_text_version === CONSENT_TEXT_VERSION.MARKETING_UNSUBSCRIBE)).toBe(true)
      expect(snapshot.marketing_consent).toBe(false)
    } finally {
      await tenant.cleanup()
      await deleteActor(service, actor.id)
    }
  })

  test('concurrent identical revocations stay consistent and keep history append-only', async () => {
    const service = requireServiceClient()
    const tenant = await createTenantFixture('consent-concurrency')
    const actor = await createActor(service, 'concurrency')
    const client = await createRawClient(service, {
      tenantId: tenant.tenantId,
      profileId: actor.id,
      marketingConsent: true,
    })

    try {
      await seedClientConsentState(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        marketingAllowed: true,
        churnAllowed: true,
        actor: CONSENT_ACTOR.CLIENT_PROFILE,
        actorProfileId: actor.id,
        source: CONSENT_SOURCE.PWA_EMAIL_OTP_PROFILE,
        occurredAt: '2026-07-10T13:00:00.000Z',
        metadata: { scenario: 'baseline-on' },
      })

      await Promise.all([
        applyClientConsentEvents(service, {
          tenantId: tenant.tenantId,
          clientId: client.clientId,
          actor: CONSENT_ACTOR.CLIENT_PROFILE,
          actorProfileId: actor.id,
          source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
          events: buildMarketingConsentEvents({
            allowed: false,
            channel: CONSENT_CHANNEL.PWA,
            source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
            occurredAt: '2026-07-10T13:05:00.000Z',
            metadata: { scenario: 'concurrent-a' },
          }),
        }),
        applyClientConsentEvents(service, {
          tenantId: tenant.tenantId,
          clientId: client.clientId,
          actor: CONSENT_ACTOR.CLIENT_PROFILE,
          actorProfileId: actor.id,
          source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
          events: buildMarketingConsentEvents({
            allowed: false,
            channel: CONSENT_CHANNEL.PWA,
            source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
            occurredAt: '2026-07-10T13:05:01.000Z',
            metadata: { scenario: 'concurrent-b' },
          }),
        }),
      ])

      const history = await getConsentHistory(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
        purpose: CONSENT_PURPOSE.MARKETING_EMAIL,
      })
      const snapshot = await readClientConsentSnapshot(service, {
        tenantId: tenant.tenantId,
        clientId: client.clientId,
      })

      expect(history).toHaveLength(3)
      expect(history.at(-2)?.status).toBe(CONSENT_STATUS.DISALLOWED)
      expect(history.at(-1)?.status).toBe(CONSENT_STATUS.DISALLOWED)
      expect(snapshot.marketing_consent).toBe(false)
    } finally {
      await tenant.cleanup()
      await deleteActor(service, actor.id)
    }
  })

  test('legacy migration backfills missing events per tenant and invalid consent batches roll back atomically', async () => {
    const service = requireServiceClient()
    const tenantA = await createTenantFixture('consent-legacy-a')
    const tenantB = await createTenantFixture('consent-legacy-b')
    const actor = await createActor(service, 'legacy-admin')
    const clientA = await createRawClient(service, {
      tenantId: tenantA.tenantId,
      marketingConsent: true,
      churnObjectedAt: '2026-07-01T10:00:00.000Z',
    })
    const clientB = await createRawClient(service, {
      tenantId: tenantB.tenantId,
      marketingConsent: false,
    })

    try {
      const { data: insertedCount, error: backfillError } = await service.rpc(
        'backfill_missing_client_consent_events',
        { p_tenant_id: tenantA.tenantId },
      )
      await assertNoSupabaseError('backfill tenant A consent events', backfillError)
      expect(insertedCount).toBe(3)

      const tenantAHistory = await getConsentHistory(service, {
        tenantId: tenantA.tenantId,
        clientId: clientA.clientId,
      })
      const tenantBHistory = await getConsentHistory(service, {
        tenantId: tenantB.tenantId,
        clientId: clientB.clientId,
      })

      expect(tenantAHistory).toHaveLength(3)
      expect(tenantBHistory).toHaveLength(0)
      expect(tenantAHistory.every((event) => event.source === CONSENT_SOURCE.LEGACY_MIGRATION)).toBe(true)
      expect(tenantAHistory.every((event) => event.previous_status === CONSENT_STATUS.UNKNOWN)).toBe(true)
      expect(tenantAHistory.every((event) => event.consent_text_version === CONSENT_TEXT_VERSION.LEGACY_MIGRATION)).toBe(true)

      const { data: secondBackfill, error: secondBackfillError } = await service.rpc(
        'backfill_missing_client_consent_events',
        { p_tenant_id: tenantA.tenantId },
      )
      await assertNoSupabaseError('backfill tenant A consent events twice', secondBackfillError)
      expect(secondBackfill).toBe(0)

      const snapshotBeforeRollback = await readClientConsentSnapshot(service, {
        tenantId: tenantA.tenantId,
        clientId: clientA.clientId,
      })
      const historyCountBeforeRollback = tenantAHistory.length

      const invalidResult = await service.rpc('apply_client_consent_events', {
        p_tenant_id: tenantA.tenantId,
        p_client_id: clientA.clientId,
        p_changed_by: CONSENT_ACTOR.SUPERADMIN,
        p_changed_by_profile_id: actor.id,
        p_source: CONSENT_SOURCE.CLIENT_IMPORT,
        p_events: [
          {
            purpose: CONSENT_PURPOSE.MARKETING_EMAIL,
            channel: CONSENT_CHANNEL.IMPORT,
            status: CONSENT_STATUS.ALLOWED,
            consent_text: 'Invalid half-marketing batch',
            consent_text_version: 'invalid-test-v1',
            legal_basis: 'Art. 6(1)(a) GDPR — consenso marketing',
            occurred_at: '2026-07-10T14:00:00.000Z',
            metadata: { scenario: 'rollback' },
          },
        ],
      })

      expect(invalidResult.error).toBeTruthy()

      const historyAfterRollback = await getConsentHistory(service, {
        tenantId: tenantA.tenantId,
        clientId: clientA.clientId,
      })
      const snapshotAfterRollback = await readClientConsentSnapshot(service, {
        tenantId: tenantA.tenantId,
        clientId: clientA.clientId,
      })

      expect(historyAfterRollback).toHaveLength(historyCountBeforeRollback)
      expect(snapshotAfterRollback).toEqual(snapshotBeforeRollback)
    } finally {
      await tenantA.cleanup()
      await tenantB.cleanup()
      await deleteActor(service, actor.id)
    }
  })
})
