import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getAppSettings } from '@/lib/actions/app-settings'
import { AppSettingsClient } from '@/components/dashboard/app/AppSettingsClient'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const settings = await getAppSettings()
  return <AppSettingsClient initialSettings={settings} />
}
