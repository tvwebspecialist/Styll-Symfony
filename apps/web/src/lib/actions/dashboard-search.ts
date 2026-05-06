'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'

export interface SearchResult {
  type: 'client' | 'appointment' | 'service'
  id: string
  title: string
  subtitle: string
  href: string
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export async function dashboardSearch(query: string): Promise<SearchResult[]> {
  const tenantId = await getActiveTenantId()
  if (!tenantId || !query.trim()) return []

  const db = createAdminClient()
  const q = query.trim()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [clientsRes, apptsRes, servicesRes] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, phone, email')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(3),

    db
      .from('appointments')
      .select('id, start_time, status, client_id, clients(full_name)')
      .eq('tenant_id', tenantId)
      .gte('start_time', `${thirtyDaysAgo}T00:00:00`)
      .limit(3),

    db
      .from('services')
      .select('id, name, category, price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .limit(3),
  ])

  const results: SearchResult[] = []

  for (const c of clientsRes.data ?? []) {
    results.push({
      type: 'client',
      id: c.id,
      title: c.full_name ?? 'Cliente',
      subtitle: c.phone ?? c.email ?? '',
      href: `/clienti/${c.id}`,
    })
  }

  // Filter appointments by client name
  for (const a of apptsRes.data ?? []) {
    const clientName: string = (a.clients as any)?.full_name ?? ''
    if (!clientName.toLowerCase().includes(q.toLowerCase())) continue
    const dayStr = a.start_time?.slice(0, 10) ?? ''
    results.push({
      type: 'appointment',
      id: a.id,
      title: clientName,
      subtitle: `${fmtDate(a.start_time)} · ${a.status}`,
      href: `/calendario?day=${dayStr}`,
    })
  }

  for (const s of servicesRes.data ?? []) {
    results.push({
      type: 'service',
      id: s.id,
      title: s.name,
      subtitle: `${(s as any).category ?? 'Servizio'} · €${(s as any).price ?? 0}`,
      href: '/catalogo',
    })
  }

  return results
}

export async function getRecentClients(): Promise<SearchResult[]> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('client_analytics')
    .select('client_id, last_visit_date, clients(full_name, phone)')
    .eq('tenant_id', tenantId)
    .not('last_visit_date', 'is', null)
    .order('last_visit_date', { ascending: false })
    .limit(3)

  return (data ?? []).map((row: any) => ({
    type: 'client' as const,
    id: row.client_id,
    title: row.clients?.full_name ?? 'Cliente',
    subtitle: row.clients?.phone ?? '',
    href: `/clienti/${row.client_id}`,
  }))
}
