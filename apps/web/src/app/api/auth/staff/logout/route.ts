import { NextResponse } from 'next/server'

import { clearAdminShadowCookieOnResponse } from '@/lib/admin-shadow-cookie'
import { IMPERSONATE_STAFF_COOKIE } from '@/lib/tenant-context'
import { clearSymfonyStaffJwtCookie } from '@/lib/symfony/staff-session'

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true })

  clearSymfonyStaffJwtCookie(response)
  clearAdminShadowCookieOnResponse(response)
  response.cookies.set(IMPERSONATE_STAFF_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
