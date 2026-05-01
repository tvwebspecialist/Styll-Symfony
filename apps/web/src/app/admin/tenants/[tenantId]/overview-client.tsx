'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JsonEditor } from '@/components/admin/json-editor'
import { ImageUpload } from '@/components/admin/image-upload'
import { updateTenant } from '@/app/admin/actions'

interface TenantData {
  id: string
  business_name: string
  slug: string
  timezone: string
  status: string
  primary_color: string | null
  secondary_color: string | null
  logo_url: string | null
  font_family: string | null
  settings: Record<string, unknown>
}

const FEATURE_FLAGS: Array<{ key: string; label: string; description: string }> = [
  { key: 'online_booking', label: 'Prenotazioni online', description: 'Abilita le prenotazioni dal sito pubblico.' },
  { key: 'sms_notifications', label: 'Notifiche SMS', description: 'Invio di SMS automatici ai clienti.' },
  { key: 'loyalty_program', label: 'Programma fedeltà', description: 'Punti e premi per i clienti ricorrenti.' },
  { key: 'multi_location', label: 'Multi-sede', description: 'Permette la gestione di più sedi.' },
  { key: 'advanced_reports', label: 'Report avanzati', description: 'Analisi e statistiche estese.' },
]

export function OverviewClient({ tenant }: { tenant: TenantData }) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const initialFlags = (tenant.settings?.feature_flags as Record<string, boolean> | undefined) ?? {}

  const [businessName, setBusinessName] = React.useState(tenant.business_name)
  const [slug, setSlug] = React.useState(tenant.slug)
  const [timezone, setTimezone] = React.useState(tenant.timezone || 'Europe/Rome')
  const [primaryColor, setPrimaryColor] = React.useState(tenant.primary_color ?? '')
  const [secondaryColor, setSecondaryColor] = React.useState(tenant.secondary_color ?? '')
  const [logoUrl, setLogoUrl] = React.useState(tenant.logo_url ?? '')
  const [fontFamily, setFontFamily] = React.useState(tenant.font_family ?? '')
  const [flags, setFlags] = React.useState<Record<string, boolean>>(initialFlags)
  const [settings, setSettings] = React.useState<Record<string, unknown>>(tenant.settings ?? {})
  const [settingsValid, setSettingsValid] = React.useState(true)

  function toggleFlag(key: string) {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function save() {
    if (!businessName.trim() || !slug.trim()) {
      toast.error('Nome e slug sono obbligatori.')
      return
    }
    if (!settingsValid) {
      toast.error('Settings JSON non valido.')
      return
    }
    startTransition(async () => {
      const mergedSettings = { ...(settings ?? {}), feature_flags: flags }
      const res = await updateTenant(tenant.id, {
        business_name: businessName.trim(),
        slug: slug.trim(),
        timezone,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        logo_url: logoUrl || null,
        font_family: fontFamily || null,
        settings: mergedSettings,
      })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Tenant aggiornato.')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border bg-white p-5 ">
        <h2 className="mb-4 text-sm font-semibold">Dettagli</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="o-name">Nome attività *</Label>
            <Input
              id="o-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-slug">Slug *</Label>
            <Input id="o-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-tz">Timezone</Label>
            <Input
              id="o-tz"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-pc">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="o-pc"
                type="color"
                value={primaryColor || '#000000'}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="o-sc">Secondary color</Label>
            <div className="flex items-center gap-2">
              <input
                id="o-sc"
                type="color"
                value={secondaryColor || '#ffffff'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                placeholder="#ffffff"
              />
            </div>
          </div>
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label>Logo</Label>
            <ImageUpload
              bucket="tenants"
              pathPrefix={tenant.id}
              value={logoUrl || null}
              onChange={(url) => setLogoUrl(url ?? '')}
              shape="square"
              size={96}
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="o-font">Font family</Label>
            <Input
              id="o-font"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 ">
        <h2 className="text-sm font-semibold">Feature flags</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Le impostazioni vengono salvate in <code className="font-mono">settings.feature_flags</code>.
        </p>
        <div className="mt-3 flex flex-col divide-y">
          {FEATURE_FLAGS.map((f) => {
            const enabled = !!flags[f.key]
            return (
              <label
                key={f.key}
                className="flex cursor-pointer items-center justify-between gap-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFlag(f.key)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    enabled ? 'bg-emerald-500' : 'bg-zinc-300 '
                  }`}
                  aria-pressed={enabled}
                  aria-label={f.label}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 ">
        <h2 className="text-sm font-semibold">Settings (JSON avanzato)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Modifica diretta del campo settings. <code className="font-mono">feature_flags</code> verrà
          sovrascritto al salvataggio.
        </p>
        <div className="mt-3">
          <JsonEditor
            value={settings}
            onChange={(parsed, _raw, valid) => {
              setSettingsValid(valid)
              if (valid && parsed && typeof parsed === 'object') {
                setSettings(parsed as Record<string, unknown>)
              }
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </div>
    </div>
  )
}
