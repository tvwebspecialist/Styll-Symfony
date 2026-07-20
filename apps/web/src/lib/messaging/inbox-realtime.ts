export function buildInboxRealtimeTenantFilter(tenantId: string): string {
  return `tenant_id=eq.${tenantId}`
}

export function extractRealtimeConversationId(row: unknown): string | null {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return null
  }

  const conversationId = (row as Record<string, unknown>).conversation_id
  if (typeof conversationId === 'string' && conversationId.length > 0) {
    return conversationId
  }

  const directId = (row as Record<string, unknown>).id
  return typeof directId === 'string' && directId.length > 0 ? directId : null
}

export function shouldRefreshInboxMessagesFromLog(row: unknown): boolean {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return false
  }

  const type = (row as Record<string, unknown>).type
  return type === 'conversation_audit' || type === 'internal_note' || type === 'whatsapp_status'
}
