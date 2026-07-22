import { cookies } from 'next/headers'

import {
  fetchSymfonyStaffMe,
  isSymfonyStaffContextEnabled,
  SYMFONY_STAFF_JWT_COOKIE,
  type SymfonyStaffMeDto,
} from './staff-client.ts'

/**
 * This helper intentionally does not mint or exchange JWTs.
 * It only consumes a Symfony staff JWT if another confirmed auth flow stores it.
 */
export async function getOptionalSymfonyStaffMe(
  tenantSlug?: string | null
): Promise<SymfonyStaffMeDto | null> {
  if (!isSymfonyStaffContextEnabled()) {
    return null
  }

  const cookieStore = await cookies()
  const jwt = cookieStore.get(SYMFONY_STAFF_JWT_COOKIE)?.value?.trim()
  if (!jwt) {
    return null
  }

  return fetchSymfonyStaffMe({
    jwt,
    tenantSlug,
  })
}
