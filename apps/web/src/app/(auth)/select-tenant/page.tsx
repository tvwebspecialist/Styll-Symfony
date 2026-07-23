import { redirect } from 'next/navigation'
import { LogOut, ArrowRight, Scissors } from 'lucide-react'
import {
  getOptionalSymfonyStaffMe,
  listSymfonyStaffMemberships,
} from '@/lib/symfony/staff-context'
import { clearSymfonyStaffJwtCookieInStore } from '@/lib/symfony/staff-session'
import { cookies } from 'next/headers'

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
  const me = await getOptionalSymfonyStaffMe()
  if (!me) redirect('/login')

  const memberships = listSymfonyStaffMemberships(me)
  if (memberships.length === 0) {
    redirect('/onboarding/step-1')
  }

  // Single tenant → skip picker and go directly to dashboard
  if (memberships.length === 1) {
    const t = {
      id: memberships[0].tenant.id,
      business_name: memberships[0].tenant.businessName,
      logo_url: memberships[0].tenant.logoUrl,
      slug: memberships[0].tenant.slug,
      status: memberships[0].tenant.status,
    } satisfies TenantInfo
    if (t?.slug) redirect(dashboardUrl(t.slug))
    redirect('/onboarding/step-1')
  }

  const sp = await searchParams
  const accessError = sp.error === 'access_denied'

  async function handleSignOut() {
    'use server'
    const cookieStore = await cookies()
    clearSymfonyStaffJwtCookieInStore(cookieStore)
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
      <style dangerouslySetInnerHTML={{ __html: `
        .tenant-card {
          border: 1.5px solid var(--color-border, #E5E7EB);
          transition: border-color 120ms, box-shadow 120ms;
        }
        .tenant-card:not(.tenant-card--suspended):hover {
          border-color: #111;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }
      ` }} />
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
        {memberships.map((membership) => {
          const tenant = {
            id: membership.tenant.id,
            business_name: membership.tenant.businessName,
            logo_url: membership.tenant.logoUrl,
            slug: membership.tenant.slug,
            status: membership.tenant.status,
          } satisfies TenantInfo
          if (!tenant) return null
          const role = membership.role
          const roleLabel = role === 'owner' ? 'Proprietario' : role === 'manager' ? 'Manager' : 'Staff'
          const isSuspended = tenant.status === 'suspended'

          return (
            <a
              key={tenant.id}
              href={isSuspended ? undefined : dashboardUrl(tenant.slug)}
              className={isSuspended ? 'tenant-card tenant-card--suspended' : 'tenant-card'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                borderRadius: 16,
                background: 'var(--color-bg-secondary, #FFFFFF)',
                textDecoration: 'none',
                color: 'inherit',
                cursor: isSuspended ? 'not-allowed' : 'pointer',
                opacity: isSuspended ? 0.5 : 1,
              }}
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
