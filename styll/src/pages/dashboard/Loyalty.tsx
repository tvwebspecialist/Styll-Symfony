import React from 'react'
import { useLoyalty } from '../../hooks/useLoyalty'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatPoints } from '../../lib/utils/loyalty'
import { formatCurrency } from '../../lib/utils/currency'

const Loyalty: React.FC = () => {
  const { config, rewards, isLoading } = useLoyalty()

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">🏆 Loyalty</h1>

      {/* Current config */}
      <Card>
        <CardHeader
          title="Configurazione attiva"
          subtitle={config ? `Template: ${config.template}` : 'Nessuna config'}
        />
        {config ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatPoints(config.points_per_visit)}</p>
                <p className="text-xs text-gray-500">Punti per visita</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{config.streak_threshold_days}</p>
                <p className="text-xs text-gray-500">Giorni soglia streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-700">
                {config.is_active ? 'Loyalty attiva' : 'Loyalty non attiva'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Nessuna configurazione loyalty. Configura il sistema dal pannello.
          </p>
        )}
      </Card>

      {/* Rewards */}
      <Card>
        <CardHeader
          title="Ricompense"
          subtitle={`${rewards.length}/6 ricompense configurate`}
        />
        {rewards.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nessuna ricompensa configurata. Aggiungine fino a 6.
          </p>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward, i) => (
              <div key={reward.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{reward.name}</p>
                  <p className="text-xs text-gray-500">{reward.reward_type}</p>
                </div>
                <span className="text-sm font-bold text-gray-700">
                  {formatPoints(reward.points_cost)} pt
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tier thresholds */}
      <Card>
        <CardHeader title="Livelli (Tier)" subtitle="Soglie di punti per l'anno corrente" />
        <div className="space-y-2">
          {[
            { tier: '🥉 Bronzo', min: 0 },
            { tier: '🥈 Argento', min: 500 },
            { tier: '🥇 Oro', min: 2000 },
            { tier: '💎 Platino', min: 5000 },
          ].map(t => (
            <div key={t.tier} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t.tier}</span>
              <span className="text-sm font-medium text-gray-500">
                da {formatPoints(t.min)} pt/anno
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Loyalty
