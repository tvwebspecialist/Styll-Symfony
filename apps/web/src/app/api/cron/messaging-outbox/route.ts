import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { processPendingManualWhatsAppOutboxBatch } from '@/lib/messaging/manual-whatsapp-reply'
import { matchesBearerTokenHeader } from '@/lib/security/bearer-secret'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/messaging-outbox] CRON_SECRET non configurato')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (!matchesBearerTokenHeader(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await processPendingManualWhatsAppOutboxBatch()
    console.info('[cron/messaging-outbox]', JSON.stringify(summary))
    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('[cron/messaging-outbox] processing failed', error)
    return NextResponse.json(
      { error: 'Messaging outbox processing failed' },
      { status: 500 },
    )
  }
}
