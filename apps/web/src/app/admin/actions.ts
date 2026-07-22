'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { clearAdminShadowCookie } from '@/lib/admin-shadow-cookie'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOptionalSymfonyStaffMe } from '@/lib/symfony/staff-context'
import { clearSymfonyStaffJwtCookieInStore } from '@/lib/symfony/staff-session'

import {
  assignTenantOwnerByEmail as assignTenantOwnerByEmailAction,
  assignTenantOwnerToMe as assignTenantOwnerToMeAction,
  createTenant as createTenantAction,
  deleteTenant as deleteTenantAction,
  exportTenantData as exportTenantDataAction,
  getAdminGlobalOverview as getAdminGlobalOverviewAction,
  getTenantOwnerInfo as getTenantOwnerInfoAction,
  softDeleteTenant as softDeleteTenantAction,
  startTenantImpersonation as startTenantImpersonationAction,
  stopTenantImpersonation as stopTenantImpersonationAction,
  toggleTenantStatus as toggleTenantStatusAction,
  updateTenant as updateTenantAction,
  updateTenantSubscription as updateTenantSubscriptionAction,
} from './actions-tenants'
import {
  deleteUser as deleteUserAction,
  getTenantOwner as getTenantOwnerAction,
  getUserTenants as getUserTenantsAction,
  impersonateUser as impersonateUserAction,
  inviteUser as inviteUserAction,
  resetUserPassword as resetUserPasswordAction,
  updateProfile as updateProfileAction,
} from './actions-users'
import {
  createLocation as createLocationAction,
  createService as createServiceAction,
  createStaff as createStaffAction,
  deleteLocation as deleteLocationAction,
  deleteService as deleteServiceAction,
  deleteStaff as deleteStaffAction,
  reorderServices as reorderServicesAction,
  setWorkingHours as setWorkingHoursAction,
  updateLocation as updateLocationAction,
  updateService as updateServiceAction,
  updateStaff as updateStaffAction,
  uploadAdminImage as uploadAdminImageAction,
} from './actions-content'
import {
  createSubscriptionPlan as createSubscriptionPlanAction,
  deleteSubscriptionPlan as deleteSubscriptionPlanAction,
  getPlansWithStats as getPlansWithStatsAction,
  listPlanOptions as listPlanOptionsAction,
  listTenantsOnPlan as listTenantsOnPlanAction,
  updateSubscriptionPlan as updateSubscriptionPlanAction,
} from './actions-plans'
import {
  createTenantClient as createTenantClientAction,
  deleteTenantClient as deleteTenantClientAction,
  getAppointmentFormOptions as getAppointmentFormOptionsAction,
  getImportJobErrors as getImportJobErrorsAction,
  importClientsForTenant as importClientsForTenantAction,
  listTenantAppointments as listTenantAppointmentsAction,
  listTenantAppointmentsDetailed as listTenantAppointmentsDetailedAction,
  listTenantClients as listTenantClientsAction,
  listTenantClientsDetailed as listTenantClientsDetailedAction,
  listTenantImportJobs as listTenantImportJobsAction,
  seedDemoClients as seedDemoClientsAction,
  updateTenantClient as updateTenantClientAction,
} from './actions-data'
import {
  adminGlobalSearch as adminGlobalSearchAction,
  getAdminSettings as getAdminSettingsAction,
  getAdminStats as getAdminStatsAction,
  getAuditLog as getAuditLogAction,
  listEmailTemplates as listEmailTemplatesAction,
  setAdminSetting as setAdminSettingAction,
  updateEmailTemplate as updateEmailTemplateAction,
} from './actions-system'

export type { AdminGlobalOverview, TenantInput, TenantSubscriptionInput, TopTenantRow } from './actions-tenants'
export type { OnboardingToken } from './actions-onboarding'
export type { DaySlot, LocationInput, ServiceInput, StaffInput } from './actions-content'
export type { PlanOption, PlanWithStats, SubscriptionPlanInput, TenantOnPlan } from './actions-plans'
export type { AppointmentFormOptions, ImportJobRow, TenantAppointmentDetailedRow, TenantAppointmentRow, TenantClientDetailedRow, TenantClientInput, TenantClientRow, TenantClientUpdateInput } from './actions-data'
export type { AdminStats, AuditEntry, EmailTemplate } from './actions-system'

export interface ActionResult {
  success: boolean
  error?: string
}

export async function requireSuperadmin(): Promise<{ id: string } | { error: string }> {
  const me = await getOptionalSymfonyStaffMe()
  if (!me) return { error: 'Sessione non valida.' }
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', me.user.id)
    .maybeSingle()
  if (!profile?.is_superadmin) return { error: 'Permessi insufficienti.' }
  return { id: me.user.id }
}

export async function bumpAdmin() {
  revalidatePath('/admin', 'layout')
}

export async function signOutAction() {
  const cookieStore = await cookies()
  clearAdminShadowCookie(cookieStore)
  clearSymfonyStaffJwtCookieInStore(cookieStore)
  redirect('/login')
}

export async function assignTenantOwnerByEmail(
  ...args: Parameters<typeof assignTenantOwnerByEmailAction>
) {
  return assignTenantOwnerByEmailAction(...args)
}

export async function assignTenantOwnerToMe(
  ...args: Parameters<typeof assignTenantOwnerToMeAction>
) {
  return assignTenantOwnerToMeAction(...args)
}

export async function createTenant(
  ...args: Parameters<typeof createTenantAction>
) {
  return createTenantAction(...args)
}

export async function deleteTenant(
  ...args: Parameters<typeof deleteTenantAction>
) {
  return deleteTenantAction(...args)
}

export async function exportTenantData(
  ...args: Parameters<typeof exportTenantDataAction>
) {
  return exportTenantDataAction(...args)
}

export async function getAdminGlobalOverview(
  ...args: Parameters<typeof getAdminGlobalOverviewAction>
) {
  return getAdminGlobalOverviewAction(...args)
}

export async function getTenantOwnerInfo(
  ...args: Parameters<typeof getTenantOwnerInfoAction>
) {
  return getTenantOwnerInfoAction(...args)
}

export async function softDeleteTenant(
  ...args: Parameters<typeof softDeleteTenantAction>
) {
  return softDeleteTenantAction(...args)
}

export async function startTenantImpersonation(
  ...args: Parameters<typeof startTenantImpersonationAction>
) {
  return startTenantImpersonationAction(...args)
}

export async function stopTenantImpersonation(
  ...args: Parameters<typeof stopTenantImpersonationAction>
) {
  return stopTenantImpersonationAction(...args)
}

export async function toggleTenantStatus(
  ...args: Parameters<typeof toggleTenantStatusAction>
) {
  return toggleTenantStatusAction(...args)
}

export async function updateTenant(
  ...args: Parameters<typeof updateTenantAction>
) {
  return updateTenantAction(...args)
}

export async function updateTenantSubscription(
  ...args: Parameters<typeof updateTenantSubscriptionAction>
) {
  return updateTenantSubscriptionAction(...args)
}

export async function deleteUser(
  ...args: Parameters<typeof deleteUserAction>
) {
  return deleteUserAction(...args)
}

export async function getTenantOwner(
  ...args: Parameters<typeof getTenantOwnerAction>
) {
  return getTenantOwnerAction(...args)
}

export async function getUserTenants(
  ...args: Parameters<typeof getUserTenantsAction>
) {
  return getUserTenantsAction(...args)
}

export async function impersonateUser(
  ...args: Parameters<typeof impersonateUserAction>
) {
  return impersonateUserAction(...args)
}

export async function inviteUser(
  ...args: Parameters<typeof inviteUserAction>
) {
  return inviteUserAction(...args)
}

export async function resetUserPassword(
  ...args: Parameters<typeof resetUserPasswordAction>
) {
  return resetUserPasswordAction(...args)
}

export async function updateProfile(
  ...args: Parameters<typeof updateProfileAction>
) {
  return updateProfileAction(...args)
}

export async function createLocation(
  ...args: Parameters<typeof createLocationAction>
) {
  return createLocationAction(...args)
}

export async function createService(
  ...args: Parameters<typeof createServiceAction>
) {
  return createServiceAction(...args)
}

export async function createStaff(
  ...args: Parameters<typeof createStaffAction>
) {
  return createStaffAction(...args)
}

export async function deleteLocation(
  ...args: Parameters<typeof deleteLocationAction>
) {
  return deleteLocationAction(...args)
}

export async function deleteService(
  ...args: Parameters<typeof deleteServiceAction>
) {
  return deleteServiceAction(...args)
}

export async function deleteStaff(
  ...args: Parameters<typeof deleteStaffAction>
) {
  return deleteStaffAction(...args)
}

export async function reorderServices(
  ...args: Parameters<typeof reorderServicesAction>
) {
  return reorderServicesAction(...args)
}

export async function setWorkingHours(
  ...args: Parameters<typeof setWorkingHoursAction>
) {
  return setWorkingHoursAction(...args)
}

export async function updateLocation(
  ...args: Parameters<typeof updateLocationAction>
) {
  return updateLocationAction(...args)
}

export async function updateService(
  ...args: Parameters<typeof updateServiceAction>
) {
  return updateServiceAction(...args)
}

export async function updateStaff(
  ...args: Parameters<typeof updateStaffAction>
) {
  return updateStaffAction(...args)
}

export async function uploadAdminImage(
  ...args: Parameters<typeof uploadAdminImageAction>
) {
  return uploadAdminImageAction(...args)
}

export async function createSubscriptionPlan(
  ...args: Parameters<typeof createSubscriptionPlanAction>
) {
  return createSubscriptionPlanAction(...args)
}

export async function deleteSubscriptionPlan(
  ...args: Parameters<typeof deleteSubscriptionPlanAction>
) {
  return deleteSubscriptionPlanAction(...args)
}

export async function getPlansWithStats(
  ...args: Parameters<typeof getPlansWithStatsAction>
) {
  return getPlansWithStatsAction(...args)
}

export async function listPlanOptions(
  ...args: Parameters<typeof listPlanOptionsAction>
) {
  return listPlanOptionsAction(...args)
}

export async function listTenantsOnPlan(
  ...args: Parameters<typeof listTenantsOnPlanAction>
) {
  return listTenantsOnPlanAction(...args)
}

export async function updateSubscriptionPlan(
  ...args: Parameters<typeof updateSubscriptionPlanAction>
) {
  return updateSubscriptionPlanAction(...args)
}

export async function createTenantClient(
  ...args: Parameters<typeof createTenantClientAction>
) {
  return createTenantClientAction(...args)
}

export async function deleteTenantClient(
  ...args: Parameters<typeof deleteTenantClientAction>
) {
  return deleteTenantClientAction(...args)
}

export async function getAppointmentFormOptions(
  ...args: Parameters<typeof getAppointmentFormOptionsAction>
) {
  return getAppointmentFormOptionsAction(...args)
}

export async function getImportJobErrors(
  ...args: Parameters<typeof getImportJobErrorsAction>
) {
  return getImportJobErrorsAction(...args)
}

export async function importClientsForTenant(
  ...args: Parameters<typeof importClientsForTenantAction>
) {
  return importClientsForTenantAction(...args)
}

export async function listTenantAppointments(
  ...args: Parameters<typeof listTenantAppointmentsAction>
) {
  return listTenantAppointmentsAction(...args)
}

export async function listTenantAppointmentsDetailed(
  ...args: Parameters<typeof listTenantAppointmentsDetailedAction>
) {
  return listTenantAppointmentsDetailedAction(...args)
}

export async function listTenantClients(
  ...args: Parameters<typeof listTenantClientsAction>
) {
  return listTenantClientsAction(...args)
}

export async function listTenantClientsDetailed(
  ...args: Parameters<typeof listTenantClientsDetailedAction>
) {
  return listTenantClientsDetailedAction(...args)
}

export async function listTenantImportJobs(
  ...args: Parameters<typeof listTenantImportJobsAction>
) {
  return listTenantImportJobsAction(...args)
}

export async function seedDemoClients(
  ...args: Parameters<typeof seedDemoClientsAction>
) {
  return seedDemoClientsAction(...args)
}

export async function updateTenantClient(
  ...args: Parameters<typeof updateTenantClientAction>
) {
  return updateTenantClientAction(...args)
}

export async function adminGlobalSearch(
  ...args: Parameters<typeof adminGlobalSearchAction>
) {
  return adminGlobalSearchAction(...args)
}

export async function getAdminSettings(
  ...args: Parameters<typeof getAdminSettingsAction>
) {
  return getAdminSettingsAction(...args)
}

export async function getAdminStats(
  ...args: Parameters<typeof getAdminStatsAction>
) {
  return getAdminStatsAction(...args)
}

export async function getAuditLog(
  ...args: Parameters<typeof getAuditLogAction>
) {
  return getAuditLogAction(...args)
}

export async function listEmailTemplates(
  ...args: Parameters<typeof listEmailTemplatesAction>
) {
  return listEmailTemplatesAction(...args)
}

export async function setAdminSetting(
  ...args: Parameters<typeof setAdminSettingAction>
) {
  return setAdminSettingAction(...args)
}

export async function updateEmailTemplate(
  ...args: Parameters<typeof updateEmailTemplateAction>
) {
  return updateEmailTemplateAction(...args)
}
