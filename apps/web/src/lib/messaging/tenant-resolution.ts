import type { MessagingAdminClient } from './db'

export interface ResolvedMessagingIntegration {
  id: string
  tenantId: string
  externalAccountId: string | null
}

export async function resolveMetaWhatsAppIntegrationByPhoneNumberId(
  db: MessagingAdminClient,
  phoneNumberId: string,
): Promise<ResolvedMessagingIntegration | null> {
  const { data, error } = await db
    .from('tenant_integrations')
    .select('id, tenant_id, external_account_id')
    .eq('provider', 'meta_whatsapp')
    .eq('external_account_id', phoneNumberId)
    .is('disconnected_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(`tenant_integrations lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
    externalAccountId: data.external_account_id,
  }
}
