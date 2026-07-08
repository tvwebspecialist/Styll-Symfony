import type { NextRequest } from 'next/server'
import { handleSendEmailVerificationRequest } from '@/lib/email-verification/send-route'

export async function POST(request: NextRequest) {
  return handleSendEmailVerificationRequest(request)
}
