import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Returns whether an automation type is enabled for a tenant.
 * Defaults to true if no row exists in message_automations.
 */
export async function getAutomationEnabled(tenantId: string, type: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('message_automations')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .maybeSingle()
  return data?.enabled ?? true
}
