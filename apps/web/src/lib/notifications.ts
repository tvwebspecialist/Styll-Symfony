/**
 * Helper per inserire notifiche in-app per lo staff del tenant.
 * Solo server-side. Non importare in componenti client.
 *
 * profile_id = NULL → broadcast: la riga è visibile a tutto lo staff attivo del tenant.
 */
import { createAdminClient } from '@/lib/supabase/admin'

/** "Luca Esposito" → "Luca E." */
export function abbrevName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0]} ${(parts[parts.length - 1][0] ?? '').toUpperCase()}.`
}

type NotifType =
  | 'new_booking'
  | 'cancellation'
  | 'new_client'
  | 'reschedule'
  | 'churn_alert'
  | 'low_stock'
  | 'loyalty_milestone'

interface InsertParams {
  tenantId: string
  type: NotifType
  title: string
  body?: string
  meta?: Record<string, unknown>
}

/**
 * Fire-and-forget: inserisce una riga in `notifications` senza bloccare il chiamante.
 * Gli errori vengono loggati ma non propagati.
 */
export function insertStaffNotification(params: InsertParams): void {
  createAdminClient()
    .from('notifications')
    .insert({
      tenant_id: params.tenantId,
      profile_id: null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      meta: params.meta ?? {},
    })
    .then(({ error }) => {
      if (error) {
        console.error('[notifications] insert failed:', error.message, {
          type: params.type,
          tenantId: params.tenantId,
        })
      }
    })
}
