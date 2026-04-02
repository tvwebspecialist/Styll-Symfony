import React, { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant'
import { useServices } from '../../hooks/useServices'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../lib/utils/currency'
import { Clock, MapPin, Phone, Calendar } from 'lucide-react'

const Landing: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { tenant, loadTenantBySlug, isLoading: tenantLoading } = useTenant()
  const { services, isLoading: servicesLoading } = useServices()

  useEffect(() => {
    if (tenantSlug) {
      loadTenantBySlug(tenantSlug)
    }
  }, [tenantSlug])

  if (tenantLoading) return <PageSpinner />
  if (!tenant) return (
    <div className="text-center p-8">
      <p className="text-gray-500">Salone non trovato</p>
    </div>
  )

  return (
    <div className="pb-4">
      {/* Hero */}
      <div
        className="h-48 flex flex-col items-center justify-center text-white px-4 text-center"
        style={{ background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)` }}
      >
        {tenant.logo_url ? (
          <img src={tenant.logo_url} alt={tenant.business_name} className="h-16 mb-3 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl font-bold">
              {tenant.business_name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-bold">{tenant.business_name}</h1>
      </div>

      {/* Book CTA */}
      <div className="px-4 -mt-6">
        <Link to={`/${tenantSlug}/booking`}>
          <Button
            fullWidth
            size="lg"
            className="shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            Prenota ora
          </Button>
        </Link>
      </div>

      {/* Services */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">I nostri servizi</h2>
        {servicesLoading ? (
          <PageSpinner />
        ) : (
          <div className="space-y-2">
            {services.filter(s => s.is_active).map(service => (
              <div
                key={service.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{service.duration_minutes} min</span>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(service.price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Landing
