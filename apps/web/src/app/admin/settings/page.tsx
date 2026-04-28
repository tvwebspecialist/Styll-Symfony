import { getAdminSettings, listEmailTemplates } from '@/app/admin/actions'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settingsRes, templatesRes] = await Promise.all([
    getAdminSettings(['feature_flags', 'maintenance', 'default_branding', 'security']),
    listEmailTemplates(),
  ])

  const settings = settingsRes.data ?? {}

  return (
    <SettingsClient
      featureFlags={(settings.feature_flags ?? {}) as Record<string, boolean>}
      maintenance={
        (settings.maintenance ?? { enabled: false, message: '' }) as {
          enabled: boolean
          message: string
        }
      }
      defaultBranding={
        (settings.default_branding ?? {
          primary_color: '#000000',
          secondary_color: '#ffffff',
          logo_url: '',
        }) as { primary_color: string; secondary_color: string; logo_url: string }
      }
      security={
        (settings.security ?? {
          require_2fa_superadmin: false,
          session_timeout_minutes: 60,
        }) as { require_2fa_superadmin: boolean; session_timeout_minutes: number }
      }
      templates={templatesRes.data ?? []}
    />
  )
}
