'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { getNotificationChannel } from '@/lib/notifications-channel'
import {
  getSubscriptionsForProfile,
  sendPushToSubscriptions,
} from '@/lib/push/send-notification'
import { sendTemplatedEmail } from '@/lib/email'

type Segment = 'all' | 'rischio' | 'vip' | 'winback'

export interface CampaignResult {
  sent:    number
  failed:  number
  skipped: number
}

interface ClientRow {
  id:         string
  profile_id: string | null
  email:      string | null
  full_name:  string
}

async function fetchClientsBySegment(
  db: ReturnType<typeof createAdminClient>,
  tenantId: string,
  segment: Segment,
): Promise<ClientRow[]> {
  if (segment === 'all') {
    const { data } = await db
      .from('clients')
      .select('id, profile_id, email, full_name')
      .eq('tenant_id', tenantId)
      .eq('marketing_consent', true)
      .is('deleted_at', null)
    return (data ?? []) as ClientRow[]
  }

  // Build analytics filter
  let analyticsQuery = db
    .from('client_analytics')
    .select('client_id')
    .eq('tenant_id', tenantId)

  if (segment === 'rischio') {
    analyticsQuery = analyticsQuery
      .in('churn_status', ['yellow', 'red'])
      .gte('days_since_last_visit', 45)
      .lte('days_since_last_visit', 90)
  } else if (segment === 'vip') {
    analyticsQuery = analyticsQuery.gte('total_visits', 10)
  } else {
    // winback
    analyticsQuery = analyticsQuery
      .gte('days_since_last_visit', 90)
      .lte('days_since_last_visit', 180)
  }

  const { data: analyticsRows } = await analyticsQuery
  if (!analyticsRows || analyticsRows.length === 0) return []

  const ids = analyticsRows.map((r) => r.client_id as string)

  const { data } = await db
    .from('clients')
    .select('id, profile_id, email, full_name')
    .eq('tenant_id', tenantId)
    .eq('marketing_consent', true)
    .is('deleted_at', null)
    .in('id', ids)

  return (data ?? []) as ClientRow[]
}

export async function sendCampaign({
  tenantId,
  segment,
  message,
}: {
  tenantId: string
  segment:  Segment
  message:  string
}): Promise<CampaignResult> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) {
    throw new Error('Unauthorized')
  }

  const trimmed = message.trim()
  if (!trimmed || trimmed.length > 160) {
    throw new Error('Invalid message')
  }

  const db = createAdminClient()

  // Anti-double-submit: reject if a campaign was already logged in the last 5 s
  const { count: recentCount } = await db
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'campaign')
    .gte('sent_at', new Date(Date.now() - 5_000).toISOString())

  if ((recentCount ?? 0) > 0) {
    throw new Error('Invio già in corso — riprova tra qualche secondo')
  }

  // Fetch tenant for email branding
  const { data: tenant } = await db
    .from('tenants')
    .select('business_name, primary_color')
    .eq('id', tenantId)
    .single()

  const tenantMeta = tenant
    ? {
        business_name: tenant.business_name as string,
        primary_color: (tenant.primary_color as string | null) ?? '#111111',
      }
    : undefined

  const clients = await fetchClientsBySegment(db, tenantId, segment)

  let sent    = 0
  let failed  = 0
  let skipped = 0

  // Sequential processing with 600ms delay between emails (~1.6/sec < Resend 2/sec limit).
  // Push has no provider rate limit so it skips the delay.
  // NOTE: ~80+ email recipients will approach Vercel's 60s action timeout — migrate to
  // a background queue before targeting segments that large.
  for (const client of clients) {
    try {
      // Determine channel
      let channel: 'push' | 'email' | 'none'
      if (!client.profile_id) {
        channel = 'email'
      } else {
        channel = await getNotificationChannel(client.profile_id, tenantId)
      }

      if (channel === 'none') {
        skipped++
        continue
      }

      let success     = false
      let sentEmail   = false

      if (channel === 'push') {
        // profile_id guaranteed non-null when channel === 'push'
        const subs = await getSubscriptionsForProfile(tenantId, client.profile_id!)
        if (subs.length === 0) {
          // No live subscriptions — fall back to email
          channel = 'email'
        } else {
          const pushSent = await sendPushToSubscriptions(subs, {
            title: `Messaggio da ${tenantMeta?.business_name ?? 'il tuo barbiere'}`,
            body:  trimmed,
          })
          success = pushSent > 0
        }
      }

      if (channel === 'email') {
        if (!client.email) {
          skipped++
          continue
        }
        const result = await sendTemplatedEmail({
          to:           client.email,
          templateSlug: 'messaggio_mirato',
          variables: {
            client_name:   client.full_name,
            business_name: tenantMeta?.business_name ?? 'il tuo barbiere',
            message:       trimmed,
          },
          tenant:   tenantMeta,
          category: 'Messaggio dal tuo barbiere',
        })
        success    = result.success
        sentEmail  = true
      }

      if (success) {
        sent++
        await db.from('notification_log').insert({
          tenant_id:      tenantId,
          profile_id:     client.profile_id ?? null,
          appointment_id: null,
          type:           'campaign',
          sent_at:        new Date().toISOString(),
        })
      } else {
        failed++
      }

      // Throttle only email sends to stay within Resend rate limit
      if (sentEmail) {
        await new Promise((r) => setTimeout(r, 600))
      }
    } catch (err) {
      console.error('[sendCampaign] client error:', client.id, err)
      failed++
    }
  }

  return { sent, failed, skipped }
}
