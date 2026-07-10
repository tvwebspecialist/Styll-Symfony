import { isIP } from 'node:net'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, Tables, TablesInsert } from '@/types'
import {
  buildChurnDefaultActiveConsentText,
  buildChurnPreferencesConsentText,
  buildLegacyMigrationConsentText,
  buildMarketingBackofficeConsentText,
  buildMarketingDefaultOffConsentText,
  buildMarketingEmailPasswordConsentText,
  buildMarketingImportConsentText,
  buildMarketingPreferencesConsentText,
  buildMarketingSignupConsentText,
  buildMarketingUnsubscribeConsentText,
  CONSENT_ACTOR,
  CONSENT_CHANNEL,
  CONSENT_LEGAL_BASIS_BY_PURPOSE,
  CONSENT_PURPOSE,
  CONSENT_SOURCE,
  CONSENT_STATUS,
  CONSENT_TEXT_VERSION,
  type ConsentActor,
  type ConsentChannel,
  type ConsentPurpose,
  type ConsentSource,
  type ConsentStatus,
} from './consent-copy'

type ConsentDb = Pick<ReturnType<typeof createAdminClient>, 'from' | 'rpc'>
type HeaderReader = { get(name: string): string | null }

export interface ConsentRequestContext {
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ConsentEventPayload {
  channel: ConsentChannel
  consentText: string
  consentTextVersion: string
  ipAddress?: string | null
  legalBasis: string
  metadata?: Record<string, Json>
  occurredAt?: string
  purpose: ConsentPurpose
  status: Exclude<ConsentStatus, 'UNKNOWN'>
  userAgent?: string | null
}

export interface ConsentActorContext {
  actor: ConsentActor
  actorProfileId?: string | null
  source: ConsentSource
}

export interface ConsentHistoryFilters {
  clientId: string
  purpose?: ConsentPurpose
  tenantId: string
}

export type ConsentHistoryRow = Tables<'consent_events'>

export function extractConsentRequestContext(
  headerStore: HeaderReader,
): ConsentRequestContext {
  const forwardedFor = headerStore.get('x-forwarded-for')
  const realIp = headerStore.get('x-real-ip')
  const userAgent = headerStore.get('user-agent')?.trim() || null

  const candidate =
    forwardedFor?.split(',')[0]?.trim()
    || realIp?.trim()
    || null

  const normalizedIp = candidate && isIP(candidate) ? candidate : null

  return {
    ipAddress: normalizedIp,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  }
}

function buildEventMetadata(
  base: Record<string, Json> | undefined,
  extra: Record<string, Json>,
): Record<string, Json> {
  return {
    ...(base ?? {}),
    ...extra,
  }
}

function resolveMarketingTextSnapshot(
  source: ConsentSource,
  status: Exclude<ConsentStatus, 'UNKNOWN'>,
  businessName?: string,
): { consentText: string; consentTextVersion: string } {
  switch (source) {
    case CONSENT_SOURCE.PWA_EMAIL_OTP_PROFILE:
      return {
        consentText: buildMarketingSignupConsentText(businessName),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_PWA_SIGNUP,
      }
    case CONSENT_SOURCE.PWA_PROFILE_PREFERENCES:
      return {
        consentText: buildMarketingPreferencesConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_PWA_PREFERENCES,
      }
    case CONSENT_SOURCE.STAFF_DASHBOARD:
    case CONSENT_SOURCE.SUPERADMIN_PANEL:
    case CONSENT_SOURCE.SUPERADMIN_SEED:
      return {
        consentText: buildMarketingBackofficeConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_BACKOFFICE,
      }
    case CONSENT_SOURCE.CLIENT_IMPORT:
      return {
        consentText: buildMarketingImportConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_IMPORT,
      }
    case CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK:
      return {
        consentText: buildMarketingUnsubscribeConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_UNSUBSCRIBE,
      }
    case CONSENT_SOURCE.EMAIL_PASSWORD_BOOTSTRAP:
      return {
        consentText:
          status === CONSENT_STATUS.ALLOWED
            ? buildMarketingEmailPasswordConsentText()
            : buildMarketingDefaultOffConsentText(),
        consentTextVersion:
          status === CONSENT_STATUS.ALLOWED
            ? CONSENT_TEXT_VERSION.MARKETING_EMAIL_PASSWORD
            : CONSENT_TEXT_VERSION.MARKETING_DEFAULT_OFF,
      }
    case CONSENT_SOURCE.LEGACY_MIGRATION:
      return {
        consentText: buildLegacyMigrationConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.LEGACY_MIGRATION,
      }
    case CONSENT_SOURCE.GUEST_BOOKING:
    case CONSENT_SOURCE.GOOGLE_AUTH_BOOTSTRAP:
    case CONSENT_SOURCE.PHONE_OTP_BOOTSTRAP:
    case CONSENT_SOURCE.PWA_EMAIL_OTP_BOOTSTRAP:
    default:
      return {
        consentText: buildMarketingDefaultOffConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.MARKETING_DEFAULT_OFF,
      }
  }
}

function resolveChurnTextSnapshot(
  source: ConsentSource,
): { consentText: string; consentTextVersion: string } {
  switch (source) {
    case CONSENT_SOURCE.PWA_PROFILE_PREFERENCES:
      return {
        consentText: buildChurnPreferencesConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.CHURN_PWA_PREFERENCES,
      }
    case CONSENT_SOURCE.LEGACY_MIGRATION:
      return {
        consentText: buildLegacyMigrationConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.LEGACY_MIGRATION,
      }
    default:
      return {
        consentText: buildChurnDefaultActiveConsentText(),
        consentTextVersion: CONSENT_TEXT_VERSION.CHURN_DEFAULT_ACTIVE,
      }
  }
}

export function buildMarketingConsentEvents(params: {
  allowed: boolean
  businessName?: string
  channel: ConsentChannel
  ipAddress?: string | null
  metadata?: Record<string, Json>
  occurredAt?: string
  source: ConsentSource
  userAgent?: string | null
}): ConsentEventPayload[] {
  const status = params.allowed ? CONSENT_STATUS.ALLOWED : CONSENT_STATUS.DISALLOWED
  const { consentText, consentTextVersion } = resolveMarketingTextSnapshot(
    params.source,
    status,
    params.businessName,
  )

  return [CONSENT_PURPOSE.MARKETING_EMAIL, CONSENT_PURPOSE.MARKETING_PUSH].map((purpose) => ({
    purpose,
    channel: params.channel,
    status,
    occurredAt: params.occurredAt,
    consentText,
    consentTextVersion,
    legalBasis: CONSENT_LEGAL_BASIS_BY_PURPOSE[purpose],
    ipAddress: params.ipAddress ?? null,
    metadata: buildEventMetadata(params.metadata, {
      boolean_field: 'marketing_consent',
      purpose_group: 'marketing',
      explicit_user_action:
        params.source === CONSENT_SOURCE.PWA_EMAIL_OTP_PROFILE
        || params.source === CONSENT_SOURCE.PWA_PROFILE_PREFERENCES
        || params.source === CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK,
    }),
    userAgent: params.userAgent ?? null,
  }))
}

export function buildChurnProfilingEvent(params: {
  allowed: boolean
  channel: ConsentChannel
  ipAddress?: string | null
  metadata?: Record<string, Json>
  occurredAt?: string
  source: ConsentSource
  userAgent?: string | null
}): ConsentEventPayload {
  const status = params.allowed ? CONSENT_STATUS.ALLOWED : CONSENT_STATUS.DISALLOWED
  const { consentText, consentTextVersion } = resolveChurnTextSnapshot(params.source)

  return {
    purpose: CONSENT_PURPOSE.CHURN_PROFILING,
    channel: params.channel,
    status,
    occurredAt: params.occurredAt,
    consentText,
    consentTextVersion,
    legalBasis: CONSENT_LEGAL_BASIS_BY_PURPOSE[CONSENT_PURPOSE.CHURN_PROFILING],
    ipAddress: params.ipAddress ?? null,
    metadata: buildEventMetadata(params.metadata, {
      boolean_field: 'churn_profiling_objected_at',
      purpose_group: 'profiling',
      explicit_user_action: params.source === CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
    }),
    userAgent: params.userAgent ?? null,
  }
}

export async function applyClientConsentEvents(
  db: ConsentDb,
  params: ConsentActorContext & {
    clientId: string
    events: ConsentEventPayload[]
    tenantId: string
  },
): Promise<number> {
  const rpcEvents = params.events.map((event) => ({
    purpose: event.purpose,
    channel: event.channel,
    status: event.status,
    consent_text: event.consentText,
    consent_text_version: event.consentTextVersion,
    ip_address: event.ipAddress ?? null,
    legal_basis: event.legalBasis,
    occurred_at: event.occurredAt ?? null,
    metadata: event.metadata ?? {},
    user_agent: event.userAgent ?? null,
  }))

  const { data, error } = await db.rpc('apply_client_consent_events', {
    p_client_id: params.clientId,
    p_tenant_id: params.tenantId,
    p_changed_by: params.actor,
    p_changed_by_profile_id: params.actorProfileId ?? null,
    p_source: params.source,
    p_events: rpcEvents as unknown as Json,
  })

  if (error) {
    throw new Error(`Errore registrazione consenso: ${error.message}`)
  }

  return Number(data ?? 0)
}

export async function seedClientConsentState(
  db: ConsentDb,
  params: ConsentActorContext & ConsentRequestContext & {
    businessName?: string
    clientId: string
    occurredAt?: string
    churnAllowed: boolean
    marketingAllowed: boolean
    metadata?: Record<string, Json>
    tenantId: string
  },
): Promise<number> {
  return applyClientConsentEvents(db, {
    tenantId: params.tenantId,
    clientId: params.clientId,
    actor: params.actor,
    actorProfileId: params.actorProfileId ?? null,
    source: params.source,
    events: [
      ...buildMarketingConsentEvents({
        allowed: params.marketingAllowed,
        businessName: params.businessName,
        channel: params.source === CONSENT_SOURCE.CLIENT_IMPORT
          ? CONSENT_CHANNEL.IMPORT
          : params.source === CONSENT_SOURCE.STAFF_DASHBOARD
            || params.source === CONSENT_SOURCE.SUPERADMIN_PANEL
            || params.source === CONSENT_SOURCE.SUPERADMIN_SEED
            ? CONSENT_CHANNEL.BACKOFFICE
            : params.source === CONSENT_SOURCE.LEGACY_MIGRATION
              ? CONSENT_CHANNEL.SYSTEM
              : CONSENT_CHANNEL.PWA,
        occurredAt: params.occurredAt,
        source: params.source,
        metadata: buildEventMetadata(params.metadata, {
          ip_address_present: Boolean(params.ipAddress),
          user_agent_present: Boolean(params.userAgent),
        }),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      }),
      buildChurnProfilingEvent({
        allowed: params.churnAllowed,
        channel: params.source === CONSENT_SOURCE.LEGACY_MIGRATION
          ? CONSENT_CHANNEL.SYSTEM
          : params.source === CONSENT_SOURCE.CLIENT_IMPORT
            ? CONSENT_CHANNEL.IMPORT
            : params.source === CONSENT_SOURCE.STAFF_DASHBOARD
              || params.source === CONSENT_SOURCE.SUPERADMIN_PANEL
              || params.source === CONSENT_SOURCE.SUPERADMIN_SEED
              ? CONSENT_CHANNEL.BACKOFFICE
              : CONSENT_CHANNEL.PWA,
        occurredAt: params.occurredAt,
        source: params.source,
        metadata: buildEventMetadata(params.metadata, {
          ip_address_present: Boolean(params.ipAddress),
          user_agent_present: Boolean(params.userAgent),
        }),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      }),
    ],
  })
}

export async function getConsentHistory(
  db: ConsentDb,
  params: ConsentHistoryFilters,
): Promise<ConsentHistoryRow[]> {
  let query = db
    .from('consent_events')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('client_id', params.clientId)
    .order('occurred_at', { ascending: true })
    .order('created_at', { ascending: true })

  if (params.purpose) {
    query = query.eq('purpose', params.purpose)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Errore lettura storico consensi: ${error.message}`)
  }

  return (data ?? []) as ConsentHistoryRow[]
}

export async function readClientConsentSnapshot(
  db: ConsentDb,
  params: { clientId: string; tenantId: string },
): Promise<Pick<Tables<'clients'>, 'churn_profiling_objected_at' | 'marketing_consent'>> {
  const { data, error } = await db
    .from('clients')
    .select('marketing_consent, churn_profiling_objected_at')
    .eq('tenant_id', params.tenantId)
    .eq('id', params.clientId)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    throw new Error(`Errore lettura snapshot consenso cliente: ${error?.message ?? 'record mancante'}`)
  }

  return data
}

export function buildLegacyMigrationEventRows(params: {
  client: Pick<Tables<'clients'>, 'churn_profiling_objected_at' | 'created_at' | 'marketing_consent' | 'updated_at'>
  tenantId: string
  clientId: string
}): TablesInsert<'consent_events'>[] {
  const occurredAt = params.client.updated_at || params.client.created_at
  const legacyText = buildLegacyMigrationConsentText()
  const marketingStatus = params.client.marketing_consent
    ? CONSENT_STATUS.ALLOWED
    : CONSENT_STATUS.DISALLOWED
  const churnStatus = params.client.churn_profiling_objected_at
    ? CONSENT_STATUS.DISALLOWED
    : CONSENT_STATUS.ALLOWED

  return [
    {
      tenant_id: params.tenantId,
      client_id: params.clientId,
      purpose: CONSENT_PURPOSE.MARKETING_EMAIL,
      channel: CONSENT_CHANNEL.SYSTEM,
      status: marketingStatus,
      previous_status: CONSENT_STATUS.UNKNOWN,
      consent_text: legacyText,
      consent_text_version: CONSENT_TEXT_VERSION.LEGACY_MIGRATION,
      legal_basis: CONSENT_LEGAL_BASIS_BY_PURPOSE[CONSENT_PURPOSE.MARKETING_EMAIL],
      source: CONSENT_SOURCE.LEGACY_MIGRATION,
      changed_by: CONSENT_ACTOR.LEGACY_MIGRATION,
      changed_by_profile_id: null,
      occurred_at: occurredAt,
      ip_address: null,
      user_agent: null,
      metadata: {
        inferred_from_legacy_field: 'marketing_consent',
      } as unknown as Json,
    },
    {
      tenant_id: params.tenantId,
      client_id: params.clientId,
      purpose: CONSENT_PURPOSE.MARKETING_PUSH,
      channel: CONSENT_CHANNEL.SYSTEM,
      status: marketingStatus,
      previous_status: CONSENT_STATUS.UNKNOWN,
      consent_text: legacyText,
      consent_text_version: CONSENT_TEXT_VERSION.LEGACY_MIGRATION,
      legal_basis: CONSENT_LEGAL_BASIS_BY_PURPOSE[CONSENT_PURPOSE.MARKETING_PUSH],
      source: CONSENT_SOURCE.LEGACY_MIGRATION,
      changed_by: CONSENT_ACTOR.LEGACY_MIGRATION,
      changed_by_profile_id: null,
      occurred_at: occurredAt,
      ip_address: null,
      user_agent: null,
      metadata: {
        inferred_from_legacy_field: 'marketing_consent',
      } as unknown as Json,
    },
    {
      tenant_id: params.tenantId,
      client_id: params.clientId,
      purpose: CONSENT_PURPOSE.CHURN_PROFILING,
      channel: CONSENT_CHANNEL.SYSTEM,
      status: churnStatus,
      previous_status: CONSENT_STATUS.UNKNOWN,
      consent_text: legacyText,
      consent_text_version: CONSENT_TEXT_VERSION.LEGACY_MIGRATION,
      legal_basis: CONSENT_LEGAL_BASIS_BY_PURPOSE[CONSENT_PURPOSE.CHURN_PROFILING],
      source: CONSENT_SOURCE.LEGACY_MIGRATION,
      changed_by: CONSENT_ACTOR.LEGACY_MIGRATION,
      changed_by_profile_id: null,
      occurred_at: occurredAt,
      ip_address: null,
      user_agent: null,
      metadata: {
        inferred_from_legacy_field: 'churn_profiling_objected_at',
      } as unknown as Json,
    },
  ]
}
