import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { processQueuedInboundInboxAiRunsBatch } from '@/lib/ai/inbound-inbox-ai-runtime'
import { matchesBearerTokenHeader } from '@/lib/security/bearer-secret'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/inbox-ai-runtime] CRON_SECRET non configurato')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (!matchesBearerTokenHeader(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await processQueuedInboundInboxAiRunsBatch()
    console.info('[cron/inbox-ai-runtime]', JSON.stringify(summary))
    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('[cron/inbox-ai-runtime] processing failed', error)
    return NextResponse.json(
      { error: 'Inbox AI runtime processing failed' },
      { status: 500 },
    )
  }
}
