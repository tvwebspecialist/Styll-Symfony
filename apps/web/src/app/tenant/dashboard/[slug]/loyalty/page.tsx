import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getLoyaltySettings } from '@/lib/actions/loyalty-settings'
import { LoyaltySettingsClient } from '@/components/dashboard/loyalty/LoyaltySettingsClient'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const data = await getLoyaltySettings()
  if (!data) redirect('/login')

  return <LoyaltySettingsClient data={data} />
}
