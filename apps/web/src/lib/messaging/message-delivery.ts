export type MessageLogStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'received'
  | 'failed'
  | 'bounced'

export type InboxDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

const STATUS_RANK: Record<MessageLogStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  received: 0,
  failed: -1,
  bounced: -1,
}

export function getWebhookMessageStatus(eventType: string): MessageLogStatus {
  switch (eventType) {
    case 'message.sent':
      return 'sent'
    case 'message.delivered':
      return 'delivered'
    case 'message.read':
      return 'read'
    case 'message.failed':
      return 'failed'
    default:
      return 'received'
  }
}

export function toInboxDeliveryStatus(status: MessageLogStatus): InboxDeliveryStatus {
  switch (status) {
    case 'queued':
      return 'pending'
    case 'delivered':
      return 'delivered'
    case 'read':
      return 'read'
    case 'failed':
    case 'bounced':
      return 'failed'
    case 'sent':
    case 'received':
    default:
      return 'sent'
  }
}

export function coalesceMessageLogStatus(
  currentStatus: MessageLogStatus | null | undefined,
  nextStatus: MessageLogStatus,
): MessageLogStatus {
  if (!currentStatus) return nextStatus
  if (currentStatus === nextStatus) return currentStatus

  if (nextStatus === 'failed' || nextStatus === 'bounced') {
    return currentStatus === 'queued' || currentStatus === 'sent'
      ? nextStatus
      : currentStatus
  }

  if (currentStatus === 'failed' || currentStatus === 'bounced') {
    return currentStatus
  }

  const currentRank = STATUS_RANK[currentStatus]
  const nextRank = STATUS_RANK[nextStatus]

  return nextRank > currentRank ? nextStatus : currentStatus
}
