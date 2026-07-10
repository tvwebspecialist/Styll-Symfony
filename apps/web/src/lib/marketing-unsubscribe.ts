import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildTenantAppUrl } from '@/lib/auth/urls'
import type { TablesInsert } from '@/types'
import {
  applyClientConsentEvents,
  buildMarketingConsentEvents,
  type ConsentRequestContext,
} from '@/lib/consent-events'
import { CONSENT_ACTOR, CONSENT_CHANNEL, CONSENT_SOURCE } from '@/lib/consent-copy'

export const MARKETING_UNSUBSCRIBE_TOKEN_TTL_DAYS = 30

export interface MarketingEmailLinks {
  managePreferencesUrl: string
  oneClickUrl: string
  unsubscribeUrl: string
}

export interface MarketingUnsubscribePreview {
  state: 'ready' | 'already_unsubscribed'
}

type MarketingUnsubscribeDb = Pick<ReturnType<typeof createAdminClient>, 'from' | 'rpc'>

type MarketingUnsubscribeTokenInsert = TablesInsert<'marketing_unsubscribe_tokens'>

interface MarketingUnsubscribeRow {
  client_id: string
  consumed_at: string | null
  expires_at: string
  id: string
  tenant_id: string
  token_hash: string
}

interface MarketingUnsubscribeClientRow {
  id: string
  marketing_consent: boolean
}

export function hashMarketingUnsubscribeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildMarketingEmailLinks(slug: string, token: string): MarketingEmailLinks {
  const encodedToken = encodeURIComponent(token)

  return {
    unsubscribeUrl: buildTenantAppUrl(slug, `/preferenze-marketing?token=${encodedToken}`),
    oneClickUrl: buildTenantAppUrl(slug, `/preferenze-marketing/confirm?token=${encodedToken}`),
    managePreferencesUrl: buildTenantAppUrl(slug, '/profilo/preferenze'),
  }
}

function generateMarketingUnsubscribeToken(): string {
  return randomBytes(24).toString('base64url')
}

function buildTokenExpiry(): string {
  return new Date(
    Date.now() + MARKETING_UNSUBSCRIBE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
}

async function readTokenRow(
  db: MarketingUnsubscribeDb,
  tenantId: string,
  token: string,
): Promise<MarketingUnsubscribeRow | null> {
  const tokenHash = hashMarketingUnsubscribeToken(token)
  const { data, error } = await db
    .from('marketing_unsubscribe_tokens')
    .select('id, tenant_id, client_id, token_hash, expires_at, consumed_at')
    .eq('tenant_id', tenantId)
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error) {
    throw new Error(`Errore lettura token unsubscribe: ${error.message}`)
  }

  return (data as MarketingUnsubscribeRow | null) ?? null
}

async function readClientRow(
  db: MarketingUnsubscribeDb,
  tenantId: string,
  clientId: string,
): Promise<MarketingUnsubscribeClientRow | null> {
  const { data, error } = await db
    .from('clients')
    .select('id, marketing_consent')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`Errore lettura client unsubscribe: ${error.message}`)
  }

  return (data as MarketingUnsubscribeClientRow | null) ?? null
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now()
}

export async function issueMarketingUnsubscribeToken(
  db: MarketingUnsubscribeDb,
  {
    clientId,
    tenantId,
    expiresAt,
  }: {
    clientId: string
    expiresAt?: string
    tenantId: string
  },
): Promise<string> {
  const rawToken = generateMarketingUnsubscribeToken()
  const payload: MarketingUnsubscribeTokenInsert = {
    tenant_id: tenantId,
    client_id: clientId,
    token_hash: hashMarketingUnsubscribeToken(rawToken),
    expires_at: expiresAt ?? buildTokenExpiry(),
  }

  const { error } = await db.from('marketing_unsubscribe_tokens').insert(payload)
  if (error) {
    throw new Error(`Errore creazione token unsubscribe: ${error.message}`)
  }

  return rawToken
}

export async function getMarketingUnsubscribePreview(
  db: MarketingUnsubscribeDb,
  {
    tenantId,
    token,
  }: {
    tenantId: string
    token: string
  },
): Promise<MarketingUnsubscribePreview | null> {
  const tokenRow = await readTokenRow(db, tenantId, token)
  if (!tokenRow || isExpired(tokenRow.expires_at)) return null

  const clientRow = await readClientRow(db, tenantId, tokenRow.client_id)
  if (!clientRow) return null

  return {
    state: clientRow.marketing_consent ? 'ready' : 'already_unsubscribed',
  }
}

export async function revokeMarketingConsentWithToken(
  db: MarketingUnsubscribeDb,
  {
    requestContext,
    tenantId,
    token,
  }: {
    requestContext?: ConsentRequestContext
    tenantId: string
    token: string
  },
): Promise<'revoked' | 'already_unsubscribed' | 'invalid'> {
  const tokenRow = await readTokenRow(db, tenantId, token)
  if (!tokenRow || isExpired(tokenRow.expires_at)) return 'invalid'

  const clientRow = await readClientRow(db, tenantId, tokenRow.client_id)
  if (!clientRow) return 'invalid'

  const now = new Date().toISOString()
  const { error: consumeError } = await db
    .from('marketing_unsubscribe_tokens')
    .update({ consumed_at: tokenRow.consumed_at ?? now })
    .eq('id', tokenRow.id)

  if (consumeError) {
    throw new Error(`Errore aggiornamento token unsubscribe: ${consumeError.message}`)
  }

  await applyClientConsentEvents(db, {
    tenantId,
    clientId: clientRow.id,
    actor: CONSENT_ACTOR.UNSUBSCRIBE_LINK,
    actorProfileId: null,
    source: CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK,
    events: buildMarketingConsentEvents({
      allowed: false,
      channel: CONSENT_CHANNEL.EMAIL,
      source: CONSENT_SOURCE.EMAIL_UNSUBSCRIBE_LINK,
      occurredAt: now,
      ipAddress: requestContext?.ipAddress ?? null,
      metadata: {
        flow: 'marketing_unsubscribe_link',
        ip_address: requestContext?.ipAddress ?? null,
        user_agent: requestContext?.userAgent ?? null,
      },
      userAgent: requestContext?.userAgent ?? null,
    }),
  })

  return clientRow.marketing_consent ? 'revoked' : 'already_unsubscribed'
}
