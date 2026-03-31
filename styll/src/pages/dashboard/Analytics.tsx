import React from 'react'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useChurn } from '../../hooks/useChurn'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChurnIndicator } from '../../components/clients/ChurnIndicator'
import { formatCurrency } from '../../lib/utils/currency'
import { BarChart2, TrendingUp, Users, AlertCircle } from 'lucide-react'

const Analytics: React.FC = () => {
  const { metrics, isLoading } = useAnalytics()
  const { churnClients } = useChurn()

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.todayAppointments}</p>
              <p className="text-xs text-gray-500">Appuntamenti oggi</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(metrics.weekRevenue)}</p>
              <p className="text-xs text-gray-500">Revenue 7 giorni</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.activeClients}</p>
              <p className="text-xs text-gray-500">Clienti totali</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.churnAlerts}</p>
              <p className="text-xs text-gray-500">Clienti a rischio 🔴</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Churn list */}
      {churnClients.length > 0 && (
        <Card>
          <CardHeader title="🔴 Clienti in fuga" subtitle="Questi clienti non vengono da tempo" />
          <div className="space-y-3">
            {churnClients.map(client => {
              const analytics = (client as unknown as {
                client_analytics?: Array<{ churn_status?: string; days_since_last_visit?: number | null; average_days_between_visits?: number | null }>
              }).client_analytics
              const analyticsItem = Array.isArray(analytics) ? analytics[0] : analytics
              return (
                <div key={client.id} className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{client.full_name}</p>
                  <ChurnIndicator
                    status={analyticsItem?.churn_status as 'green' | 'yellow' | 'red' ?? 'red'}
                    daysSince={analyticsItem?.days_since_last_visit}
                    size="sm"
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

export default Analytics
