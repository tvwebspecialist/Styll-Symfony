import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
export * from '@/lib/legal/b2b-register-acceptance-shared'
import {
  B2B_REGISTER_CONTEXT_COOKIE,
  B2B_REGISTER_LEGAL_PROOF_COOKIE,
  B2B_REGISTER_LEGAL_PROOF_TTL_SECONDS,
  B2B_TERMS_DOCUMENT_TYPE,
  EMAIL_PASSWORD_REGISTER_SOURCE,
  GOOGLE_OAUTH_REGISTER_SOURCE,
  getB2bRegisterCookieOptions,
  getCurrentB2bTermsAcceptanceDocument,
  type B2bTermsAcceptanceSource,
} from '@/lib/legal/b2b-register-acceptance-shared'

type LooseDbClient = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => any
}

export interface PendingB2bTermsAcceptanceProof {
  acceptedAt: string
  documentType: typeof B2B_TERMS_DOCUMENT_TYPE
  documentVersion: string
  expiresAt: string
  privacyNoticeVersion: string
  rawToken: string
  source: B2bTermsAcceptanceSource
}

export interface B2bTermsAcceptanceEventRow {
  accepted_at: string
  accepted_by: string
  created_at: string
  document_type: typeof B2B_TERMS_DOCUMENT_TYPE
  document_version: string
  id: string
  metadata: Record<string, unknown> | null
  privacy_notice_version: string
  source: B2bTermsAcceptanceSource
  tenant_id: string | null
  user_id: string
}

export interface FinalizeGoogleRegisterAcceptanceResult {
  status: 'accepted' | 'already_accepted' | 'allowed_existing_user' | 'blocked_new_user'
}

function getDbClient(db?: LooseDbClient): LooseDbClient {
  return db ?? (createAdminClient() as unknown as LooseDbClient)
}

function normalizeAcceptedByEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized ? normalized : null
}

export function hashB2bTermsAcceptanceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function setB2bRegisterCookies(
  cookieStore: { set: (name: string, value: string, options?: Record<string, unknown>) => void },
  {
    proofToken,
    contextToken = null,
  }: {
    proofToken: string
    contextToken?: string | null
  },
) {
  const options = getB2bRegisterCookieOptions()
  cookieStore.set(B2B_REGISTER_LEGAL_PROOF_COOKIE, proofToken, options)
  if (contextToken?.trim()) {
    cookieStore.set(B2B_REGISTER_CONTEXT_COOKIE, contextToken, options)
    return
  }

  const expiredOptions = getB2bRegisterCookieOptions({ maxAge: 0 })
  cookieStore.set(B2B_REGISTER_CONTEXT_COOKIE, '', expiredOptions)
}

export function clearB2bRegisterCookies(
  cookieStore: { set: (name: string, value: string, options?: Record<string, unknown>) => void },
) {
  const expiredOptions = getB2bRegisterCookieOptions({ maxAge: 0 })
  cookieStore.set(B2B_REGISTER_LEGAL_PROOF_COOKIE, '', expiredOptions)
  cookieStore.set(B2B_REGISTER_CONTEXT_COOKIE, '', expiredOptions)
}

export async function createPendingB2bTermsAcceptanceProof({
  acceptedAt,
  acceptedByEmail,
  contextToken,
  db,
  documentVersion,
  metadata = {},
  privacyNoticeVersion,
  source,
  ttlSeconds = B2B_REGISTER_LEGAL_PROOF_TTL_SECONDS,
}: {
  acceptedAt?: Date | string
  acceptedByEmail?: string | null
  contextToken?: string | null
  db?: LooseDbClient
  documentVersion?: string
  metadata?: Record<string, unknown>
  privacyNoticeVersion?: string
  source: B2bTermsAcceptanceSource
  ttlSeconds?: number
}): Promise<PendingB2bTermsAcceptanceProof> {
  const database = getDbClient(db)
  const currentDocument = getCurrentB2bTermsAcceptanceDocument()
  const rawToken = randomBytes(32).toString('hex')
  const normalizedAcceptedAt =
    acceptedAt instanceof Date
      ? acceptedAt.toISOString()
      : (acceptedAt ?? new Date().toISOString())
  const expiresAt = new Date(new Date(normalizedAcceptedAt).getTime() + ttlSeconds * 1000).toISOString()

  const insertPayload = {
    accepted_at: normalizedAcceptedAt,
    accepted_by_email: normalizeAcceptedByEmail(acceptedByEmail),
    context_token_hash: contextToken ? hashB2bTermsAcceptanceToken(contextToken) : null,
    document_type: currentDocument.documentType,
    document_version: (documentVersion ?? currentDocument.documentVersion).trim(),
    expires_at: expiresAt,
    metadata,
    privacy_notice_version: (privacyNoticeVersion ?? currentDocument.privacyNoticeVersion).trim(),
    source,
    token_hash: hashB2bTermsAcceptanceToken(rawToken),
  }

  const { error } = await database.from('legal_acceptance_pending').insert(insertPayload)

  if (error) {
    throw new Error(`Errore creazione prova legale pending: ${error.message}`)
  }

  return {
    acceptedAt: normalizedAcceptedAt,
    documentType: currentDocument.documentType,
    documentVersion: insertPayload.document_version,
    expiresAt,
    privacyNoticeVersion: insertPayload.privacy_notice_version,
    rawToken,
    source,
  }
}

export async function consumePendingB2bTermsAcceptanceProof({
  contextToken,
  db,
  rawToken,
  source,
  userEmail,
  userId,
}: {
  contextToken?: string | null
  db?: LooseDbClient
  rawToken: string
  source: B2bTermsAcceptanceSource
  userEmail?: string | null
  userId: string
}): Promise<B2bTermsAcceptanceEventRow> {
  const database = getDbClient(db)

  const { data, error } = await database.rpc('consume_pending_legal_acceptance', {
    p_context_token: contextToken ?? null,
    p_source: source,
    p_token: rawToken,
    p_user_email: normalizeAcceptedByEmail(userEmail),
    p_user_id: userId,
  })

  if (error) {
    throw new Error(`Errore consumo prova legale pending: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Consumo prova legale pending senza risultato')
  }

  return row as B2bTermsAcceptanceEventRow
}

export async function getCurrentB2bTermsAcceptanceForUser({
  db,
  documentVersion,
  userId,
}: {
  db?: LooseDbClient
  documentVersion?: string
  userId: string
}): Promise<B2bTermsAcceptanceEventRow | null> {
  const database = getDbClient(db)
  const version = (documentVersion ?? getCurrentB2bTermsAcceptanceDocument().documentVersion).trim()

  const { data, error } = await database
    .from('legal_acceptance_events')
    .select(
      'id, user_id, tenant_id, document_type, document_version, privacy_notice_version, accepted_at, accepted_by, source, metadata, created_at',
    )
    .eq('user_id', userId)
    .eq('document_type', B2B_TERMS_DOCUMENT_TYPE)
    .eq('document_version', version)
    .maybeSingle()

  if (error) {
    throw new Error(`Errore lettura accettazione termini B2B: ${error.message}`)
  }

  return (data as B2bTermsAcceptanceEventRow | null) ?? null
}

export async function hasAnyB2bTermsAcceptanceForUser({
  db,
  userId,
}: {
  db?: LooseDbClient
  userId: string
}): Promise<boolean> {
  const database = getDbClient(db)

  const { data, error } = await database
    .from('legal_acceptance_events')
    .select('id')
    .eq('user_id', userId)
    .eq('document_type', B2B_TERMS_DOCUMENT_TYPE)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Errore lettura storico accettazione termini B2B: ${error.message}`)
  }

  return Boolean(data?.id)
}

export async function linkB2bTermsAcceptanceToTenant({
  db,
  tenantId,
  userId,
}: {
  db?: LooseDbClient
  tenantId: string
  userId: string
}): Promise<number> {
  const database = getDbClient(db)

  const { data, error } = await database
    .from('legal_acceptance_events')
    .update({ tenant_id: tenantId })
    .eq('user_id', userId)
    .eq('document_type', B2B_TERMS_DOCUMENT_TYPE)
    .is('tenant_id', null)
    .select('id')

  if (error) {
    throw new Error(`Errore collegamento tenant ad accettazione termini B2B: ${error.message}`)
  }

  return Array.isArray(data) ? data.length : 0
}

export async function hasExistingBusinessPresence({
  db,
  userId,
}: {
  db?: LooseDbClient
  userId: string
}): Promise<boolean> {
  const database = getDbClient(db)

  const [{ data: profile, error: profileError }, { data: staffRow, error: staffError }] = await Promise.all([
    database
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle(),
    database
      .from('staff_members')
      .select('id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
  ])

  if (profileError) {
    throw new Error(`Errore lettura profilo per accettazione termini B2B: ${profileError.message}`)
  }

  if (staffError) {
    throw new Error(`Errore lettura staff per accettazione termini B2B: ${staffError.message}`)
  }

  return Boolean(profile?.onboarding_completed) || Boolean(staffRow?.id)
}

export async function canAccessB2bGoogleLoginWithoutNewAcceptance({
  db,
  userId,
}: {
  db?: LooseDbClient
  userId: string
}): Promise<boolean> {
  const database = getDbClient(db)

  const [hasTermsAcceptance, hasBusinessPresence] = await Promise.all([
    hasAnyB2bTermsAcceptanceForUser({ db: database, userId }),
    hasExistingBusinessPresence({ db: database, userId }),
  ])

  return hasTermsAcceptance || hasBusinessPresence
}

export async function finalizeGoogleRegisterTermsAcceptance({
  contextToken,
  db,
  now = new Date(),
  proofToken,
  userCreatedAt,
  userEmail,
  userId,
}: {
  contextToken?: string | null
  db?: LooseDbClient
  now?: Date
  proofToken?: string | null
  userCreatedAt: string
  userEmail?: string | null
  userId: string
}): Promise<FinalizeGoogleRegisterAcceptanceResult> {
  const database = getDbClient(db)
  const currentAcceptance = await getCurrentB2bTermsAcceptanceForUser({ db: database, userId })
  if (currentAcceptance) {
    return { status: 'already_accepted' }
  }

  if (proofToken?.trim()) {
    try {
      await consumePendingB2bTermsAcceptanceProof({
        contextToken,
        db: database,
        rawToken: proofToken,
        source: GOOGLE_OAUTH_REGISTER_SOURCE,
        userEmail,
        userId,
      })
      return { status: 'accepted' }
    } catch {
      // Fall through to the "fresh user without valid proof" decision.
    }
  }

  const businessPresence = await hasExistingBusinessPresence({ db: database, userId })
  if (businessPresence) {
    return { status: 'allowed_existing_user' }
  }

  const createdAtMs = new Date(userCreatedAt).getTime()
  const nowMs = now.getTime()
  if (Number.isFinite(createdAtMs) && nowMs - createdAtMs <= B2B_REGISTER_LEGAL_PROOF_TTL_SECONDS * 1000) {
    return { status: 'blocked_new_user' }
  }

  return { status: 'allowed_existing_user' }
}
