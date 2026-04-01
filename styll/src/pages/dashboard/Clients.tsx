import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, Filter } from 'lucide-react'
import { useClients } from '../../hooks/useClients'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ChurnIndicator } from '../../components/clients/ChurnIndicator'
import { VipScoreBadge } from '../../components/clients/VipScoreBadge'

const Clients: React.FC = () => {
  const [search, setSearch] = useState('')
  const { clients, isLoading } = useClients(search)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Clienti</h1>
        <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Nuovo cliente
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Cerca per nome..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* List */}
      {isLoading ? (
        <PageSpinner />
      ) : clients.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Nessun cliente trovato"
          message={search ? `Nessun cliente corrisponde a "${search}"` : 'Aggiungi il tuo primo cliente per iniziare'}
        />
      ) : (
        <div className="space-y-2">
          {clients.map(client => {
            const analytics = (client as unknown as {
              client_analytics?: {
                churn_status?: string
                vip_score?: number
                days_since_last_visit?: number | null
              } | Array<{
                churn_status?: string
                vip_score?: number
                days_since_last_visit?: number | null
              }>
            }).client_analytics
            const analyticsItem = Array.isArray(analytics) ? analytics[0] : analytics

            return (
              <Link key={client.id} to={`/dashboard/clients/${client.id}`}>
                <Card hoverable padding="sm" className="hover:border-[var(--color-primary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar name={client.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{client.full_name}</p>
                      <p className="text-xs text-gray-500">{client.phone}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {analyticsItem?.vip_score !== undefined && (
                        <VipScoreBadge score={analyticsItem.vip_score} size="sm" />
                      )}
                      {analyticsItem?.churn_status && (
                        <ChurnIndicator
                          status={analyticsItem.churn_status as 'green' | 'yellow' | 'red'}
                          daysSince={analyticsItem.days_since_last_visit}
                          size="sm"
                          showLabel={false}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-sm text-gray-400 text-center">
        {clients.length} {clients.length === 1 ? 'cliente' : 'clienti'} totali
      </p>
    </div>
  )
}

export default Clients
