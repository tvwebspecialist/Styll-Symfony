import { getSymfonyApiBaseUrl } from './api-base-url.ts'

export const SYMFONY_STAFF_JWT_COOKIE = 'styll_symfony_staff_jwt'

export type SymfonyStaffApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'http_error'
  | 'network_error'
  | 'invalid_response'

export class SymfonyStaffApiError extends Error {
  readonly code: SymfonyStaffApiErrorCode
  readonly details: {
    status?: number
    url: string
    body?: string
    cause?: unknown
  }

  constructor(
    message: string,
    code: SymfonyStaffApiErrorCode,
    details: {
      status?: number
      url: string
      body?: string
      cause?: unknown
    }
  ) {
    super(message)
    this.name = 'SymfonyStaffApiError'
    this.code = code
    this.details = details
  }
}

export interface SymfonyStaffUserDto {
  id: string
  email: string
  roles: string[]
}

export interface SymfonyStaffProfileDto {
  id: string
  userType: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  bio: string | null
  language: string | null
  timezone: string | null
  notificationPreferences: Record<string, unknown>
  onboardingCompleted: boolean
  workMode: string | null
}

export interface SymfonyStaffTenantDto {
  id: string
  slug: string
  businessName: string
  logoUrl: string | null
  status: string
  timezone: string
}

export interface SymfonyStaffMembershipDto {
  staffMemberId: string
  role: string
  tenant: SymfonyStaffTenantDto
}

export interface SymfonyStaffMeDto {
  user: SymfonyStaffUserDto
  profile: SymfonyStaffProfileDto
  currentTenant: SymfonyStaffMembershipDto | null
  currentRole: string | null
  otherTenants: SymfonyStaffMembershipDto[]
}

export interface FetchSymfonyStaffMeInput {
  jwt: string
  tenantSlug?: string | null
}

export function isSymfonyStaffContextEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT !== 'false'
}

export function buildSymfonyStaffMeHeaders(
  jwt: string,
  tenantSlug?: string | null
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${jwt}`,
  }

  const normalizedTenantSlug = tenantSlug?.trim()
  if (normalizedTenantSlug) {
    headers['X-Tenant-Slug'] = normalizedTenantSlug
  }

  return headers
}

export async function fetchSymfonyStaffMe(
  input: FetchSymfonyStaffMeInput
): Promise<SymfonyStaffMeDto> {
  const url = `${getSymfonyApiBaseUrl()}/api/me`
  let response: Response

  try {
    response = await fetch(url, {
      headers: buildSymfonyStaffMeHeaders(input.jwt, input.tenantSlug),
      cache: 'no-store',
    })
  } catch (cause) {
    throw new SymfonyStaffApiError('Unable to reach Symfony staff API.', 'network_error', {
      url,
      cause,
    })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined)
    throw new SymfonyStaffApiError(
      response.status === 401
        ? 'Symfony staff API rejected the JWT.'
        : response.status === 403
          ? 'Symfony staff API rejected the requested tenant context.'
          : 'Symfony staff API request failed.',
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'forbidden'
          : 'http_error',
      {
        status: response.status,
        url,
        body,
      }
    )
  }

  try {
    return await response.json() as SymfonyStaffMeDto
  } catch (cause) {
    throw new SymfonyStaffApiError('Symfony staff API returned invalid JSON.', 'invalid_response', {
      url,
      cause,
    })
  }
}
