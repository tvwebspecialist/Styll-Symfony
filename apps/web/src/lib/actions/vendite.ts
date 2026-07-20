'use server'

import { requireOwnerManagerTenantContext } from '@/lib/tenant-role-guard'

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

const EMPTY_RIEPILOGO: RiepilogoData = {
  revenueOggi: 0,
  revenueSettimana: 0,
  revenueMese: 0,
  revenueMesePrecedente: 0,
  deltaPercentuale: 0,
  scontrinoMedio: 0,
  revenueServizi: 0,
  revenueProdotti: 0,
  appuntamentiCompletatiOggi: 0,
  topServizio: null,
}

function toNumber(value: number | string | null | undefined): number {
  return Number(value ?? 0)
}

export async function getRiepilogo(tenantId: string): Promise<RiepilogoData> {
  const ctx = await requireOwnerManagerTenantContext(tenantId)
  const db = ctx.db
  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const weekStart = daysAgo(6).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString()
  const prevMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)).toISOString()

  const { data, error } = await db
    .rpc('get_sales_summary', {
      p_tenant_id: tenantId,
      p_today_start: todayStart,
      p_today_end: todayEnd,
      p_week_start: weekStart,
      p_month_start: monthStart,
      p_month_end: monthEnd,
      p_prev_month_start: prevMonthStart,
      p_prev_month_end: prevMonthEnd,
    })
    .maybeSingle()

  if (error || !data) return EMPTY_RIEPILOGO

  const revenueOggi = toNumber(data.revenue_today)
  const revenueSettimana = toNumber(data.revenue_week)
  const revenueMese = toNumber(data.revenue_month)
  const revenueMesePrecedente = toNumber(data.revenue_previous_month)
  const deltaPercentuale =
    revenueMesePrecedente > 0
      ? ((revenueMese - revenueMesePrecedente) / revenueMesePrecedente) * 100
      : revenueMese > 0
        ? 100
        : 0
  const appuntamentiCompletatiMese = toNumber(data.appointments_completed_month)
  const scontrinoMedio = appuntamentiCompletatiMese > 0 ? revenueMese / appuntamentiCompletatiMese : 0
  const topServizio =
    data.top_service_name && data.top_service_count
      ? { name: data.top_service_name, count: toNumber(data.top_service_count) }
      : null

  return {
    revenueOggi,
    revenueSettimana,
    revenueMese,
    revenueMesePrecedente,
    deltaPercentuale,
    scontrinoMedio,
    revenueServizi: toNumber(data.revenue_services_month),
    revenueProdotti: toNumber(data.revenue_products_month),
    appuntamentiCompletatiOggi: toNumber(data.appointments_completed_today),
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
  const ctx = await requireOwnerManagerTenantContext(tenantId)
  const db = ctx.db
  const { data, error } = await db.rpc('get_sales_appointments', {
    p_tenant_id: tenantId,
    p_date_from: filters.dateFrom
      ? startOfDay(new Date(filters.dateFrom)).toISOString()
      : null,
    p_date_to: filters.dateTo
      ? endOfDay(new Date(filters.dateTo)).toISOString()
      : null,
    p_status: filters.status && filters.status !== 'tutti' ? filters.status : null,
  })
  if (error) return []

  return (data ?? []).map((r) => {
    const totalAmount = toNumber(r.total_amount)
    const paid = toNumber(r.paid_amount)
    let paymentStatus: 'paid' | 'pending' | 'partial' = 'pending'
    if (paid >= totalAmount && totalAmount > 0) paymentStatus = 'paid'
    else if (paid > 0) paymentStatus = 'partial'

    const start = new Date(r.start_time)
    return {
      id: r.id,
      date: start.toISOString().slice(0, 10),
      time: start.toTimeString().slice(0, 5),
      clientName: r.client_name ?? '—',
      services: r.service_names ?? [],
      totalAmount,
      paymentStatus,
      staffName: r.staff_name ?? '—',
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
  const ctx = await requireOwnerManagerTenantContext(tenantId)
  const db = ctx.db
  const now = new Date()
  const fromIso = filters.dateFrom
    ? startOfDay(new Date(filters.dateFrom)).toISOString()
    : startOfMonth(now).toISOString()
  const toIso = filters.dateTo
    ? endOfDay(new Date(filters.dateTo)).toISOString()
    : endOfDay(now).toISOString()

  const { data, error } = await db.rpc('get_sales_products', {
    p_tenant_id: tenantId,
    p_from: fromIso,
    p_to: toIso,
  })

  if (error) return []

  return (data ?? []).map((row) => ({
    productId: row.product_id,
    productName: row.product_name ?? '—',
    brand: row.brand ?? null,
    totalQty: toNumber(row.total_qty),
    totalRevenue: toNumber(row.total_revenue),
    currentStock: toNumber(row.current_stock),
    lowStockAlert: Boolean(row.low_stock_alert),
  }))
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
  const ctx = await requireOwnerManagerTenantContext(tenantId)
  const db = ctx.db
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
