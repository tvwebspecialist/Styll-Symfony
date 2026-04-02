import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useAppointments } from '../../hooks/useAppointments'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatDate, formatTime } from '../../lib/utils/date'

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const dateStr = currentDate.toISOString().split('T')[0]
  const { appointments, isLoading, updateStatus } = useAppointments(dateStr)

  const prevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  const nextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  const today = () => setCurrentDate(new Date())

  const statusLabel: Record<string, string> = {
    pending: 'In attesa',
    confirmed: 'Confermato',
    completed: 'Completato',
    cancelled: 'Cancellato',
    no_show: 'No show',
  }

  const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'warning',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'danger',
    no_show: 'danger',
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Nuovo appuntamento
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={prevDay}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Giorno precedente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <p className="text-base font-semibold text-gray-900">
            {formatDate(currentDate, 'EEEE d MMMM yyyy')}
          </p>
        </div>

        <button
          onClick={nextDay}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Giorno successivo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <Button size="sm" variant="outline" onClick={today}>Oggi</Button>
      </div>

      {/* Appointments list */}
      {isLoading ? (
        <PageSpinner />
      ) : appointments.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-base font-semibold text-gray-700">
              Nessun appuntamento
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Giornata libera! Aggiungine uno o aspetta le prenotazioni online.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => {
            const client = (appt as unknown as { clients?: { full_name: string; phone: string } }).clients
            const apptServices = (appt as unknown as {
              appointment_services?: Array<{ services?: { name: string } }>
            }).appointment_services

            return (
              <Card key={appt.id} hoverable>
                <div className="flex items-start gap-4">
                  <div className="text-sm font-bold text-gray-500 w-14 text-right pt-0.5">
                    {formatTime(appt.start_time)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {client?.full_name ?? 'Cliente'}
                        </p>
                        {client?.phone && (
                          <p className="text-xs text-gray-500">{client.phone}</p>
                        )}
                        {apptServices && apptServices.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            {apptServices.map(s => s.services?.name).filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <Badge variant={statusVariant[appt.status] ?? 'default'}>
                        {statusLabel[appt.status] ?? appt.status}
                      </Badge>
                    </div>

                    {appt.status === 'confirmed' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => updateStatus(appt.id, 'completed')}
                        >
                          Completa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(appt.id, 'no_show')}
                        >
                          No show
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus(appt.id, 'cancelled')}
                        >
                          Cancella
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Calendar
