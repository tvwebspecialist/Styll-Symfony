'use server'

import { revalidatePath } from 'next/cache'

import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'

export interface ActionResult {
  success: boolean
  error?: string
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface CreateAppointmentInput {
  tenantId: string
  clientId: string
  staffId: string
  locationId: string
  serviceIds: string[]
  startTime: string
  status?: AppointmentStatus
  bookingSource?: string
}

export interface AppointmentSummary {
  id: string
  tenant_id: string
  client_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
}

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<ActionResult & { data?: AppointmentSummary }> {
  try {
    const data = await fetchSymfonyAdminJson<{
      success: boolean
      data: AppointmentSummary
    }>(`/api/admin/tenants/${encodeURIComponent(input.tenantId)}/appointments`, {
      method: 'POST',
      body: input,
    })

    revalidatePath(`/admin/tenants/${input.tenantId}/appointments`)
    revalidatePath('/dashboard/vendite')
    revalidatePath('/dashboard/clienti')

    return { success: true, data: data.data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function updateAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/appointments/${encodeURIComponent(appointmentId)}/status`,
      {
        method: 'PATCH',
        body: { status },
      }
    )

    revalidatePath(`/admin/tenants/${tenantId}/appointments`)
    revalidatePath('/dashboard/vendite')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteAppointment(
  tenantId: string,
  appointmentId: string
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/appointments/${encodeURIComponent(appointmentId)}`,
      {
        method: 'DELETE',
      }
    )

    revalidatePath(`/admin/tenants/${tenantId}/appointments`)
    revalidatePath('/dashboard/vendite')
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function seedRandomAppointments(
  tenantId: string,
  count: number = 25
): Promise<ActionResult & { inserted?: number }> {
  try {
    const data = await fetchSymfonyAdminJson<{ success: boolean; inserted: number }>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/appointments/seed`,
      {
        method: 'POST',
        body: { count },
      }
    )

    revalidatePath(`/admin/tenants/${tenantId}/appointments`)
    revalidatePath('/dashboard/vendite')
    revalidatePath('/dashboard/clienti')
    return { success: true, inserted: data.inserted }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
