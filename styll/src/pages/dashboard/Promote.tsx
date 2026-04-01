import React from 'react'
import { useTenant } from '../../hooks/useTenant'
import { Card } from '../../components/ui/Card'

const Promote: React.FC = () => {
  const { tenant } = useTenant()

  const templates = [
    { emoji: '✂️', title: 'Promozione estate', description: 'Annuncia la tua offerta estiva' },
    { emoji: '🎉', title: 'Evento speciale', description: 'Comunica un evento del tuo salone' },
    { emoji: '⭐', title: 'Chiedi una recensione', description: 'Incentiva le recensioni su Google' },
    { emoji: '🎁', title: 'Offerta fedeltà', description: 'Premia i tuoi clienti VIP' },
  ]

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">📣 Promozione</h1>
      <p className="text-gray-500 text-sm">
        Template social brandizzati automaticamente con i colori e il nome di {tenant?.business_name ?? 'il tuo salone'}.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {templates.map(t => (
          <Card key={t.title} hoverable>
            <div className="text-3xl mb-2">{t.emoji}</div>
            <p className="font-semibold text-gray-900 text-sm">{t.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            <p className="text-xs text-[var(--color-primary)] font-medium mt-2">
              Prossimamente →
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Promote
