import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const [users, tenants] = await Promise.all([
    fetchSymfonyAdminJson<Array<{
      id: string
      full_name: string | null
      email: string | null
      is_superadmin: boolean | null
      onboarding_completed: boolean | null
      created_at: string
    }>>('/api/admin/users'),
    fetchSymfonyAdminJson<Array<{
      id: string
      business_name: string
      slug: string
    }>>('/api/admin/tenants'),
  ])

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: 'var(--font-primary)' }}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>Team Styll</h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Gestisci i profili interni della piattaforma.
        </p>
      </div>
      <UsersClient
        initialUsers={users as never}
        initialTenants={tenants.map((tenant) => ({
          id: tenant.id,
          business_name: tenant.business_name,
          slug: tenant.slug,
        })) as never}
      />
    </div>
  )
}
