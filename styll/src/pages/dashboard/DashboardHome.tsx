import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Users, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAnalytics } from '../../hooks/useAnalytics'
import { useChurn } from '../../hooks/useChurn'
import { useAppointments } from '../../hooks/useAppointments'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChurnIndicator } from '../../components/clients/ChurnIndicator'
import { formatCurrency } from '../../lib/utils/currency'
import { formatTime } from '../../lib/utils/date'

const DashboardHome: React.FC = () => {
  const { profile, role } = useAuth()
  const { metrics, isLoading: analyticsLoading } = useAnalytics()
  const { churnClients } = useChurn()
  const { appointments, isLoading: appointmentsLoading } = useAppointments(
    new Date().toISOString().split('T')[0]
  )

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buongiorno'
    if (hour < 18) return 'Buon pomeriggio'
    return 'Buonasera'
  }

  if (analyticsLoading && appointmentsLoading) return <PageSpinner />

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'benvenuto'} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.todayAppointments}</p>
              <p className="text-xs text-gray-500">Appuntamenti oggi</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.completedToday}</p>
              <p className="text-xs text-gray-500">Completati oggi</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.weekRevenue)}</p>
              <p className="text-xs text-gray-500">Revenue questa settimana</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{metrics.churnAlerts}</p>
              <p className="text-xs text-gray-500">Alert churn 🔴</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Appuntamenti di oggi</h2>
            <Link to="/dashboard/calendar">
              <Button size="sm" variant="ghost">Calendario →</Button>
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">☕</p>
              <p className="text-sm text-gray-500">
                Nessun appuntamento oggi. Tempo per un caffè!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {appointments.slice(0, 5).map(appt => (
                <div
                  key={appt.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="text-sm font-medium text-gray-500 w-12 text-right flex-shrink-0">
                    {formatTime(appt.start_time)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(appt as unknown as { clients?: { full_name: string } }).clients?.full_name ?? 'Cliente'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      appt.status === 'completed' ? 'success' :
                      appt.status === 'cancelled' ? 'danger' :
                      appt.status === 'confirmed' ? 'info' : 'default'
                    }
                  >
                    {appt.status === 'completed' ? '✓' :
                     appt.status === 'confirmed' ? 'Conf.' :
                     appt.status === 'pending' ? 'Attesa' :
                     appt.status}
                  </Badge>
                </div>
              ))}
              {appointments.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-2">
                  +{appointments.length - 5} altri appuntamenti
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Churn alerts */}
        {(role === 'owner' || role === 'manager') && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">⚠️ Clienti a rischio</h2>
              <Link to="/dashboard/clients">
                <Button size="sm" variant="ghost">Tutti i clienti →</Button>
              </Link>
            </div>

            {churnClients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm text-gray-500">
                  Nessun cliente a rischio. Ottimo lavoro!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {churnClients.slice(0, 5).map(client => {
                  const analytics = (client as unknown as {
                    client_analytics?: Array<{
                      churn_status: string
                      days_since_last_visit: number | null
                    }>
                  }).client_analytics
                  const analyticsItem = Array.isArray(analytics) ? analytics[0] : analytics

                  return (
                    <Link
                      key={client.id}
                      to={`/dashboard/clients/${client.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-900">{client.full_name}</span>
                      <ChurnIndicator
                        status={(analyticsItem?.churn_status as 'green' | 'yellow' | 'red') ?? 'green'}
                        daysSince={analyticsItem?.days_since_last_visit}
                        size="sm"
                      />
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

export default DashboardHome
