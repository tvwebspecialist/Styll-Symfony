import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useTenant } from '../../hooks/useTenant'
import { useServices } from '../../hooks/useServices'
import { useStaff } from '../../hooks/useStaff'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../lib/utils/currency'
import type { Service } from '../../types/services'

type BookingStep = 'service' | 'staff' | 'datetime' | 'confirm'

const Booking: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { tenant, loadTenantBySlug } = useTenant()
  const { services } = useServices()
  const { staff } = useStaff()
  const navigate = useNavigate()

  const [step, setStep] = useState<BookingStep>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  useEffect(() => {
    if (tenantSlug) loadTenantBySlug(tenantSlug)
  }, [tenantSlug])

  const handleBack = () => {
    if (step === 'staff') setStep('service')
    else if (step === 'datetime') setStep('staff')
    else if (step === 'confirm') setStep('datetime')
    else navigate(`/${tenantSlug}`)
  }

  return (
    <div className="min-h-full">
      {/* Step header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Prenota</h1>
            <p className="text-xs text-gray-500">
              {step === 'service' ? 'Scegli un servizio' :
               step === 'staff' ? 'Scegli il barbiere' :
               step === 'datetime' ? 'Scegli data e ora' :
               'Conferma prenotazione'}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mt-3">
          {(['service', 'staff', 'datetime', 'confirm'] as BookingStep[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s === step ? 'bg-[var(--color-primary)]' :
                ['service', 'staff', 'datetime', 'confirm'].indexOf(s) < ['service', 'staff', 'datetime', 'confirm'].indexOf(step)
                  ? 'bg-[var(--color-primary)]/50' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Step 1: Service selection */}
        {step === 'service' && (
          <>
            <p className="text-sm font-medium text-gray-700">Cosa vuoi fare?</p>
            {services.filter(s => s.is_active).map(service => (
              <Card
                key={service.id}
                hoverable
                onClick={() => {
                  setSelectedService(service)
                  setStep('staff')
                }}
                className={selectedService?.id === service.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.duration_minutes} min</p>
                  </div>
                  <span className="font-bold text-gray-900">{formatCurrency(service.price)}</span>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Step 2: Staff selection */}
        {step === 'staff' && (
          <>
            <p className="text-sm font-medium text-gray-700">Con chi?</p>
            <Card
              hoverable
              onClick={() => { setSelectedStaffId(null); setStep('datetime') }}
              className={!selectedStaffId ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}
            >
              <p className="font-semibold text-gray-900">Il primo disponibile</p>
              <p className="text-xs text-gray-500">Qualsiasi barbiere disponibile</p>
            </Card>
            {staff.filter(s => s.is_active).map(member => {
              const profile = (member as unknown as { profiles?: { full_name: string } }).profiles
              return (
                <Card
                  key={member.id}
                  hoverable
                  onClick={() => { setSelectedStaffId(member.id); setStep('datetime') }}
                  className={selectedStaffId === member.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}
                >
                  <p className="font-semibold text-gray-900">
                    {profile?.full_name ?? 'Barbiere'}
                  </p>
                </Card>
              )
            })}
          </>
        )}

        {/* Step 3: Date & time */}
        {step === 'datetime' && (
          <>
            <p className="text-sm font-medium text-gray-700">Quando?</p>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Orari disponibili</p>
                <div className="grid grid-cols-3 gap-2">
                  {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(time => (
                    <button
                      key={time}
                      onClick={() => { setSelectedTime(time); setStep('confirm') }}
                      className={`
                        py-2 rounded-lg text-sm font-medium border transition-colors
                        ${selectedTime === time
                          ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[var(--color-primary)]'
                        }
                      `}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && selectedService && (
          <>
            <p className="text-sm font-medium text-gray-700">Riepilogo prenotazione</p>
            <Card className="bg-gray-50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Servizio</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data</span>
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ora</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">Totale</span>
                  <span className="font-bold">{formatCurrency(selectedService.price)}</span>
                </div>
              </div>
            </Card>

            <Button fullWidth size="lg">
              Conferma prenotazione
            </Button>
            <p className="text-xs text-gray-400 text-center">
              Riceverai una conferma via SMS
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Booking
