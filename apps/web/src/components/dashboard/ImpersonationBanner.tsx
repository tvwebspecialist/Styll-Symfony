import { getImpersonationState } from '@/lib/tenant-context'
import { StopImpersonationButton } from './ImpersonationBannerClient'

interface ImpersonationBannerState {
  active: boolean
  businessName: string | null
}

export async function ImpersonationBanner({
  state: providedState,
}: {
  state?: ImpersonationBannerState
}) {
  const state = providedState ?? (await getImpersonationState())
  if (!state.active) return null

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#DC2626',
        color: '#FFFFFF',
        padding: '8px 16px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}
    >
      <span>
        🛡️ Stai visualizzando{' '}
        <strong>{state.businessName ?? 'questo tenant'}</strong> come Admin.
      </span>
      <StopImpersonationButton />
    </div>
  )
}
