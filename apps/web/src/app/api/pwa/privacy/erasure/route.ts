import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Json } from '@/types'
import {
  CLIENT_ERASURE_RETENTION_RULES,
  CLIENT_PRIVACY_REQUEST_ACTION,
  CLIENT_PRIVACY_REQUEST_STATUS,
  eraseTenantScopedClientData,
  getAuthenticatedClientContext,
  getAuthenticatedRequestUser,
  getErasureConfirmationValue,
  recordClientPrivacyRequest,
} from '@/lib/client-privacy-rights'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ErasureSchema = z.object({
  confirmation: z.string().trim().min(1),
  tenantId: z.string().uuid(),
})

function matchesConfirmation(expected: string, received: string): boolean {
  if (expected === 'ELIMINA') {
    return received.trim().toUpperCase() === 'ELIMINA'
  }
  if (expected.includes('@')) {
    return received.trim().toLowerCase() === expected
  }
  return received.trim() === expected
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const parsed = ErasureSchema.safeParse(body)
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

  const expectedConfirmation = getErasureConfirmationValue({
    clientPhone: ctx.client.phone,
    userEmail: ctx.user.email,
  })

  if (!matchesConfirmation(expectedConfirmation, parsed.data.confirmation)) {
    return NextResponse.json({ error: 'Confirmation mismatch' }, { status: 400 })
  }

  const result = await eraseTenantScopedClientData(ctx)

  try {
    await recordClientPrivacyRequest({
      action: CLIENT_PRIVACY_REQUEST_ACTION.ERASURE,
      clientId: ctx.client.id,
      details: {
        anonymized_global_profile: result.anonymizedGlobalProfile,
        deleted: result.deleted as Json,
        preserved: result.preserved as Json,
        retained_after_erasure: CLIENT_ERASURE_RETENTION_RULES.map((rule) => rule.key),
        removed_appointment_sensitive_fields: result.removedAppointmentSensitiveFields,
      },
      profileId: ctx.user.id,
      status: CLIENT_PRIVACY_REQUEST_STATUS.COMPLETED,
      tenantId: ctx.tenant.id,
    })
  } catch (error) {
    console.error('[privacy-erasure] failed to record erasure audit entry:', error)
  }

  const supabase = await createServerClient()
  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    summary: result,
  })
}
