import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  buildClientDataExport,
  buildClientPrivacyExportFilename,
  CLIENT_DATA_EXPORT_CATEGORIES,
  CLIENT_ERASURE_RETENTION_RULES,
  CLIENT_PRIVACY_REQUEST_ACTION,
  CLIENT_PRIVACY_REQUEST_STATUS,
  getAuthenticatedClientContext,
  getAuthenticatedRequestUser,
  recordClientPrivacyRequest,
} from '@/lib/client-privacy-rights'

export const dynamic = 'force-dynamic'

const ExportQuerySchema = z.object({
  tenantId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const parsed = ExportQuerySchema.safeParse({
    tenantId: request.nextUrl.searchParams.get('tenantId')?.trim(),
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
  }

  const user = await getAuthenticatedRequestUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getAuthenticatedClientContext(parsed.data.tenantId, request)
  if (!ctx) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const payload = await buildClientDataExport(ctx)
  const fileName = buildClientPrivacyExportFilename(ctx.tenant.slug)

  await recordClientPrivacyRequest({
    action: CLIENT_PRIVACY_REQUEST_ACTION.ACCESS_EXPORT,
    clientId: ctx.client.id,
    details: {
      categories: [...CLIENT_DATA_EXPORT_CATEGORIES],
      file_name: fileName,
      retained_after_erasure: CLIENT_ERASURE_RETENTION_RULES.map((rule) => rule.key),
      rights: ['access', 'portability'],
      self_service_limitations: payload.selfServiceLimitations.map((entry) => entry.category),
    },
    profileId: ctx.user.id,
    status: CLIENT_PRIVACY_REQUEST_STATUS.COMPLETED,
    tenantId: ctx.tenant.id,
  })

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
