import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { LogOut, ArrowRight, Scissors } from 'lucide-react'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function dashboardUrl(slug: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `/?_tenant_slug=${slug}&_tenant_type=dashboard`
  }
  return `https://${slug}-dashboard.${ROOT_DOMAIN}`
}

interface TenantInfo {
  id: string
  business_name: string
  logo_url: string | null
  slug: string
  status: string
}

export default async function SelectTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const db = createAdminClient()
  const { data: memberships } = await db
    .from('staff_members')
    .select('role, tenants!tenant_id(id, business_name, logo_url, slug, status)')
    .eq('profile_id', ctx.realUserId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/step-1')
  }

  // Single tenant → skip picker and go directly to dashboard
  if (memberships.length === 1) {
    const t = (memberships[0].tenants as unknown) as TenantInfo | null
    if (t?.slug) redirect(dashboardUrl(t.slug))
    redirect('/onboarding/step-1')
  }

  const sp = await searchParams
  const accessError = sp.error === 'access_denied'

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-fg)',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: '#111',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Scissors size={22} color="#fff" />
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            marginBottom: 8,
          }}
        >
          In quale spazio vuoi entrare?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-fg-secondary)', margin: 0 }}>
          Hai accesso a {memberships.length} spazi. Scegli quello che vuoi gestire.
        </p>
      </div>

      {/* Access denied error */}
      {accessError && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 14,
            color: '#DC2626',
            maxWidth: 480,
            width: '100%',
          }}
        >
          Non hai accesso a questo spazio. Seleziona uno degli spazi disponibili qui sotto.
        </div>
      )}

      {/* Tenant cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 480,
        }}
      >
        {memberships.map((m) => {
          const tenant = (m.tenants as unknown) as TenantInfo | null
          if (!tenant) return null
          const role = m.role as string
          const roleLabel = role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Manager' : 'Staff'
          const isSuspended = tenant.status === 'suspended'

          return (
            <a
              key={tenant.id}
              href={isSuspended ? undefined : dashboardUrl(tenant.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 16,
                border: '1.5px solid var(--color-border, #E5E7EB)',
                background: 'var(--color-bg-secondary, #FFFFFF)',
                textDecoration: 'none',
                color: 'inherit',
                cursor: isSuspended ? 'not-allowed' : 'pointer',
                opacity: isSuspended ? 0.5 : 1,
                transition: 'border-color 120ms, box-shadow 120ms',
              }}
              onMouseEnter={
                !isSuspended
                  ? (e) => {
                      ;(e.currentTarget as HTMLAnchorElement).style.borderColor = '#111'
                      ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                        '0 2px 12px rgba(0,0,0,0.08)'
                    }
                  : undefined
              }
              onMouseLeave={
                !isSuspended
                  ? (e) => {
                      ;(e.currentTarget as HTMLAnchorElement).style.borderColor =
                        'var(--color-border, #E5E7EB)'
                      ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
                    }
                  : undefined
              }
            >
              {/* Logo / placeholder */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tenant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tenant.logo_url}
                    alt={tenant.business_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Scissors size={20} color="#9CA3AF" />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--color-fg, #111)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tenant.business_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: role === 'owner' ? '#111' : '#F3F4F6',
                      color: role === 'owner' ? '#fff' : '#6B7280',
                    }}
                  >
                    {roleLabel}
                  </span>
                  {isSuspended && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: '#FEF2F2',
                        color: '#DC2626',
                      }}
                    >
                      Sospeso
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              {!isSuspended && <ArrowRight size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />}
            </a>
          )
        })}
      </div>

      {/* Sign out */}
      <form action={handleSignOut} style={{ marginTop: 32 }}>
        <button
          type="submit"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--color-fg-secondary, #9CA3AF)',
            padding: '6px 12px',
          }}
        >
          <LogOut size={14} />
          Esci dall&apos;account
        </button>
      </form>
    </div>
  )
}
