import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, Edit, Gift, Plus } from 'lucide-react'
import { supabase } from '../../config/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useLoyalty } from '../../hooks/useLoyalty'
import { Card, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChurnIndicator } from '../../components/clients/ChurnIndicator'
import { VipScoreBadge } from '../../components/clients/VipScoreBadge'
import { PointsDisplay } from '../../components/loyalty/PointsDisplay'
import { RewardCard } from '../../components/loyalty/RewardCard'
import { formatDate } from '../../lib/utils/date'
import type { ClientProfile } from '../../types/clients'

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { tenantId } = useAuth()
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { clientLoyalty, rewards, redeemReward } = useLoyalty(id)

  useEffect(() => {
    if (!id || !tenantId) return
    const load = async () => {
      setIsLoading(true)
      const { data } = await supabase
        .from('clients')
        .select(`
          *,
          client_analytics(*),
          client_loyalty(*),
          client_notes(*, staff_members(profiles(full_name)))
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single()

      setClient(data as ClientProfile)
      setIsLoading(false)
    }
    load()
  }, [id, tenantId])

  if (isLoading) return <PageSpinner />
  if (!client) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Cliente non trovato</p>
    </div>
  )

  const analytics = client.analytics
  const loyalty = client.loyalty ?? (client as unknown as { client_loyalty?: { total_points: number; available_points: number; current_tier: string; current_streak: number; longest_streak: number; tier_points_this_year: number; last_visit_date: string | null } }).client_loyalty

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Back */}
      <Link to="/dashboard/clients">
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" />
          Clienti
        </button>
      </Link>

      {/* Header */}
      <Card>
        <div className="flex items-start gap-4">
          <Avatar name={client.full_name} size="xl" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{client.full_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                      <Phone className="w-3.5 h-3.5" />
                      {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </a>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" leftIcon={<Edit className="w-3.5 h-3.5" />}>
                Modifica
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {analytics && (
                <>
                  <ChurnIndicator
                    status={(analytics as unknown as { churn_status?: string }).churn_status as 'green' | 'yellow' | 'red' ?? 'green'}
                    daysSince={(analytics as unknown as { days_since_last_visit?: number | null }).days_since_last_visit}
                  />
                  <div className="h-4 w-px bg-gray-200" />
                  <VipScoreBadge score={(analytics as unknown as { vip_score?: number }).vip_score ?? 0} />
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Visite totali',
              value: (analytics as unknown as { total_visits?: number }).total_visits ?? 0
            },
            {
              label: 'Ultima visita',
              value: (analytics as unknown as { last_visit_date?: string | null }).last_visit_date
                ? formatDate((analytics as unknown as { last_visit_date: string }).last_visit_date)
                : '—'
            },
            {
              label: 'Spesa totale',
              value: `€${(((analytics as unknown as { total_spent_services?: number }).total_spent_services ?? 0) + ((analytics as unknown as { total_spent_products?: number }).total_spent_products ?? 0)).toFixed(0)}`
            },
          ].map(stat => (
            <Card key={stat.label} padding="sm">
              <p className="text-xl font-bold text-gray-900">{String(stat.value)}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Loyalty */}
      {clientLoyalty && (
        <Card>
          <CardHeader title="🏆 Loyalty" />
          <PointsDisplay loyalty={clientLoyalty} />

          {rewards.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Ricompense disponibili</p>
              {rewards.map(reward => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  availablePoints={clientLoyalty.available_points}
                  onRedeem={id ? () => redeemReward(id, reward.id) : undefined}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Assegna punti
            </Button>
          </div>
        </Card>
      )}

      {/* Private notes */}
      {client.notes && client.notes.length > 0 && (
        <Card>
          <CardHeader title="📝 Note private" />
          <div className="space-y-3">
            {client.notes.map(note => (
              <div key={note.id} className="bg-yellow-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">{note.note_text}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(note.created_at)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

export default ClientDetail
