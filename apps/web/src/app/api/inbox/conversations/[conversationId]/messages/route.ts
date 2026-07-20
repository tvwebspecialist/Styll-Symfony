import type { NextRequest } from 'next/server'

import { handleSendManualWhatsAppReplyRequest } from '@/lib/messaging/manual-whatsapp-reply'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params
  return handleSendManualWhatsAppReplyRequest(request, conversationId)
}
