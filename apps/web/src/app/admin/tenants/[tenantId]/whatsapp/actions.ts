'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import { requireSuperadmin } from '@/app/admin/actions'

const upsertBindingSchema = z.object({
  phoneNumberId: z.string().trim().min(1, 'Phone number ID obbligatorio.'),
  businessAccountId: z.string().trim().optional().default(''),
  displayPhoneNumber: z.string().trim().optional().default(''),
})

export async function upsertTenantWhatsAppBinding(
  tenantId: string,
  input: z.infer<typeof upsertBindingSchema>,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const parsed = upsertBindingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi.' }
  }

  const payload = parsed.data
  const db = createMessagingAdminClient()
  const metadata = {
    business_account_id: payload.businessAccountId || null,
    display_phone_number: payload.displayPhoneNumber || null,
  }

  const { data: existing, error: existingError } = await db
    .from('tenant_integrations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', 'meta_whatsapp')
    .is('disconnected_at', null)
    .maybeSingle()

  if (existingError) {
    return { success: false, error: existingError.message }
  }

  if (existing) {
    const { error } = await db
      .from('tenant_integrations')
      .update({
        external_account_id: payload.phoneNumberId,
        metadata,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
      })
      .eq('id', existing.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await db.from('tenant_integrations').insert({
      tenant_id: tenantId,
      provider: 'meta_whatsapp',
      external_account_id: payload.phoneNumberId,
      metadata,
      connected_at: new Date().toISOString(),
    })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/admin/tenants/${tenantId}/whatsapp`)
  return { success: true }
}

export async function disconnectTenantWhatsAppBinding(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createMessagingAdminClient()
  const { error } = await db
    .from('tenant_integrations')
    .update({
      disconnected_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('provider', 'meta_whatsapp')
    .is('disconnected_at', null)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/admin/tenants/${tenantId}/whatsapp`)
  return { success: true }
}
