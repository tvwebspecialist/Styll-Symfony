import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { insertStaffNotification } from '@/lib/notifications'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from '@/types'

export const CLIENT_PRIVACY_REQUEST_ACTION = {
  ACCESS_EXPORT: 'access_export',
  ACCESS_REVIEW: 'access_review',
  RECTIFICATION: 'rectification',
  ERASURE: 'erasure',
  RESTRICTION: 'restriction',
} as const

export type ClientPrivacyRequestAction =
  (typeof CLIENT_PRIVACY_REQUEST_ACTION)[keyof typeof CLIENT_PRIVACY_REQUEST_ACTION]

export const CLIENT_PRIVACY_REQUEST_STATUS = {
  COMPLETED: 'completed',
  SUBMITTED: 'submitted',
  REJECTED: 'rejected',
} as const

export type ClientPrivacyRequestStatus =
  (typeof CLIENT_PRIVACY_REQUEST_STATUS)[keyof typeof CLIENT_PRIVACY_REQUEST_STATUS]

export interface ClientRightsMatrixRow {
  right: string
  status: 'supportato' | 'parzialmente supportato' | 'non applicabile'
  implementation: string
  reason: string
}

export interface ClientErasureRetentionRule {
  key: string
  label: string
  reason: string
}

export const CLIENT_DATA_EXPORT_CATEGORIES = [
  'profilo',
  'appuntamenti',
  'pagamenti',
  'loyalty',
  'badge',
  'preferiti',
  'consensi',
  'notifiche',
  'push',
  'analytics_collegati',
  'audit_richieste_privacy',
] as const

export const CLIENT_RIGHTS_MATRIX: ClientRightsMatrixRow[] = [
  {
    right: 'Accesso',
    status: 'supportato',
    implementation:
      'Export JSON self-service tenant-scoped con storico principale e richiesta manuale tracciata per le categorie che richiedono revisione del Titolare.',
    reason:
      'Il download copre i dati portabili del cliente corrente; le note interne dello staff restano fuori dal self-service e possono essere richieste con workflow auditato.',
  },
  {
    right: 'Rettifica',
    status: 'supportato',
    implementation:
      'Modifica profilo cliente in-app con audit della rettifica registrato lato server.',
    reason:
      'Nome, telefono, data di nascita e preferenze contatto vengono aggiornati sul profilo cliente tenant-scoped senza toccare altri tenant.',
  },
  {
    right: 'Cancellazione',
    status: 'supportato',
    implementation:
      'Erasure self-service tenant-scoped con cleanup selettivo, anonimizzazione del record CRM necessario e logout immediato.',
    reason:
      'I dati cancellabili vengono rimossi; i record soggetti a obblighi legali/accountability restano minimizzati e collegati solo a un cliente anonimizzato.',
  },
  {
    right: 'Limitazione',
    status: 'parzialmente supportato',
    implementation:
      'Il cliente può bloccare da solo marketing, analytics opzionali, push e churn; per una limitazione ulteriore può inviare una richiesta tracciata al Titolare.',
    reason:
      'I dati che devono restare per legge o accountability non possono essere congelati oltre la sola conservazione, quindi il blocco completo resta assistito.',
  },
  {
    right: 'Opposizione al marketing',
    status: 'supportato',
    implementation:
      'Toggle marketing in-app + link unsubscribe email tenant-specifico con audit su consent_events.',
    reason:
      'L’opposizione è immediata, autenticata o one-click da email, e resta storicizzata come prova della scelta.',
  },
  {
    right: 'Portabilità',
    status: 'supportato',
    implementation:
      'Lo stesso export JSON self-service soddisfa la portabilità per i dati del cliente corrente nel tenant corrente.',
    reason:
      'Il payload è strutturato, leggibile e non include dati di altri tenant o di altri clienti.',
  },
]

export const CLIENT_ERASURE_RETENTION_RULES: ClientErasureRetentionRule[] = [
  {
    key: 'client_record',
    label: 'Record cliente anonimizzato',
    reason:
      'Resta un record CRM minimizzato per mantenere l’integrità referenziale verso appuntamenti, pagamenti e log che non possono essere distrutti subito.',
  },
  {
    key: 'appointments',
    label: 'Appuntamenti, servizi e prodotti associati',
    reason:
      'Storico prestazioni, riconciliazione operativa e possibili contestazioni richiedono la conservazione dei record, ma le note e i token booking vengono rimossi.',
  },
  {
    key: 'payments',
    label: 'Pagamenti',
    reason:
      'I dati contabili e fiscali devono essere conservati per obbligo legale e difesa in caso di contestazioni.',
  },
  {
    key: 'loyalty',
    label: 'Movimenti loyalty e riscatti già maturati',
    reason:
      'Servono per accountability, riconciliazione di premi/spese e gestione di eventuali reclami sul programma fedeltà.',
  },
  {
    key: 'consent_events',
    label: 'Storico consensi e opposizioni',
    reason:
      'Resta la prova append-only delle scelte privacy del cliente per obblighi di accountability ex GDPR.',
  },
  {
    key: 'privacy_requests',
    label: 'Audit delle richieste privacy',
    reason:
      'Le richieste e le azioni sui diritti restano tracciate per dimostrare gestione, tempi ed esiti del workflow GDPR.',
  },
]

type ClientPrivacyRequestRow = Tables<'client_privacy_requests'>
type ClientPrivacyRequestInsert = TablesInsert<'client_privacy_requests'>

type QueryError = { message: string } | null
const AUTHORIZATION_HEADER = 'Authorization'

interface SiteSessionRow {
  anonymous_id: string
  first_seen_at: string
  id: string
  last_seen_at: string
}

interface AuthenticatedClientContext {
  client: Pick<Tables<'clients'>, 'email' | 'full_name' | 'id' | 'phone'>
  profile: Pick<Tables<'profiles'>, 'avatar_url' | 'email' | 'full_name' | 'notification_preferences' | 'phone'> | null
  tenant: { businessName: string; id: string; slug: string }
  user: { email: string | null; id: string }
}

export interface ClientDataExportPayload {
  exportedAt: string
  exportVersion: string
  rightsCovered: Array<'access' | 'portability'>
  tenant: {
    businessName: string
    id: string
    slug: string
  }
  subject: {
    client: Tables<'clients'>
    profile: Pick<
      Tables<'profiles'>,
      'avatar_url' | 'email' | 'full_name' | 'notification_preferences' | 'phone'
    > | null
  }
  data: {
    appointments: Array<
      Tables<'appointments'> & {
        location: { address: string | null; city: string | null; id: string; name: string | null } | null
        products: Array<Tables<'appointment_products'> & { product: Tables<'products'> | null }>
        services: Array<Tables<'appointment_services'> & { service: Tables<'services'> | null }>
        staff: { fullName: string | null; id: string; photoUrl: string | null; profileId: string | null } | null
      }
    >
    clientAnalytics: Tables<'client_analytics'> | null
    clientBadges: Array<Tables<'client_badges'> & { badge: Tables<'badges'> | null }>
    clientLoyalty: Tables<'client_loyalty'> | null
    consentEvents: Tables<'consent_events'>[]
    notifications: Tables<'notifications'>[]
    payments: Tables<'payments'>[]
    privacyRequests: ClientPrivacyRequestRow[]
    pushSubscriptions: Tables<'push_subscriptions'>[]
    rewardRedemptions: Array<Tables<'reward_redemptions'> & { reward: Tables<'rewards'> | null }>
    siteSessions: SiteSessionRow[]
    analyticsConsentEvents: Tables<'analytics_consent_events'>[]
    loyaltyTransactions: Tables<'loyalty_transactions'>[]
    wishlist: Array<Tables<'client_product_wishlist'> & { product: Tables<'products'> | null }>
  }
  selfServiceLimitations: Array<{
    category: 'client_notes'
    count: number
    reason: string
  }>
  retainedAfterErasure: ClientErasureRetentionRule[]
}

export interface ErasureResult {
  anonymizedGlobalProfile: boolean
  deleted: {
    clientAnalytics: number
    clientBadges: number
    clientLoyalty: number
    clientNotes: number
    marketingUnsubscribeTokens: number
    notificationLog: number
    notifications: number
    pushSubscriptions: number
    siteEvents: number
    siteSessions: number
    wishlist: number
  }
  preserved: {
    appointments: number
    clientRecord: number
    consentEvents: number
    loyaltyTransactions: number
    payments: number
    rewardRedemptions: number
  }
  removedAppointmentSensitiveFields: number
}

function assertNoQueryError(label: string, error: QueryError): void {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

function getSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
}

function getSupabasePublishableKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
}

function createBearerClient(token: string) {
  return createSupabaseClient<Database>(getSupabaseUrl(), getSupabasePublishableKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        [AUTHORIZATION_HEADER]: `Bearer ${token}`,
      },
    },
  })
}

function cleanJsonObject(
  input: Record<string, Json | undefined>,
): Json {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined)
  return Object.fromEntries(entries)
}

function readJsonString(value: Json, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value[key]
  return typeof candidate === 'string' ? candidate : null
}

function groupBy<T extends object, K extends keyof T>(
  rows: T[],
  key: K,
): Map<Exclude<T[K], null | undefined>, T[]> {
  const grouped = new Map<Exclude<T[K], null | undefined>, T[]>()
  for (const row of rows) {
    const value = row[key] as T[K]
    if (value === null || value === undefined) continue
    const typedKey = value as Exclude<T[K], null | undefined>
    const bucket = grouped.get(typedKey) ?? []
    bucket.push(row)
    grouped.set(typedKey, bucket)
  }
  return grouped
}

function toDownloadDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

export function buildClientPrivacyExportFilename(slug: string, at = new Date()): string {
  const safeSlug = slug.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'tenant'
  return `styll-${safeSlug}-customer-data-${toDownloadDate(at)}.json`
}

export function getErasureConfirmationValue(params: {
  clientPhone: string | null
  userEmail: string | null
}): string {
  const normalizedEmail = params.userEmail?.trim().toLowerCase() ?? ''
  if (normalizedEmail) return normalizedEmail
  const normalizedPhone = params.clientPhone?.trim() ?? ''
  if (normalizedPhone) return normalizedPhone
  return 'ELIMINA'
}

async function readAuthenticatedUser(
  request?: Pick<NextRequest, 'headers'>,
): Promise<{ email: string | null; id: string } | null> {
  const authorization = request?.headers.get('authorization')?.trim() ?? ''

  if (authorization.toLowerCase().startsWith('bearer ')) {
    const token = authorization.slice(7).trim()
    if (!token) return null

    const supabase = createBearerClient(token)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return { id: user.id, email: user.email ?? null }
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return { id: user.id, email: user.email ?? null }
}

export async function getAuthenticatedRequestUser(
  request?: Pick<NextRequest, 'headers'>,
): Promise<{ email: string | null; id: string } | null> {
  return readAuthenticatedUser(request)
}

export async function getAuthenticatedClientContext(
  tenantId: string,
  request?: Pick<NextRequest, 'headers'>,
): Promise<AuthenticatedClientContext | null> {
  const user = await readAuthenticatedUser(request)
  if (!user) return null

  const db = createAdminClient()
  const [tenantRes, clientRes, profileRes] = await Promise.all([
    db
      .from('tenants')
      .select('id, slug, business_name')
      .eq('id', tenantId)
      .eq('status', 'active')
      .maybeSingle(),
    db
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('profiles')
      .select('full_name, email, phone, avatar_url, notification_preferences')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  assertNoQueryError('read tenant for privacy rights', tenantRes.error)
  assertNoQueryError('read client for privacy rights', clientRes.error)
  assertNoQueryError('read profile for privacy rights', profileRes.error)

  if (!tenantRes.data || !clientRes.data) {
    return null
  }

  return {
    user,
    tenant: {
      id: tenantRes.data.id,
      slug: tenantRes.data.slug,
      businessName: tenantRes.data.business_name,
    },
    client: clientRes.data,
    profile: profileRes.data,
  }
}

export async function listClientPrivacyRequests(params: {
  limit?: number
  profileId: string
  tenantId: string
}): Promise<ClientPrivacyRequestRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('client_privacy_requests')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .eq('profile_id', params.profileId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 20)

  assertNoQueryError('read client privacy requests', error)
  return data ?? []
}

export async function recordClientPrivacyRequest(params: {
  action: ClientPrivacyRequestAction
  clientId: string | null
  details?: Record<string, Json | undefined>
  profileId: string | null
  status: ClientPrivacyRequestStatus
  tenantId: string
}): Promise<ClientPrivacyRequestRow> {
  const db = createAdminClient()
  const payload: ClientPrivacyRequestInsert = {
    action: params.action,
    client_id: params.clientId,
    details: cleanJsonObject(params.details ?? {}),
    profile_id: params.profileId,
    status: params.status,
    tenant_id: params.tenantId,
  }

  const { data, error } = await db
    .from('client_privacy_requests')
    .insert(payload)
    .select('*')
    .single()

  assertNoQueryError('insert client privacy request', error)
  if (!data) {
    throw new Error('insert client privacy request: missing row')
  }

  return data
}

export async function submitManualClientPrivacyRequest(params: {
  action: typeof CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_REVIEW | typeof CLIENT_PRIVACY_REQUEST_ACTION.RESTRICTION
  ctx: AuthenticatedClientContext
  message?: string
}): Promise<{ duplicate: boolean; row: ClientPrivacyRequestRow }> {
  const db = createAdminClient()
  const duplicateThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: existing, error: existingError } = await db
    .from('client_privacy_requests')
    .select('*')
    .eq('tenant_id', params.ctx.tenant.id)
    .eq('profile_id', params.ctx.user.id)
    .eq('action', params.action)
    .eq('status', CLIENT_PRIVACY_REQUEST_STATUS.SUBMITTED)
    .gte('created_at', duplicateThreshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  assertNoQueryError('read duplicate client privacy request', existingError)

  if (existing) {
    return { duplicate: true, row: existing }
  }

  const row = await recordClientPrivacyRequest({
    action: params.action,
    clientId: params.ctx.client.id,
    details: {
      category:
        params.action === CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_REVIEW
          ? 'manual_access_review'
          : 'processing_restriction',
      message: params.message?.trim() || undefined,
    },
    profileId: params.ctx.user.id,
    status: CLIENT_PRIVACY_REQUEST_STATUS.SUBMITTED,
    tenantId: params.ctx.tenant.id,
  })

  const title =
    params.action === CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_REVIEW
      ? 'Richiesta privacy: accesso esteso'
      : 'Richiesta privacy: limitazione'
  const body =
    params.action === CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_REVIEW
      ? `${params.ctx.client.full_name} ha chiesto una revisione manuale dei dati non esportabili in self-service.`
      : `${params.ctx.client.full_name} ha chiesto la limitazione del trattamento.`

  await insertStaffNotification({
    tenantId: params.ctx.tenant.id,
    type: 'privacy_request',
    title,
    body,
    meta: {
      client_id: params.ctx.client.id,
      privacy_action: params.action,
      privacy_request_id: row.id,
    },
  })

  return { duplicate: false, row }
}

async function readSiteSessions(params: {
  clientId: string
  tenantId: string
}): Promise<SiteSessionRow[]> {
  const db = createAdminClient()
  const result = await db
    .from('site_sessions' as never)
    .select('id, anonymous_id, first_seen_at, last_seen_at')
    .eq('tenant_id', params.tenantId)
    .eq('client_id', params.clientId)

  const typed = result as unknown as {
    data: SiteSessionRow[] | null
    error: QueryError
  }

  assertNoQueryError('read site sessions for client export', typed.error)
  return typed.data ?? []
}

async function deleteSiteSessions(params: {
  clientId: string
  tenantId: string
}): Promise<number> {
  const sessions = await readSiteSessions(params)
  if (sessions.length === 0) return 0

  const db = createAdminClient()
  const result = await db
    .from('site_sessions' as never)
    .delete()
    .eq('tenant_id', params.tenantId)
    .eq('client_id', params.clientId)

  const typed = result as unknown as { error: QueryError }
  assertNoQueryError('delete site sessions for erasure', typed.error)
  return sessions.length
}

export async function buildClientDataExport(
  ctx: AuthenticatedClientContext,
): Promise<ClientDataExportPayload> {
  const db = createAdminClient()

  const [
    clientRes,
    clientAnalyticsRes,
    clientBadgesRes,
    clientLoyaltyRes,
    clientNotesCountRes,
    consentEventsRes,
    loyaltyTransactionsRes,
    notificationsRes,
    paymentsRes,
    privacyRequestsRes,
    pushSubscriptionsRes,
    rewardRedemptionsRes,
    wishlistRes,
    appointmentsRes,
  ] = await Promise.all([
    db.from('clients').select('*').eq('id', ctx.client.id).eq('tenant_id', ctx.tenant.id).single(),
    db.from('client_analytics').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).maybeSingle(),
    db.from('client_badges').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('unlocked_at', { ascending: true }),
    db.from('client_loyalty').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).maybeSingle(),
    db.from('client_notes').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('consent_events').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('occurred_at', { ascending: true }).order('created_at', { ascending: true }),
    db.from('loyalty_transactions').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('created_at', { ascending: true }),
    db.from('notifications').select('*').eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id).order('created_at', { ascending: true }),
    db.from('payments').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('paid_at', { ascending: true }),
    db.from('client_privacy_requests').select('*').eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id).order('created_at', { ascending: true }),
    db.from('push_subscriptions').select('*').eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id).order('created_at', { ascending: true }),
    db.from('reward_redemptions').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('created_at', { ascending: true }),
    db.from('client_product_wishlist').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('created_at', { ascending: true }),
    db.from('appointments').select('*').eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).order('start_time', { ascending: true }),
  ])

  assertNoQueryError('read client export subject', clientRes.error)
  assertNoQueryError('read client analytics export', clientAnalyticsRes.error)
  assertNoQueryError('read client badges export', clientBadgesRes.error)
  assertNoQueryError('read client loyalty export', clientLoyaltyRes.error)
  assertNoQueryError('count client notes export', clientNotesCountRes.error)
  assertNoQueryError('read consent events export', consentEventsRes.error)
  assertNoQueryError('read loyalty transactions export', loyaltyTransactionsRes.error)
  assertNoQueryError('read notifications export', notificationsRes.error)
  assertNoQueryError('read payments export', paymentsRes.error)
  assertNoQueryError('read privacy requests export', privacyRequestsRes.error)
  assertNoQueryError('read push subscriptions export', pushSubscriptionsRes.error)
  assertNoQueryError('read reward redemptions export', rewardRedemptionsRes.error)
  assertNoQueryError('read wishlist export', wishlistRes.error)
  assertNoQueryError('read appointments export', appointmentsRes.error)

  const client = clientRes.data
  if (!client) {
    throw new Error('read client export subject: missing client row')
  }

  const appointments = appointmentsRes.data ?? []
  const appointmentIds = appointments.map((row) => row.id)

  const [appointmentServicesRes, appointmentProductsRes, siteSessions] = await Promise.all([
    appointmentIds.length > 0
      ? db.from('appointment_services').select('*').in('appointment_id', appointmentIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length > 0
      ? db.from('appointment_products').select('*').in('appointment_id', appointmentIds).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    readSiteSessions({ tenantId: ctx.tenant.id, clientId: ctx.client.id }),
  ])

  assertNoQueryError('read appointment services export', appointmentServicesRes.error)
  assertNoQueryError('read appointment products export', appointmentProductsRes.error)

  const appointmentServices = appointmentServicesRes.data ?? []
  const appointmentProducts = appointmentProductsRes.data ?? []
  const anonymousIds = [...new Set(siteSessions.map((session) => session.anonymous_id))]

  const serviceIds = [...new Set(appointmentServices.map((row) => row.service_id))]
  const productIds = [
    ...new Set([
      ...appointmentProducts.map((row) => row.product_id),
      ...(wishlistRes.data ?? []).map((row) => row.product_id),
    ]),
  ]
  const rewardIds = [...new Set((rewardRedemptionsRes.data ?? []).map((row) => row.reward_id))]
  const badgeIds = [...new Set((clientBadgesRes.data ?? []).map((row) => row.badge_id))]
  const staffIds = [...new Set(appointments.map((row) => row.staff_id).filter((value): value is string => Boolean(value)))]
  const locationIds = [...new Set(appointments.map((row) => row.location_id).filter((value): value is string => Boolean(value)))]

  const [
    servicesRes,
    productsRes,
    rewardsRes,
    badgesRes,
    staffRes,
    locationsRes,
    analyticsConsentEventsRes,
  ] = await Promise.all([
    serviceIds.length > 0
      ? db.from('services').select('*').in('id', serviceIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? db.from('products').select('*').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    rewardIds.length > 0
      ? db.from('rewards').select('*').in('id', rewardIds)
      : Promise.resolve({ data: [], error: null }),
    badgeIds.length > 0
      ? db.from('badges').select('*').in('id', badgeIds)
      : Promise.resolve({ data: [], error: null }),
    staffIds.length > 0
      ? db.from('staff_members').select('id, profile_id, photo_url').in('id', staffIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length > 0
      ? db.from('locations').select('id, name, address, city').in('id', locationIds)
      : Promise.resolve({ data: [], error: null }),
    anonymousIds.length > 0
      ? db
        .from('analytics_consent_events')
        .select('*')
        .in('anonymous_id', anonymousIds)
        .eq('surface', 'TENANT_PWA')
        .order('occurred_at', { ascending: true })
        .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ])

  assertNoQueryError('read services export', servicesRes.error)
  assertNoQueryError('read products export', productsRes.error)
  assertNoQueryError('read rewards export', rewardsRes.error)
  assertNoQueryError('read badges export', badgesRes.error)
  assertNoQueryError('read staff export', staffRes.error)
  assertNoQueryError('read locations export', locationsRes.error)
  assertNoQueryError('read analytics consent export', analyticsConsentEventsRes.error)

  const staffRows = staffRes.data ?? []
  const staffProfileIds = [...new Set(staffRows.map((row) => row.profile_id).filter((value): value is string => Boolean(value)))]
  const staffProfilesRes = staffProfileIds.length > 0
    ? await db.from('profiles').select('id, full_name').in('id', staffProfileIds)
    : { data: [], error: null }

  assertNoQueryError('read staff profiles export', staffProfilesRes.error)

  const servicesById = new Map((servicesRes.data ?? []).map((row) => [row.id, row]))
  const productsById = new Map((productsRes.data ?? []).map((row) => [row.id, row]))
  const rewardsById = new Map((rewardsRes.data ?? []).map((row) => [row.id, row]))
  const badgesById = new Map((badgesRes.data ?? []).map((row) => [row.id, row]))
  const staffProfilesById = new Map((staffProfilesRes.data ?? []).map((row) => [row.id, row]))
  const staffById = new Map(
    staffRows.map((row) => [
      row.id,
      {
        id: row.id,
        profileId: row.profile_id,
        photoUrl: row.photo_url ?? null,
        fullName: row.profile_id ? (staffProfilesById.get(row.profile_id)?.full_name ?? null) : null,
      },
    ]),
  )
  const locationsById = new Map((locationsRes.data ?? []).map((row) => [row.id, row]))
  const appointmentServicesByAppointmentId = groupBy(appointmentServices, 'appointment_id')
  const appointmentProductsByAppointmentId = groupBy(appointmentProducts, 'appointment_id')

  const analyticsConsentEvents = (analyticsConsentEventsRes.data ?? []).filter((row) => {
    const tenantSlug = readJsonString(row.metadata, 'tenant_slug')
    return tenantSlug === null || tenantSlug === ctx.tenant.slug
  })

  return {
    exportVersion: '2026-07-13',
    exportedAt: new Date().toISOString(),
    rightsCovered: ['access', 'portability'],
    tenant: {
      id: ctx.tenant.id,
      slug: ctx.tenant.slug,
      businessName: ctx.tenant.businessName,
    },
    subject: {
      client,
      profile: ctx.profile,
    },
    data: {
      appointments: appointments.map((appointment) => ({
        ...appointment,
        staff: appointment.staff_id ? (staffById.get(appointment.staff_id) ?? null) : null,
        location: appointment.location_id ? (locationsById.get(appointment.location_id) ?? null) : null,
        services: (appointmentServicesByAppointmentId.get(appointment.id) ?? []).map((row) => ({
          ...row,
          service: servicesById.get(row.service_id) ?? null,
        })),
        products: (appointmentProductsByAppointmentId.get(appointment.id) ?? []).map((row) => ({
          ...row,
          product: productsById.get(row.product_id) ?? null,
        })),
      })),
      analyticsConsentEvents,
      clientAnalytics: clientAnalyticsRes.data ?? null,
      clientBadges: (clientBadgesRes.data ?? []).map((row) => ({
        ...row,
        badge: badgesById.get(row.badge_id) ?? null,
      })),
      clientLoyalty: clientLoyaltyRes.data ?? null,
      consentEvents: consentEventsRes.data ?? [],
      loyaltyTransactions: loyaltyTransactionsRes.data ?? [],
      notifications: notificationsRes.data ?? [],
      payments: paymentsRes.data ?? [],
      privacyRequests: privacyRequestsRes.data ?? [],
      pushSubscriptions: pushSubscriptionsRes.data ?? [],
      rewardRedemptions: (rewardRedemptionsRes.data ?? []).map((row) => ({
        ...row,
        reward: rewardsById.get(row.reward_id) ?? null,
      })),
      siteSessions,
      wishlist: (wishlistRes.data ?? []).map((row) => ({
        ...row,
        product: productsById.get(row.product_id) ?? null,
      })),
    },
    selfServiceLimitations:
      (clientNotesCountRes.count ?? 0) > 0
        ? [
          {
            category: 'client_notes',
            count: clientNotesCountRes.count ?? 0,
            reason:
              'Le note interne dello staff non vengono esposte in self-service e richiedono revisione manuale del Titolare.',
          },
        ]
        : [],
    retainedAfterErasure: CLIENT_ERASURE_RETENTION_RULES,
  }
}

async function maybeClearProfileAfterLastLink(params: {
  userId: string
}): Promise<boolean> {
  const db = createAdminClient()

  const [otherClientsRes, activeStaffRes] = await Promise.all([
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', params.userId)
      .is('deleted_at', null),
    db
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', params.userId)
      .eq('is_active', true)
      .is('deleted_at', null),
  ])

  assertNoQueryError('count remaining client links after erasure', otherClientsRes.error)
  assertNoQueryError('count remaining staff memberships after erasure', activeStaffRes.error)

  if ((otherClientsRes.count ?? 0) > 0 || (activeStaffRes.count ?? 0) > 0) {
    return false
  }

  const profileUpdate: TablesUpdate<'profiles'> = {
    avatar_url: null,
    bio: null,
    full_name: null,
    notification_preferences: {},
    phone: null,
  }

  const { error: updateProfileError } = await db
    .from('profiles')
    .update(profileUpdate)
    .eq('id', params.userId)

  assertNoQueryError('clear global profile after last tenant erasure', updateProfileError)

  const { data: avatarFiles, error: avatarListError } = await db.storage.from('avatars').list(params.userId)
  if (!avatarListError && avatarFiles && avatarFiles.length > 0) {
    const avatarPaths = avatarFiles.map((file) => `${params.userId}/${file.name}`)
    const { error: removeAvatarError } = await db.storage.from('avatars').remove(avatarPaths)
    if (removeAvatarError) {
      throw new Error(`clear avatar storage after last tenant erasure: ${removeAvatarError.message}`)
    }
  }

  return true
}

export async function eraseTenantScopedClientData(
  ctx: AuthenticatedClientContext,
): Promise<ErasureResult> {
  const db = createAdminClient()

  const [clientNotesCountRes, wishlistCountRes, clientBadgesCountRes, clientLoyaltyCountRes, clientAnalyticsCountRes, notificationsCountRes, pushCountRes, notificationLogCountRes, unsubscribeTokensCountRes, appointmentsCountRes, paymentsCountRes, loyaltyTransactionsCountRes, rewardRedemptionsCountRes, consentEventsCountRes, siteSessions] = await Promise.all([
    db.from('client_notes').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_product_wishlist').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_badges').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_loyalty').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_analytics').select('client_id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('notification_log').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('marketing_unsubscribe_tokens').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id).is('deleted_at', null),
    db.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('loyalty_transactions').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('reward_redemptions').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('consent_events').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    readSiteSessions({ tenantId: ctx.tenant.id, clientId: ctx.client.id }),
  ])

  assertNoQueryError('count client notes for erasure', clientNotesCountRes.error)
  assertNoQueryError('count wishlist for erasure', wishlistCountRes.error)
  assertNoQueryError('count client badges for erasure', clientBadgesCountRes.error)
  assertNoQueryError('count client loyalty for erasure', clientLoyaltyCountRes.error)
  assertNoQueryError('count client analytics for erasure', clientAnalyticsCountRes.error)
  assertNoQueryError('count notifications for erasure', notificationsCountRes.error)
  assertNoQueryError('count push subscriptions for erasure', pushCountRes.error)
  assertNoQueryError('count notification log for erasure', notificationLogCountRes.error)
  assertNoQueryError('count unsubscribe tokens for erasure', unsubscribeTokensCountRes.error)
  assertNoQueryError('count appointments for erasure', appointmentsCountRes.error)
  assertNoQueryError('count payments for erasure', paymentsCountRes.error)
  assertNoQueryError('count loyalty transactions for erasure', loyaltyTransactionsCountRes.error)
  assertNoQueryError('count reward redemptions for erasure', rewardRedemptionsCountRes.error)
  assertNoQueryError('count consent events for erasure', consentEventsCountRes.error)

  const deleteResults = await Promise.all([
    db.from('client_notes').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_product_wishlist').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_loyalty').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_badges').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('client_analytics').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
    db.from('notifications').delete().eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('push_subscriptions').delete().eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('notification_log').delete().eq('tenant_id', ctx.tenant.id).eq('profile_id', ctx.user.id),
    db.from('marketing_unsubscribe_tokens').delete().eq('tenant_id', ctx.tenant.id).eq('client_id', ctx.client.id),
  ])

  deleteResults.forEach((result, index) => {
    assertNoQueryError(`delete privacy erasure batch ${index + 1}`, result.error)
  })

  const deletedSiteSessions = await deleteSiteSessions({
    tenantId: ctx.tenant.id,
    clientId: ctx.client.id,
  })

  const now = new Date().toISOString()
  const [scrubAppointmentsRes, unlinkBookedByRes, anonymizeClientRes] = await Promise.all([
    db
      .from('appointments')
      .update({
        booking_confirmation_token_expires_at: null,
        booking_confirmation_token_hash: null,
        notes: null,
        updated_at: now,
      })
      .eq('tenant_id', ctx.tenant.id)
      .eq('client_id', ctx.client.id)
      .is('deleted_at', null),
    db
      .from('appointments')
      .update({
        booked_by: null,
        updated_at: now,
      })
      .eq('tenant_id', ctx.tenant.id)
      .eq('client_id', ctx.client.id)
      .eq('booked_by', ctx.user.id)
      .is('deleted_at', null),
    db
      .from('clients')
      .update({
        churn_profiling_objected_at: null,
        date_of_birth: null,
        deleted_at: now,
        email: null,
        full_name: 'Cliente eliminato',
        marketing_consent: false,
        phone: null,
        preferred_contact_channel: null,
        profile_id: null,
        tags: [],
        updated_at: now,
      })
      .eq('id', ctx.client.id)
      .eq('tenant_id', ctx.tenant.id)
      .is('deleted_at', null),
  ])

  assertNoQueryError('scrub appointment sensitive fields for erasure', scrubAppointmentsRes.error)
  assertNoQueryError('unlink booked_by for erasure', unlinkBookedByRes.error)
  assertNoQueryError('anonymize client row for erasure', anonymizeClientRes.error)

  const anonymizedGlobalProfile = await maybeClearProfileAfterLastLink({ userId: ctx.user.id })

  return {
    anonymizedGlobalProfile,
    deleted: {
      clientAnalytics: clientAnalyticsCountRes.count ?? 0,
      clientBadges: clientBadgesCountRes.count ?? 0,
      clientLoyalty: clientLoyaltyCountRes.count ?? 0,
      clientNotes: clientNotesCountRes.count ?? 0,
      marketingUnsubscribeTokens: unsubscribeTokensCountRes.count ?? 0,
      notificationLog: notificationLogCountRes.count ?? 0,
      notifications: notificationsCountRes.count ?? 0,
      pushSubscriptions: pushCountRes.count ?? 0,
      siteEvents: 0,
      siteSessions: deletedSiteSessions,
      wishlist: wishlistCountRes.count ?? 0,
    },
    preserved: {
      appointments: appointmentsCountRes.count ?? 0,
      clientRecord: 1,
      consentEvents: consentEventsCountRes.count ?? 0,
      loyaltyTransactions: loyaltyTransactionsCountRes.count ?? 0,
      payments: paymentsCountRes.count ?? 0,
      rewardRedemptions: rewardRedemptionsCountRes.count ?? 0,
    },
    removedAppointmentSensitiveFields: appointmentsCountRes.count ?? 0,
  }
}
