import type { NextRequest } from 'next/server'

import { handleAddInternalInboxNoteRequest } from '@/lib/messaging/internal-inbox-note'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params
  return handleAddInternalInboxNoteRequest(request, conversationId)
}
