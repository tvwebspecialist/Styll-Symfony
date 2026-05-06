import { cookies } from 'next/headers'
import { StopStaffViewButton } from './StaffViewBannerClient'

interface StaffViewCookie {
  staffId: string
  staffName: string
  tenantId: string
}

export async function StaffViewBanner() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('styll_staff_view')?.value
  if (!raw) return null

  let staffName = 'Staff'
  try {
    const data = JSON.parse(raw) as StaffViewCookie
    staffName = data.staffName ?? 'Staff'
  } catch {
    // invalid cookie — ignore
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 99,
        background: '#059669',
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
        👤 Stai operando come <strong>{staffName}</strong>
      </span>
      <StopStaffViewButton />
    </div>
  )
}
