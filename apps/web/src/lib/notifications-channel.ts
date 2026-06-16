import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Determines the best notification channel for a given profile+tenant pair.
 *
 * Returns:
 *   'push'  — push_accepted is true AND an active push_subscription exists
 *   'email' — push not available; caller should check if email is present before sending
 *   'none'  — push was explicitly declined (push_accepted: false); skip notifications
 */
export async function getNotificationChannel(
  profileId: string,
  tenantId: string,
): Promise<'push' | 'email' | 'none'> {
  const db = createAdminClient()

  const [{ data: profile }, { count }] = await Promise.all([
    db
      .from('profiles')
      .select('notification_preferences')
      .eq('id', profileId)
      .maybeSingle(),
    db
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId),
  ])

  const prefs = (profile?.notification_preferences as Record<string, boolean>) ?? {}

  if (prefs.push_accepted === true && (count ?? 0) > 0) return 'push'
  if (prefs.push_accepted === false) return 'none'
  return 'email'
}
