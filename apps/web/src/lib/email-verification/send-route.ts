import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  normalizeVerificationEmail,
  sendEmailVerificationOtp,
} from '@/lib/email-verification'
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit'

const SendEmailVerificationSchema = z.object({
  email: z.string().trim().email(),
})

const EMAIL_VERIFICATION_SEND_EMAIL_LIMIT = 5
const EMAIL_VERIFICATION_SEND_IP_LIMIT = 12
const EMAIL_VERIFICATION_SEND_WINDOW_MS = 15 * 60 * 1000

export interface EmailVerificationSendRouteDeps {
  checkRateLimit: (
    key: string,
    limit: number,
    windowMs: number
  ) => RateLimitResult
  sendEmailVerificationOtp: typeof sendEmailVerificationOtp
}

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  return realIp || 'unknown'
}

function tooManyRequestsResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      success: false,
      error: `Troppe richieste. Riprova tra ${retryAfterSec} secondi.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

export async function handleSendEmailVerificationRequest(
  request: Request,
  deps: EmailVerificationSendRouteDeps = {
    checkRateLimit,
    sendEmailVerificationOtp,
  }
) {
  const body = await request.json()
  const parsed = SendEmailVerificationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email non valida.' }, { status: 400 })
  }

  const normalizedEmail = normalizeVerificationEmail(parsed.data.email)
  const emailRateLimit = deps.checkRateLimit(
    `email-verification:send:email:${normalizedEmail}`,
    EMAIL_VERIFICATION_SEND_EMAIL_LIMIT,
    EMAIL_VERIFICATION_SEND_WINDOW_MS
  )
  if (!emailRateLimit.allowed) {
    return tooManyRequestsResponse(emailRateLimit.retryAfterSec)
  }

  const ipRateLimit = deps.checkRateLimit(
    `email-verification:send:ip:${getRequestIp(request)}`,
    EMAIL_VERIFICATION_SEND_IP_LIMIT,
    EMAIL_VERIFICATION_SEND_WINDOW_MS
  )
  if (!ipRateLimit.allowed) {
    return tooManyRequestsResponse(ipRateLimit.retryAfterSec)
  }

  const result = await deps.sendEmailVerificationOtp(normalizedEmail)

  const status = result.statusCode ?? (result.success ? 200 : 500)
  const headers =
    result.retryAfterSec && status === 429
      ? { 'Retry-After': String(result.retryAfterSec) }
      : undefined

  return NextResponse.json(
    {
      success: result.success,
      error: result.error,
    },
    { status, headers }
  )
}
