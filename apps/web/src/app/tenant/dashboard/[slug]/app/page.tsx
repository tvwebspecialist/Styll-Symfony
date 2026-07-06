import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getAppSettings, getWebsiteData } from '@/lib/actions/app-settings'
import { AppSettingsClient } from '@/components/dashboard/app/AppSettingsClient'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')
  await requireTenantPermission(TENANT_PERMISSIONS.MANAGE_APP)

  const [settings, websiteData] = await Promise.all([getAppSettings(), getWebsiteData()])
  return <AppSettingsClient initialSettings={settings} initialWebsiteData={websiteData} />
}
