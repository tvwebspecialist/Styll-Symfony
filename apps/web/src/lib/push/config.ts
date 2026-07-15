/**
 * Server-only push runtime configuration.
 * Do not import this module from client components.
 */
export type PushRuntimeState = 'disabled' | 'misconfigured' | 'enabled'
export type PushAvailabilityCode = 'PUSH_DISABLED' | 'PUSH_MISCONFIGURED'

interface DisabledPushConfig {
  state: 'disabled'
}

interface MisconfiguredPushConfig {
  state: 'misconfigured'
  reason:
    | 'partial_config'
    | 'missing_subject'
    | 'invalid_public_key'
    | 'invalid_private_key'
    | 'invalid_subject'
  message: string
}

export interface EnabledPushConfig {
  state: 'enabled'
  publicKey: string
  privateKey: string
  subject: string
}

export type PushRuntimeConfig =
  | DisabledPushConfig
  | MisconfiguredPushConfig
  | EnabledPushConfig

interface PushUnavailableResponseBody {
  error: 'Push not available'
  code: PushAvailabilityCode
}

interface PushEnabledResponseBody {
  vapidPublicKey: string
}

export class PushConfigError extends Error {
  readonly code: PushAvailabilityCode
  readonly httpStatus: number

  constructor(code: PushAvailabilityCode, message: string, httpStatus: number) {
    super(message)
    this.name = 'PushConfigError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

function normalizeEnvValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function isLikelyBase64Url(value: string, minLength: number): boolean {
  return value.length >= minLength && /^[A-Za-z0-9_-]+$/.test(value)
}

function isValidMailtoSubject(subject: string): boolean {
  const email = subject.slice('mailto:'.length)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isValidHttpsSubject(subject: string): boolean {
  try {
    const url = new URL(subject)
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidVapidSubject(subject: string): boolean {
  if (subject.startsWith('mailto:')) {
    return isValidMailtoSubject(subject)
  }

  return isValidHttpsSubject(subject)
}

export function resolvePushConfig(
  env: Record<string, string | undefined> = process.env,
): PushRuntimeConfig {
  const publicKey = normalizeEnvValue(env.VAPID_PUBLIC_KEY)
  const privateKey = normalizeEnvValue(env.VAPID_PRIVATE_KEY)
  const subject = normalizeEnvValue(env.VAPID_EMAIL)

  const hasPublicKey = publicKey.length > 0
  const hasPrivateKey = privateKey.length > 0
  const hasSubject = subject.length > 0

  if (!hasPublicKey && !hasPrivateKey && !hasSubject) {
    return { state: 'disabled' }
  }

  if (!hasPublicKey || !hasPrivateKey) {
    return {
      state: 'misconfigured',
      reason: 'partial_config',
      message: 'Push VAPID configuration is incomplete. Set both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, or leave all VAPID variables empty to disable push.',
    }
  }

  if (!hasSubject) {
    return {
      state: 'misconfigured',
      reason: 'missing_subject',
      message: 'Push VAPID configuration is incomplete. VAPID_EMAIL is required when push is enabled.',
    }
  }

  if (!isLikelyBase64Url(publicKey, 80)) {
    return {
      state: 'misconfigured',
      reason: 'invalid_public_key',
      message: 'Push VAPID configuration is invalid. VAPID_PUBLIC_KEY must be a base64url-encoded public key.',
    }
  }

  if (!isLikelyBase64Url(privateKey, 40)) {
    return {
      state: 'misconfigured',
      reason: 'invalid_private_key',
      message: 'Push VAPID configuration is invalid. VAPID_PRIVATE_KEY must be a base64url-encoded private key.',
    }
  }

  if (!isValidVapidSubject(subject)) {
    return {
      state: 'misconfigured',
      reason: 'invalid_subject',
      message: 'Push VAPID configuration is invalid. VAPID_EMAIL must be a mailto: address or an https URL.',
    }
  }

  return {
    state: 'enabled',
    publicKey,
    privateKey,
    subject,
  }
}

export function toPushConfigError(config: Exclude<PushRuntimeConfig, EnabledPushConfig>): PushConfigError {
  if (config.state === 'disabled') {
    return new PushConfigError('PUSH_DISABLED', 'Push notifications are disabled in this environment.', 503)
  }

  return new PushConfigError('PUSH_MISCONFIGURED', config.message, 500)
}

export function buildPushBootstrapResponse(
  config: PushRuntimeConfig,
): { status: number; body: PushEnabledResponseBody | PushUnavailableResponseBody } {
  if (config.state === 'enabled') {
    return {
      status: 200,
      body: { vapidPublicKey: config.publicKey },
    }
  }

  const error = toPushConfigError(config)

  return {
    status: error.httpStatus,
    body: {
      error: 'Push not available',
      code: error.code,
    },
  }
}

export function isPushConfigError(error: unknown): error is PushConfigError {
  return error instanceof PushConfigError
}
