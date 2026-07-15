import { buildPathWithTrialIntent, normalizeTrialIntent } from '@/lib/trial-intent'
import { PUBLIC_B2B_DOCS } from '@/lib/legal/public-b2b'

export const B2B_TERMS_DOCUMENT_TYPE = 'B2B_TERMS' as const
export const EMAIL_PASSWORD_REGISTER_SOURCE = 'EMAIL_PASSWORD_REGISTER' as const
export const GOOGLE_OAUTH_REGISTER_SOURCE = 'GOOGLE_OAUTH_REGISTER' as const
export const ROOT_OAUTH_FLOW_LOGIN = 'login' as const
export const ROOT_OAUTH_FLOW_REGISTER = 'register' as const

export const B2B_REGISTER_LEGAL_PROOF_COOKIE = 'styll_b2b_register_legal_proof'
export const B2B_REGISTER_CONTEXT_COOKIE = 'styll_b2b_register_context'
export const B2B_REGISTER_LEGAL_PROOF_TTL_SECONDS = 60 * 10

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it').trim()

function normalizeCookieHost(value: string): string | null {
  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '')
  const host = withoutProtocol.split('/')[0]?.split(':')[0]?.trim().replace(/^\./, '') ?? ''

  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return null
  }

  return host
}

const COOKIE_HOST = normalizeCookieHost(ROOT_DOMAIN)
const COOKIE_DOMAIN = IS_PRODUCTION && COOKIE_HOST ? `.${COOKIE_HOST}` : undefined

export type B2bTermsAcceptanceSource =
  | typeof EMAIL_PASSWORD_REGISTER_SOURCE
  | typeof GOOGLE_OAUTH_REGISTER_SOURCE

export type RootOAuthFlow =
  | typeof ROOT_OAUTH_FLOW_LOGIN
  | typeof ROOT_OAUTH_FLOW_REGISTER

export interface CurrentB2bTermsAcceptanceDocument {
  documentType: typeof B2B_TERMS_DOCUMENT_TYPE
  documentVersion: string
  privacyNoticeVersion: string
}

export function getCurrentB2bTermsAcceptanceDocument(): CurrentB2bTermsAcceptanceDocument {
  return {
    documentType: B2B_TERMS_DOCUMENT_TYPE,
    documentVersion: PUBLIC_B2B_DOCS.terms.version,
    privacyNoticeVersion: PUBLIC_B2B_DOCS.privacy.version,
  }
}

export function buildRootOAuthCallbackPath({
  flow,
  intent,
}: {
  flow: RootOAuthFlow
  intent?: string | null
}): string {
  const callbackPath = buildPathWithTrialIntent('/auth/callback', intent)
  const callbackUrl = new URL(callbackPath, 'http://styll.local')
  callbackUrl.searchParams.set('oauth_flow', flow)
  return `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`
}

export function getB2bRegisterCookieOptions({
  maxAge = B2B_REGISTER_LEGAL_PROOF_TTL_SECONDS,
  secure = IS_PRODUCTION && Boolean(COOKIE_DOMAIN),
}: {
  maxAge?: number
  secure?: boolean
} = {}) {
  return {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax' as const,
    secure,
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  }
}

export function normalizeRootOAuthFlow(value: string | null | undefined): RootOAuthFlow {
  return value === ROOT_OAUTH_FLOW_REGISTER ? ROOT_OAUTH_FLOW_REGISTER : ROOT_OAUTH_FLOW_LOGIN
}

export function buildRegisterPathWithContext({
  intent,
  onboardingToken,
}: {
  intent?: string | null
  onboardingToken?: string | null
}): string {
  const basePath = onboardingToken
    ? `/register?token=${encodeURIComponent(onboardingToken)}`
    : '/register'
  return buildPathWithTrialIntent(basePath, normalizeTrialIntent(intent))
}
