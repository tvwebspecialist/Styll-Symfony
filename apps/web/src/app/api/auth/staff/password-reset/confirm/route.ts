import { NextRequest, NextResponse } from 'next/server'

import { getSymfonyApiBaseUrl } from '@/lib/symfony/api-base-url'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload JSON non valido.' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const token = typeof payload.token === 'string' ? payload.token.trim() : ''
  const newPassword = typeof payload.new_password === 'string' ? payload.new_password : ''

  if (!token) {
    return NextResponse.json({ error: 'Token mancante.' }, { status: 400 })
  }

  const base = getSymfonyApiBaseUrl()
  let symfonyRes: Response
  try {
    symfonyRes = await fetch(`${base}/api/password-reset/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Impossibile raggiungere il server. Riprova.' },
      { status: 502 },
    )
  }

  const data = await symfonyRes.json().catch(() => null)

  return NextResponse.json(data ?? {}, { status: symfonyRes.status })
}
