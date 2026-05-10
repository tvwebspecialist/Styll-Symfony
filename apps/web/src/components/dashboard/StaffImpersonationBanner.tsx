import { getStaffImpersonationState } from '@/lib/tenant-context'
import { StaffImpersonationBannerClient } from './StaffImpersonationBannerClient'

export async function StaffImpersonationBanner() {
  const state = await getStaffImpersonationState()
  if (!state.active) return null
  return <StaffImpersonationBannerClient state={state} />
}
