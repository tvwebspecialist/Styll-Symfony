import { createClient } from '@/lib/supabase/server'

export async function listClientsWithChurn(tenantId: string, limit = 200) {
  const supabase = await createClient()
  return supabase
    .from('clients')
    .select(`
      id, full_name, phone, email, tags, created_at,
      analytics:client_analytics (
        churn_status, days_since_last_visit, avg_frequency_days,
        last_visit_date, total_visits
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
}

export async function countAtRisk(tenantId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('client_analytics')
    .select('client_id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('churn_status', ['yellow', 'red'])
  return count ?? 0
}

export async function listAtRiskClients(tenantId: string, limit = 50) {
  const supabase = await createClient()
  return supabase
    .from('client_analytics')
    .select(`
      client_id, churn_status, days_since_last_visit, avg_frequency_days,
      last_visit_date,
      client:clients ( id, full_name, phone, email, preferred_contact_channel )
    `)
    .eq('tenant_id', tenantId)
    .in('churn_status', ['yellow', 'red'])
    .order('days_since_last_visit', { ascending: false })
    .limit(limit)
}
