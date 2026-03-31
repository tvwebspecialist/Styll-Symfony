import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate } from '../../lib/utils/date'

const AdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Array<Record<string, unknown>>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0 })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('tenants')
        .select(`
          id, business_name, slug, status, created_at,
          tenant_subscriptions(status, plan_id, subscription_plans(name))
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      const list = data ?? []
      setTenants(list)
      setStats({
        total: list.length,
        active: list.filter(t => (t.tenant_subscriptions as Array<{ status: string }>)?.[0]?.status === 'active').length,
        trial: list.filter(t => (t.tenant_subscriptions as Array<{ status: string }>)?.[0]?.status === 'trial').length,
      })
      setIsLoading(false)
    }
    load()
  }, [])

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Tenant totali</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          <p className="text-sm text-gray-500">Abbonamenti attivi</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold text-blue-600">{stats.trial}</p>
          <p className="text-sm text-gray-500">In prova</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Barbieri registrati</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Nome</th>
                <th className="text-left py-2 text-gray-500 font-medium">Slug</th>
                <th className="text-left py-2 text-gray-500 font-medium">Piano</th>
                <th className="text-left py-2 text-gray-500 font-medium">Stato</th>
                <th className="text-left py-2 text-gray-500 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.map(tenant => {
                const sub = (tenant.tenant_subscriptions as Array<{ status: string; subscription_plans?: { name: string } }>)?.[0]
                return (
                  <tr key={tenant.id as string}>
                    <td className="py-2 font-medium text-gray-900">{tenant.business_name as string}</td>
                    <td className="py-2 text-gray-500">{tenant.slug as string}</td>
                    <td className="py-2">{sub?.subscription_plans?.name ?? '—'}</td>
                    <td className="py-2">
                      <Badge variant={
                        sub?.status === 'active' ? 'success' :
                        sub?.status === 'trial' ? 'info' :
                        'danger'
                      }>
                        {sub?.status ?? 'nessuno'}
                      </Badge>
                    </td>
                    <td className="py-2 text-gray-400">{formatDate(tenant.created_at as string)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default AdminDashboard
