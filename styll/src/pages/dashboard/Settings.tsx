import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { Card, CardHeader } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../config/supabase'
import { useUIContext } from '../../contexts/UIContext'

const Settings: React.FC = () => {
  const { tenant } = useTenant()
  const { showToast } = useUIContext()
  const [primaryColor, setPrimaryColor] = useState(tenant?.primary_color ?? '#1a1a2e')
  const [secondaryColor, setSecondaryColor] = useState(tenant?.secondary_color ?? '#e94560')
  const [isSaving, setIsSaving] = useState(false)

  const saveColors = async () => {
    if (!tenant) return
    setIsSaving(true)
    try {
      await supabase
        .from('tenants')
        .update({ primary_color: primaryColor, secondary_color: secondaryColor })
        .eq('id', tenant.id)

      document.documentElement.style.setProperty('--color-primary', primaryColor)
      document.documentElement.style.setProperty('--color-secondary', secondaryColor)
      showToast({ type: 'success', title: 'Impostazioni salvate' })
    } catch {
      showToast({ type: 'error', title: 'Errore nel salvataggio' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Impostazioni</h1>

      <Card>
        <CardHeader title="Informazioni salone" />
        <div className="space-y-3">
          <Input label="Nome salone" defaultValue={tenant?.business_name} disabled />
          <Input label="Subdomain" defaultValue={tenant?.slug} disabled />
          <Input label="Timezone" defaultValue={tenant?.timezone} disabled />
        </div>
      </Card>

      <Card>
        <CardHeader title="Branding" subtitle="Personalizza i colori del tuo portale cliente" />
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              aria-label="Colore primario"
            />
            <Input label="Colore primario" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={secondaryColor}
              onChange={e => setSecondaryColor(e.target.value)}
              className="w-12 h-10 rounded cursor-pointer border border-gray-200"
              aria-label="Colore secondario"
            />
            <Input label="Colore secondario" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
          </div>
          <Button onClick={saveColors} isLoading={isSaving}>
            Salva branding
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default Settings
