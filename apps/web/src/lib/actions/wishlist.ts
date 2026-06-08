'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function toggleWishlist(params: {
  tenantId: string
  clientId: string
  productId: string
  currentState: boolean
}): Promise<{ success: boolean; newState: boolean }> {
  const { tenantId, productId, currentState } = params

  // Resolve the client from the authenticated session — never trust the
  // clientId passed from the browser (it could target another client).
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, newState: currentState }

  const db = createAdminClient()

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return { success: false, newState: currentState }

  try {
    if (currentState) {
      await db
        .from('client_product_wishlist')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('client_id', client.id)
        .eq('product_id', productId)
    } else {
      await db.from('client_product_wishlist').insert({
        tenant_id: tenantId,
        client_id: client.id,
        product_id: productId,
      })
    }
    return { success: true, newState: !currentState }
  } catch {
    return { success: false, newState: currentState }
  }
}

export async function getWishlistProductIds(params: {
  tenantId: string
  clientId: string
}): Promise<string[]> {
  const { tenantId } = params

  // Resolve the client from the authenticated session — ignore the passed clientId.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const db = createAdminClient()

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return []

  const { data } = await db
    .from('client_product_wishlist')
    .select('product_id')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
  return (data ?? []).map((r) => r.product_id)
}

export async function addProductToAppointment(params: {
  tenantId: string
  appointmentId: string
  productId: string
  quantity: number
  priceAtSale: number
}): Promise<{ success: boolean; alreadyExists?: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non autenticato.' }

  const db = createAdminClient()
  const { tenantId, appointmentId, productId, quantity, priceAtSale } = params

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return { success: false, error: 'Cliente non trovato.' }

  const { data: appointment } = await db
    .from('appointments')
    .select('id')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!appointment) return { success: false, error: 'Appuntamento non trovato.' }

  const { data: existing } = await db
    .from('appointment_products')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) return { success: true, alreadyExists: true }

  const { error } = await db.from('appointment_products').insert({
    tenant_id: tenantId,
    appointment_id: appointmentId,
    product_id: productId,
    quantity,
    price_at_sale: priceAtSale,
  })

  if (error) return { success: false, error: 'Errore nel salvataggio.' }
  return { success: true }
}

type RawAppointmentService = {
  services: { name: string } | null
}

type RawAppointmentProduct = {
  product_id: string
}

type RawAppointmentRow = {
  id: string
  start_time: string
  end_time: string
  appointment_services: RawAppointmentService[] | null
  appointment_products: RawAppointmentProduct[] | null
}

export type UpcomingAppointmentWithStatus = {
  id: string
  start_time: string
  end_time: string
  serviceNames: string[]
  hasProduct: boolean
}

export async function getUpcomingAppointmentsForProduct(params: {
  tenantId: string
  profileId: string
  productId: string
}): Promise<UpcomingAppointmentWithStatus[]> {
  const { tenantId, profileId, productId } = params
  const db = createAdminClient()

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return []

  const { data: rows } = await db
    .from('appointments')
    .select(
      'id, start_time, end_time, appointment_services(services(name)), appointment_products(product_id)',
    )
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .in('status', ['pending', 'confirmed'])
    .gt('start_time', new Date().toISOString())
    .is('deleted_at', null)
    .order('start_time', { ascending: true })
    .limit(3)

  if (!rows) return []

  return (rows as unknown as RawAppointmentRow[]).map((a) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    serviceNames: (a.appointment_services ?? [])
      .map((s) => s.services?.name ?? '')
      .filter(Boolean),
    hasProduct: (a.appointment_products ?? []).some((p) => p.product_id === productId),
  }))
}
