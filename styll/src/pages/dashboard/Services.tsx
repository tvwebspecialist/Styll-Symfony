import React, { useState } from 'react'
import { Plus, Edit, ToggleLeft, ToggleRight, Clock, Euro } from 'lucide-react'
import { useServices } from '../../hooks/useServices'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newServiceSchema, type NewServiceFormData } from '../../lib/utils/validators'
import { formatCurrency } from '../../lib/utils/currency'

const Services: React.FC = () => {
  const { services, isLoading, create, update, toggleActive } = useServices()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<NewServiceFormData>({
      resolver: zodResolver(newServiceSchema),
    })

  const onSubmit = async (data: NewServiceFormData) => {
    const result = await create(data)
    if (!result.error) {
      setIsModalOpen(false)
      reset()
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Servizi</h1>
        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Nuovo servizio
        </Button>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : services.length === 0 ? (
        <EmptyState
          icon="✂️"
          title="Nessun servizio ancora"
          message="Aggiungi i tuoi servizi per iniziare a ricevere prenotazioni"
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              Aggiungi il primo servizio
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <Card key={service.id}>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    {!service.is_active && (
                      <Badge variant="default">Inattivo</Badge>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-sm text-gray-700">
                      <Euro className="w-3.5 h-3.5 text-gray-400" />
                      {formatCurrency(service.price)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration_minutes} min
                    </span>
                    {service.category && (
                      <Badge variant="info" size="sm">{service.category}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(service.id, !service.is_active)}
                    aria-label={service.is_active ? 'Disattiva' : 'Attiva'}
                  >
                    {service.is_active
                      ? <ToggleRight className="w-5 h-5 text-green-500" />
                      : <ToggleLeft className="w-5 h-5 text-gray-400" />
                    }
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset() }}
        title="Nuovo servizio"
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Nome servizio"
            placeholder="Taglio classico"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prezzo (€)"
              type="number"
              step="0.50"
              placeholder="18.00"
              error={errors.price?.message}
              required
              {...register('price', { valueAsNumber: true })}
            />
            <Input
              label="Durata (min)"
              type="number"
              placeholder="30"
              error={errors.duration_minutes?.message}
              required
              {...register('duration_minutes', { valueAsNumber: true })}
            />
          </div>
          <Input
            label="Categoria (opzionale)"
            placeholder="Taglio, Barba, Colore..."
            {...register('category')}
          />
          <Input
            label="Descrizione (opzionale)"
            placeholder="Breve descrizione del servizio"
            {...register('description')}
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => { setIsModalOpen(false); reset() }}
            >
              Annulla
            </Button>
            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Aggiungi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Services
