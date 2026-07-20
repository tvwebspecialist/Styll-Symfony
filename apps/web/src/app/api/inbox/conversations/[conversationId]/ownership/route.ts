import type { NextRequest } from 'next/server'

import { handleUpdateConversationStateRequest } from '@/lib/messaging/conversation-state-service'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params
  return handleUpdateConversationStateRequest(request, conversationId)
}
