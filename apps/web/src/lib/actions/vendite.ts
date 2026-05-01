'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function daysAgo(n: number): Date {
  const x = new Date()
  x.setDate(x.getDate() - n)
  return startOfDay(x)
}

export async function getCurrentTenantId(): Promise<string | null> {
  return getActiveTenantId()
}

export interface RiepilogoData {
  revenueOggi: number
  revenueSettimana: number
  revenueMese: number
  revenueMesePrecedente: number
  deltaPercentuale: number
  scontrinoMedio: number
  revenueServizi: number
  revenueProdotti: number
  appuntamentiCompletatiOggi: number
  topServizio: { name: string; count: number } | null
}

export async function getRiepilogo(tenantId: string): Promise<RiepilogoData> {
  const db = createAdminClient()
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const weekStart = daysAgo(6).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString()
  const prevMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString()

  async function appointmentIdsInRange(from: string, to: string) {
    const { data } = await db
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('start_time', from)
      .lte('start_time', to)
    return (data ?? []).map((r) => r.id)
  }

  async function sumServices(ids: string[]) {
    if (ids.length === 0) return 0
    const { data } = await db
      .from('appointment_services')
      .select('price_at_booking')
      .eq('tenant_id', tenantId)
      .in('appointment_id', ids)
    return (data ?? []).reduce((s, r) => s + Number(r.price_at_booking ?? 0), 0)
  }

  async function sumProducts(ids: string[]) {
    if (ids.length === 0) return 0
    const { data } = await db
      .from('appointment_products')
      .select('price_at_sale, quantity')
      .eq('tenant_id', tenantId)
      .in('appointment_id', ids)
    return (data ?? []).reduce(
      (s, r) => s + Number(r.price_at_sale ?? 0) * Number(r.quantity ?? 1),
      0,
    )
  }

  const [todayIds, weekIds, monthIds, prevMonthIds] = await Promise.all([
    appointmentIdsInRange(todayStart, todayEnd),
    appointmentIdsInRange(weekStart, todayEnd),
    appointmentIdsInRange(monthStart, monthEnd),
    appointmentIdsInRange(prevMonthStart, prevMonthEnd),
  ])

  const [
    todayServ,
    todayProd,
    weekServ,
    weekProd,
    monthServ,
    monthProd,
    prevMonthServ,
    prevMonthProd,
  ] = await Promise.all([
    sumServices(todayIds),
    sumProducts(todayIds),
    sumServices(weekIds),
    sumProducts(weekIds),
    sumServices(monthIds),
    sumProducts(monthIds),
    sumServices(prevMonthIds),
    sumProducts(prevMonthIds),
  ])

  const revenueOggi = todayServ + todayProd
  const revenueSettimana = weekServ + weekProd
  const revenueMese = monthServ + monthProd
  const revenueMesePrecedente = prevMonthServ + prevMonthProd
  const deltaPercentuale =
    revenueMesePrecedente > 0
      ? ((revenueMese - revenueMesePrecedente) / revenueMesePrecedente) * 100
      : revenueMese > 0
        ? 100
        : 0
  const scontrinoMedio = monthIds.length > 0 ? revenueMese / monthIds.length : 0

  let topServizio: { name: string; count: number } | null = null
  if (monthIds.length > 0) {
    const { data: topData } = await db
      .from('appointment_services')
      .select('service_id, services(name)')
      .eq('tenant_id', tenantId)
      .in('appointment_id', monthIds)
    const counts = new Map<string, { name: string; count: number }>()
    for (const row of topData ?? []) {
      const svc = Array.isArray(row.services) ? row.services[0] : row.services
      const name = svc?.name ?? 'Servizio'
      const key = row.service_id
      const cur = counts.get(key)
      if (cur) cur.count += 1
      else counts.set(key, { name, count: 1 })
    }
    let best: { name: string; count: number } | null = null
    for (const v of counts.values()) {
      if (!best || v.count > best.count) best = v
    }
    topServizio = best
  }

  return {
    revenueOggi,
    revenueSettimana,
    revenueMese,
    revenueMesePrecedente,
    deltaPercentuale,
    scontrinoMedio,
    revenueServizi: monthServ,
    revenueProdotti: monthProd,
    appuntamentiCompletatiOggi: todayIds.length,
    topServizio,
  }
}

export interface AppuntamentoVendita {
  id: string
  date: string
  time: string
  clientName: string
  services: string[]
  totalAmount: number
  paymentStatus: 'paid' | 'pending' | 'partial'
  staffName: string
  status: string
}

export interface AppuntamentiFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
}

export async function getAppuntamentiVendite(
  tenantId: string,
  filters: AppuntamentiFilters = {},
): Promise<AppuntamentoVendita[]> {
  const db = createAdminClient()
  let q = db
    .from('appointments')
    .select(
      `id, start_time, status, client:clients(full_name), staff:staff_members(profile:profiles(full_name)), appointment_services(price_at_booking, services(name)), appointment_products(price_at_sale, quantity), payments(amount, status)`,
    )
    .eq('tenant_id', tenantId)
    .order('start_time', { ascending: false })
    .limit(200)

  if (filters.dateFrom) q = q.gte('start_time', startOfDay(new Date(filters.dateFrom)).toISOString())
  if (filters.dateTo) q = q.lte('start_time', endOfDay(new Date(filters.dateTo)).toISOString())
  if (filters.status && filters.status !== 'tutti') q = q.eq('status', filters.status)

  const { data, error } = await q
  if (error) return []

  return (data ?? []).map((r) => {
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    const staff = Array.isArray(r.staff) ? r.staff[0] : r.staff
    const profile = staff && (Array.isArray(staff.profile) ? staff.profile[0] : staff.profile)
    const services = (r.appointment_services ?? []).map((s) => {
      const svc = Array.isArray(s.services) ? s.services[0] : s.services
      return svc?.name ?? ''
    })
    const totalServ = (r.appointment_services ?? []).reduce(
      (sum, s) => sum + Number(s.price_at_booking ?? 0),
      0,
    )
    const totalProd = (r.appointment_products ?? []).reduce(
      (sum, p) => sum + Number(p.price_at_sale ?? 0) * Number(p.quantity ?? 1),
      0,
    )
    const totalAmount = totalServ + totalProd
    const paid = (r.payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0,
    )
    let paymentStatus: 'paid' | 'pending' | 'partial' = 'pending'
    if (paid >= totalAmount && totalAmount > 0) paymentStatus = 'paid'
    else if (paid > 0) paymentStatus = 'partial'

    const start = new Date(r.start_time)
    return {
      id: r.id,
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      clientName: client?.full_name ?? '—',
      services,
      totalAmount,
      paymentStatus,
      staffName: profile?.full_name ?? '—',
      status: r.status,
    }
  })
}

export interface ProdottoVenduto {
  productId: string
  productName: string
  brand: string | null
  totalQty: number
  totalRevenue: number
  currentStock: number
  lowStockAlert: boolean
}

export interface ProdottiFilters {
  dateFrom?: string
  dateTo?: string
}

export async function getProdottiVenduti(
  tenantId: string,
  filters: ProdottiFilters = {},
): Promise<ProdottoVenduto[]> {
  const db = createAdminClient()
  const now = new Date()
  const fromIso = filters.dateFrom
    ? startOfDay(new Date(filters.dateFrom)).toISOString()
    : startOfMonth(now).toISOString()
  const toIso = filters.dateTo
    ? endOfDay(new Date(filters.dateTo)).toISOString()
    : endOfDay(now).toISOString()

  const { data: appts } = await db
    .from('appointments')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('start_time', fromIso)
    .lte('start_time', toIso)
  const apptIds = (appts ?? []).map((a) => a.id)

  if (apptIds.length === 0) return []

  const { data: sales } = await db
    .from('appointment_products')
    .select('product_id, price_at_sale, quantity, products(name, brand)')
    .eq('tenant_id', tenantId)
    .in('appointment_id', apptIds)

  const map = new Map<string, ProdottoVenduto>()
  for (const r of sales ?? []) {
    const p = Array.isArray(r.products) ? r.products[0] : r.products
    const qty = Number(r.quantity ?? 1)
    const rev = Number(r.price_at_sale ?? 0) * qty
    const cur = map.get(r.product_id)
    if (cur) {
      cur.totalQty += qty
      cur.totalRevenue += rev
    } else {
      map.set(r.product_id, {
        productId: r.product_id,
        productName: p?.name ?? '—',
        brand: p?.brand ?? null,
        totalQty: qty,
        totalRevenue: rev,
        currentStock: 0,
        lowStockAlert: false,
      })
    }
  }

  const productIds = Array.from(map.keys())
  if (productIds.length > 0) {
    const { data: stock } = await db
      .from('product_inventory')
      .select('product_id, quantity, low_stock_threshold')
      .eq('tenant_id', tenantId)
      .in('product_id', productIds)
    const stockMap = new Map<string, { qty: number; threshold: number }>()
    for (const s of stock ?? []) {
      const cur = stockMap.get(s.product_id) ?? { qty: 0, threshold: s.low_stock_threshold ?? 0 }
      cur.qty += Number(s.quantity ?? 0)
      cur.threshold = Math.max(cur.threshold, Number(s.low_stock_threshold ?? 0))
      stockMap.set(s.product_id, cur)
    }
    for (const [pid, prod] of map) {
      const s = stockMap.get(pid)
      if (s) {
        prod.currentStock = s.qty
        prod.lowStockAlert = s.qty <= s.threshold
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export interface Pagamento {
  id: string
  date: string
  clientName: string
  amount: number
  paymentMethod: string
  paymentStatus: string
}

export interface PagamentiFilters {
  dateFrom?: string
  dateTo?: string
  status?: string
}

export interface PagamentiResult {
  rows: Pagamento[]
  totaleIncassato: number
  daIncassare: number
}

export async function getPagamenti(
  tenantId: string,
  filters: PagamentiFilters = {},
): Promise<PagamentiResult> {
  const db = createAdminClient()
  let q = db
    .from('payments')
    .select('id, paid_at, amount, payment_method, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('paid_at', { ascending: false })
    .limit(500)

  if (filters.dateFrom) q = q.gte('paid_at', startOfDay(new Date(filters.dateFrom)).toISOString())
  if (filters.dateTo) q = q.lte('paid_at', endOfDay(new Date(filters.dateTo)).toISOString())
  if (filters.status && filters.status !== 'tutti') q = q.eq('status', filters.status)

  const { data } = await q

  const rows: Pagamento[] = (data ?? []).map((r) => {
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    return {
      id: r.id,
      date: new Date(r.paid_at).toISOString().slice(0, 10),
      clientName: client?.full_name ?? '—',
      amount: Number(r.amount ?? 0),
      paymentMethod: r.payment_method ?? '—',
      paymentStatus: r.status ?? 'pending',
    }
  })

  const totaleIncassato = rows
    .filter((r) => r.paymentStatus === 'paid' || r.paymentStatus === 'completed')
    .reduce((s, r) => s + r.amount, 0)
  const daIncassare = rows
    .filter((r) => r.paymentStatus === 'pending' || r.paymentStatus === 'partial')
    .reduce((s, r) => s + r.amount, 0)

  return { rows, totaleIncassato, daIncassare }
}
