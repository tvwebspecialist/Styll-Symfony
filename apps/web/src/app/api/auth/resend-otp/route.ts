import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import {
  normalizeVerificationEmail,
  sendEmailVerificationOtp,
} from '@/lib/email-verification'
import { checkRateLimit } from '@/lib/rate-limit'

const Schema = z.object({ email: z.string().trim().email() })

function getIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown'
  return req.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Richiesta non valida.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email non valida.' }, { status: 400 })
  }

  const email = normalizeVerificationEmail(parsed.data.email)

  // 1 reinvio ogni 60s per email
  const cooldownCheck = checkRateLimit(`resend-otp:cooldown:${email}`, 1, 60_000)
  if (!cooldownCheck.allowed) {
    return NextResponse.json(
      { success: false, error: `Attendi ${cooldownCheck.retryAfterSec}s prima di reinviare.` },
      { status: 429, headers: { 'Retry-After': String(cooldownCheck.retryAfterSec) } }
    )
  }

  // Max 3 reinvii per ora per email
  const quotaCheck = checkRateLimit(`resend-otp:quota:${email}`, 3, 60 * 60_000)
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { success: false, error: 'Limite raggiunto. Riprova tra un\'ora o contatta il supporto.' },
      { status: 429, headers: { 'Retry-After': String(quotaCheck.retryAfterSec) } }
    )
  }

  // IP-level limit: 10/h
  const ipCheck = checkRateLimit(`resend-otp:ip:${getIp(req)}`, 10, 60 * 60_000)
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { success: false, error: 'Troppe richieste. Riprova più tardi.' },
      { status: 429 }
    )
  }

  const result = await sendEmailVerificationOtp(email)
  const status = result.statusCode ?? (result.success ? 200 : 500)
  return NextResponse.json({ success: result.success, error: result.error }, { status })
}
