'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface SiteSessionRow {
  id: string
}

interface SiteSessionUpdate {
  client_id: string
}

type SiteSessionTable = {
  update: (data: SiteSessionUpdate) => {
    eq: (col: string, val: string) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  }
}

type AnalyticsDb = {
  from: (table: 'site_sessions') => SiteSessionTable
}

export async function linkSessionToClient(
  tenantId: string,
  anonymousId: string,
  clientId: string
): Promise<void> {
  if (!tenantId || !anonymousId || !clientId) return
  try {
    const db = createAdminClient() as unknown as AnalyticsDb
    await db
      .from('site_sessions')
      .update({ client_id: clientId })
      .eq('tenant_id', tenantId)
      .eq('anonymous_id', anonymousId)
  } catch {
    // best-effort: never throw on analytics
  }
}

export async function linkSessionByAuthUser(
  tenantId: string,
  anonymousId: string
): Promise<void> {
  if (!tenantId || !anonymousId) return
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const db = createAdminClient()
    type ClientRow = { id: string }
    const { data: client } = await (db as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (a: string, b: string) => {
            eq: (a: string, b: string) => {
              maybeSingle: () => Promise<{ data: ClientRow | null }>
            }
          }
        }
      }
    })
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!client?.id) return
    await linkSessionToClient(tenantId, anonymousId, client.id)
  } catch {
    // best-effort
  }
}
