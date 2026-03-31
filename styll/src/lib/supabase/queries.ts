import { supabase } from '../../config/supabase'
import type { Database } from '../../types/database'

type Tables = Database['public']['Tables']

export const queries = {
  // Tenants
  getTenant: (id: string) =>
    supabase.from('tenants').select('*').eq('id', id).single(),

  getTenantBySlug: (slug: string) =>
    supabase.from('tenants').select('*').eq('slug', slug).single(),

  // Staff
  getStaffMember: (profileId: string, tenantId: string) =>
    supabase
      .from('staff_members')
      .select('*, profiles(*)')
      .eq('profile_id', profileId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single(),

  getStaffByTenant: (tenantId: string) =>
    supabase
      .from('staff_members')
      .select('*, profiles(*)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .eq('is_active', true),

  // Appointments
  getAppointmentsByDate: (tenantId: string, startTime: string, endTime: string) =>
    supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name, phone),
        staff_members(*, profiles(full_name, avatar_url)),
        appointment_services(*, services(name, duration_minutes)),
        appointment_products(*, products(name)),
        payments(*)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('start_time', startTime)
      .lt('start_time', endTime)
      .order('start_time'),

  getAppointmentsByStaff: (tenantId: string, staffId: string, date: string) =>
    supabase
      .from('appointments')
      .select(`
        *,
        clients(full_name, phone),
        appointment_services(*, services(name, duration_minutes))
      `)
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffId)
      .gte('start_time', `${date}T00:00:00`)
      .lt('start_time', `${date}T23:59:59`)
      .is('deleted_at', null)
      .order('start_time'),

  // Clients
  getClients: (tenantId: string, search?: string) => {
    let query = supabase
      .from('clients')
      .select(`
        *,
        client_analytics(churn_status, vip_score, total_visits, last_visit_date, days_since_last_visit),
        client_loyalty(total_points, available_points, current_tier, current_streak)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('full_name')

    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    return query
  },

  getClientById: (clientId: string, tenantId: string) =>
    supabase
      .from('clients')
      .select(`
        *,
        client_analytics(*),
        client_loyalty(*),
        client_notes(*, staff_members(*, profiles(full_name))),
        client_consents(*)
      `)
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single(),

  // Loyalty
  getLoyaltyConfig: (tenantId: string) =>
    supabase
      .from('loyalty_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('ended_at', null)
      .single(),

  getRewards: (tenantId: string) =>
    supabase
      .from('rewards')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order'),

  getLoyaltyTransactions: (tenantId: string, clientId: string, limit = 20) =>
    supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit),

  // Analytics
  getClientAnalytics: (tenantId: string, clientId: string) =>
    supabase
      .from('client_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .single(),

  // Services
  getServices: (tenantId: string) =>
    supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order'),

  // Products
  getProducts: (tenantId: string) =>
    supabase
      .from('products')
      .select(`
        *,
        product_inventory(quantity, low_stock_threshold)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true),

  // Notifications
  getUnreadNotifications: (tenantId: string, staffId: string) =>
    supabase
      .from('staff_notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_read', false)
      .or(`staff_id.eq.${staffId},staff_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50),
}
