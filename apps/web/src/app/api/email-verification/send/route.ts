import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { sendEmailVerificationOtp } from '@/lib/email-verification'

const SendEmailVerificationSchema = z.object({
  email: z.string().trim().email(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = SendEmailVerificationSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Email non valida.' }, { status: 400 })
  }

  const result = await sendEmailVerificationOtp(parsed.data.email.toLowerCase())

  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}
