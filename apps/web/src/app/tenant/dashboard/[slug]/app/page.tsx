import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getAppSettings, getWebsiteData } from '@/lib/actions/app-settings'
import { deriveRuntimeLocationFromRequestHeaders } from '@/lib/app-public-urls'
import { AppSettingsClient } from '@/components/dashboard/app/AppSettingsClient'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')
  await requireTenantPermission(TENANT_PERMISSIONS.MANAGE_APP)

  const [settings, websiteData, headerStore] = await Promise.all([
    getAppSettings(),
    getWebsiteData(),
    headers(),
  ])
  const initialRuntimeLocation = deriveRuntimeLocationFromRequestHeaders(headerStore)

  return (
    <AppSettingsClient
      initialSettings={settings}
      initialWebsiteData={websiteData}
      initialRuntimeLocation={initialRuntimeLocation}
    />
  )
}
