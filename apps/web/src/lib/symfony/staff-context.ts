import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import {
  fetchSymfonyStaffMe,
  isSymfonyStaffContextEnabled,
  SYMFONY_STAFF_JWT_COOKIE,
  SymfonyStaffApiError,
  type SymfonyStaffMeDto,
  type SymfonyStaffMembershipDto,
} from './staff-client.ts'

/**
 * This helper intentionally does not mint or exchange JWTs.
 * It only consumes a Symfony staff JWT if another confirmed auth flow stores it.
 */
interface CookieReader {
  get(name: string): { value?: string } | undefined
}

export function readSymfonyStaffJwt(cookieStore: CookieReader): string | null {
  const jwt = cookieStore.get(SYMFONY_STAFF_JWT_COOKIE)?.value?.trim()
  return jwt || null
}

async function fetchOptionalSymfonyStaffMe(
  jwt: string,
  tenantSlug?: string | null
): Promise<SymfonyStaffMeDto | null> {
  try {
    return await fetchSymfonyStaffMe({ jwt, tenantSlug })
  } catch (error) {
    if (error instanceof SymfonyStaffApiError && error.code === 'unauthorized') {
      return null
    }

    throw error
  }
}

export function listSymfonyStaffMemberships(
  me: SymfonyStaffMeDto | null | undefined
): SymfonyStaffMembershipDto[] {
  if (!me) {
    return []
  }

  const memberships: SymfonyStaffMembershipDto[] = []

  if (me.currentTenant) {
    memberships.push(me.currentTenant)
  }

  for (const membership of me.otherTenants) {
    if (!memberships.some((entry) => entry.tenant.id === membership.tenant.id)) {
      memberships.push(membership)
    }
  }

  return memberships
}

export async function getOptionalSymfonyStaffMe(
  tenantSlug?: string | null
): Promise<SymfonyStaffMeDto | null> {
  if (!isSymfonyStaffContextEnabled()) {
    return null
  }

  const cookieStore = await cookies()
  const jwt = readSymfonyStaffJwt(cookieStore)
  if (!jwt) {
    return null
  }

  return fetchOptionalSymfonyStaffMe(jwt, tenantSlug)
}

export async function getOptionalSymfonyStaffMeFromRequest(
  request: Pick<NextRequest, 'cookies'>,
  tenantSlug?: string | null
): Promise<SymfonyStaffMeDto | null> {
  if (!isSymfonyStaffContextEnabled()) {
    return null
  }

  const jwt = readSymfonyStaffJwt(request.cookies)
  if (!jwt) {
    return null
  }

  return fetchOptionalSymfonyStaffMe(jwt, tenantSlug)
}
