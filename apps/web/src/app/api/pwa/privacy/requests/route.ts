import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  CLIENT_PRIVACY_REQUEST_ACTION,
  getAuthenticatedClientContext,
  getAuthenticatedRequestUser,
  submitManualClientPrivacyRequest,
} from '@/lib/client-privacy-rights'

const PrivacyRequestSchema = z.object({
  action: z.enum([
    CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_REVIEW,
    CLIENT_PRIVACY_REQUEST_ACTION.RESTRICTION,
  ]),
  message: z.string().trim().max(1000).optional(),
  tenantId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const parsed = PrivacyRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const user = await getAuthenticatedRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getAuthenticatedClientContext(parsed.data.tenantId, request)
  if (!ctx) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const result = await submitManualClientPrivacyRequest({
    action: parsed.data.action,
    ctx,
    message: parsed.data.message,
  })

  return NextResponse.json({
    duplicate: result.duplicate,
    requestId: result.row.id,
    status: result.row.status,
    success: true,
  })
}
