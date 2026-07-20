import { handleGenerateInboxDraftRequest } from '@/lib/ai/inbox-draft-orchestrator'

export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params
  return handleGenerateInboxDraftRequest(conversationId)
}
