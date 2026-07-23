import { NextRequest, NextResponse } from 'next/server'

import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'
import { readSymfonyStaffJwt } from '@/lib/symfony/staff-context'

export async function POST(req: NextRequest) {
  const jwt = readSymfonyStaffJwt(req.cookies)
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body optional
  }

  const res = await fetch(`${getSymfonyApiBaseUrl()}/api/admin/onboarding-tokens`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => null) as {
    id?: string
    token?: string
    expires_at?: string
    error?: string
  } | null

  if (!res.ok || !payload?.token || !payload?.expires_at) {
    return NextResponse.json(
      { error: payload?.error ?? 'Errore nella generazione del token.' },
      { status: res.status || 500 }
    )
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim()
  const link = `${baseUrl}/register?token=${payload.token}`

  return NextResponse.json({
    token: payload.token,
    link,
    expires_at: payload.expires_at,
  }, { status: res.status })
}
