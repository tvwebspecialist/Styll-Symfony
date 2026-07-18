import type { MessagingProvider, NormalizedWebhookEvent } from './contracts'

export function buildConversationKey(
  provider: MessagingProvider,
  phoneNumberId: string,
  externalContactId: string
): string {
  return `${provider}:${phoneNumberId}:${externalContactId}`.trim()
}

export interface TenantResolutionKey {
  provider: MessagingProvider
  phoneNumberId: string
}

export function buildTenantResolutionKey(input: TenantResolutionKey): string {
  return `${input.provider}:${input.phoneNumberId}`.trim()
}

export function isInboundCustomerMessage(event: Pick<NormalizedWebhookEvent, 'direction' | 'authorKind'>): boolean {
  return event.direction === 'inbound' && event.authorKind === 'customer'
}
