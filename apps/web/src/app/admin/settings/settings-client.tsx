'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Mail, Flag, Wrench, Palette, Shield } from 'lucide-react'
import { toast } from 'sonner'

import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { SlideOver } from '@/components/admin/slide-over'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  setAdminSetting,
  updateEmailTemplate,
  type EmailTemplate,
} from '@/app/admin/actions'

type Section = 'flags' | 'maintenance' | 'email' | 'branding' | 'security'

const SECTIONS: Array<{ id: Section; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'flags', label: 'Feature Flags', icon: Flag },
  { id: 'maintenance', label: 'Manutenzione', icon: Wrench },
  { id: 'email', label: 'Email Templates', icon: Mail },
  { id: 'branding', label: 'Branding di default', icon: Palette },
  { id: 'security', label: 'Sicurezza', icon: Shield },
]

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  id?: string
  label?: string
}

function Toggle({ checked, onChange, id, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked
          ? 'bg-emerald-500'
          : 'bg-zinc-300 '
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export function SettingsClient({
  featureFlags: initialFlags,
  maintenance: initialMaintenance,
  defaultBranding: initialBranding,
  security: initialSecurity,
  templates: initialTemplates,
}: {
  featureFlags: Record<string, boolean>
  maintenance: { enabled: boolean; message: string }
  defaultBranding: { primary_color: string; secondary_color: string; logo_url: string }
  security: { require_2fa_superadmin: boolean; session_timeout_minutes: number }
  templates: EmailTemplate[]
}) {
  const router = useRouter()
  const [section, setSection] = React.useState<Section>('flags')
  const [pending, startTransition] = React.useTransition()

  // Feature flags
  const [flags, setFlags] = React.useState<Record<string, boolean>>(initialFlags)
  const [newFlagName, setNewFlagName] = React.useState('')

  function addFlag() {
    const k = newFlagName.trim()
    if (!k) return
    if (flags[k] !== undefined) {
      toast.error('Flag già esistente.')
      return
    }
    setFlags({ ...flags, [k]: false })
    setNewFlagName('')
  }

  function saveFlags() {
    startTransition(async () => {
      const res = await setAdminSetting('feature_flags', flags as Record<string, unknown>)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Feature flags salvate.')
      router.refresh()
    })
  }

  // Maintenance
  const [maintenance, setMaintenance] = React.useState(initialMaintenance)
  function saveMaintenance() {
    startTransition(async () => {
      const res = await setAdminSetting('maintenance', maintenance as Record<string, unknown>)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Manutenzione salvata.')
      router.refresh()
    })
  }

  // Branding
  const [branding, setBranding] = React.useState(initialBranding)
  function saveBranding() {
    startTransition(async () => {
      const res = await setAdminSetting('default_branding', branding as Record<string, unknown>)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Branding salvato.')
      router.refresh()
    })
  }

  // Security
  const [security, setSecurity] = React.useState(initialSecurity)
  function saveSecurity() {
    startTransition(async () => {
      const res = await setAdminSetting('security', security as Record<string, unknown>)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Sicurezza salvata.')
      router.refresh()
    })
  }

  // Email templates
  const [templates, setTemplates] = React.useState<EmailTemplate[]>(initialTemplates)
  const [editingTpl, setEditingTpl] = React.useState<EmailTemplate | null>(null)
  const [tplForm, setTplForm] = React.useState<{
    subject: string
    body: string
    is_active: boolean
  }>({ subject: '', body: '', is_active: true })

  function openTemplate(t: EmailTemplate) {
    setEditingTpl(t)
    setTplForm({ subject: t.subject, body: t.body, is_active: t.is_active })
  }

  function saveTemplate() {
    if (!editingTpl) return
    startTransition(async () => {
      const res = await updateEmailTemplate(editingTpl.id, tplForm)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Template salvato.')
      setTemplates((arr) =>
        arr.map((t) => (t.id === editingTpl.id ? { ...t, ...tplForm } : t))
      )
      setEditingTpl(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Impostazioni' }]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Impostazioni piattaforma</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestisci feature flags, manutenzione, email transazionali, branding e sicurezza.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-1 overflow-x-auto rounded-xl border bg-white p-2 shadow-sm   lg:flex-col">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            const active = section === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-zinc-900 text-white '
                    : 'text-zinc-700 hover:bg-zinc-100  '
                )}
              >
                <Icon className="h-4 w-4" />
                {s.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0">
          {section === 'flags' ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm  ">
              <h2 className="mb-4 text-lg font-semibold">Feature Flags</h2>
              <div className="space-y-4">
                {Object.keys(flags).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuna flag configurata.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {Object.entries(flags).map(([k, v]) => (
                      <li key={k} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-mono text-sm">{k}</p>
                          <p className="text-xs text-muted-foreground">
                            {v ? 'Attivata' : 'Disattivata'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Toggle
                            checked={v}
                            onChange={(nv) => setFlags({ ...flags, [k]: nv })}
                            label={k}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...flags }
                              delete next[k]
                              setFlags(next)
                            }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Rimuovi ${k}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-end gap-2 border-t pt-4 ">
                  <div className="flex-1">
                    <Label htmlFor="new-flag">Aggiungi flag</Label>
                    <Input
                      id="new-flag"
                      value={newFlagName}
                      onChange={(e) => setNewFlagName(e.target.value)}
                      placeholder="nome_flag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addFlag()
                        }
                      }}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={addFlag}>
                    <Plus /> Aggiungi
                  </Button>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={saveFlags} disabled={pending}>
                    {pending ? 'Salvataggio…' : 'Salva'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'maintenance' ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm  ">
              <h2 className="mb-4 text-lg font-semibold">Manutenzione</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Modalità manutenzione</p>
                    <p className="text-xs text-muted-foreground">
                      Quando attiva, gli utenti non superadmin vedranno un messaggio.
                    </p>
                  </div>
                  <Toggle
                    checked={maintenance.enabled}
                    onChange={(v) => setMaintenance({ ...maintenance, enabled: v })}
                    label="Modalità manutenzione"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="m-msg">Messaggio</Label>
                  <textarea
                    id="m-msg"
                    rows={4}
                    value={maintenance.message}
                    onChange={(e) =>
                      setMaintenance({ ...maintenance, message: e.target.value })
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
                    placeholder="Stiamo aggiornando la piattaforma. Torna tra poco."
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveMaintenance} disabled={pending}>
                    {pending ? 'Salvataggio…' : 'Salva'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'email' ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm  ">
              <h2 className="mb-4 text-lg font-semibold">Email Templates</h2>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun template trovato.</p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {templates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => openTemplate(t)}
                        className="flex w-full items-center justify-between py-3 text-left hover:bg-zinc-50 /50"
                      >
                        <div className="px-1">
                          <p className="font-medium">{t.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{t.slug}</p>
                        </div>
                        <span
                          className={cn(
                            'mr-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            t.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-600  '
                          )}
                        >
                          {t.is_active ? 'Attivo' : 'Inattivo'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {section === 'branding' ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm  ">
              <h2 className="mb-4 text-lg font-semibold">Branding di default</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="b-primary">Colore primario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="b-primary"
                        type="color"
                        value={branding.primary_color || '#000000'}
                        onChange={(e) =>
                          setBranding({ ...branding, primary_color: e.target.value })
                        }
                        className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
                      />
                      <Input
                        value={branding.primary_color}
                        onChange={(e) =>
                          setBranding({ ...branding, primary_color: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="b-secondary">Colore secondario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="b-secondary"
                        type="color"
                        value={branding.secondary_color || '#ffffff'}
                        onChange={(e) =>
                          setBranding({ ...branding, secondary_color: e.target.value })
                        }
                        className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
                      />
                      <Input
                        value={branding.secondary_color}
                        onChange={(e) =>
                          setBranding({ ...branding, secondary_color: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="b-logo">Logo URL</Label>
                  <Input
                    id="b-logo"
                    value={branding.logo_url}
                    onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveBranding} disabled={pending}>
                    {pending ? 'Salvataggio…' : 'Salva'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {section === 'security' ? (
            <div className="rounded-xl border bg-white p-6 shadow-sm  ">
              <h2 className="mb-4 text-lg font-semibold">Sicurezza</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">2FA obbligatoria per superadmin</p>
                    <p className="text-xs text-muted-foreground">
                      Richiede autenticazione a due fattori per gli account superadmin.
                    </p>
                  </div>
                  <Toggle
                    checked={security.require_2fa_superadmin}
                    onChange={(v) =>
                      setSecurity({ ...security, require_2fa_superadmin: v })
                    }
                    label="Richiedi 2FA superadmin"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="s-timeout">Timeout sessione (minuti)</Label>
                  <Input
                    id="s-timeout"
                    type="number"
                    min={5}
                    value={String(security.session_timeout_minutes)}
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        session_timeout_minutes: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveSecurity} disabled={pending}>
                    {pending ? 'Salvataggio…' : 'Salva'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <SlideOver
        open={!!editingTpl}
        onOpenChange={(o) => !o && setEditingTpl(null)}
        title={editingTpl ? `Modifica: ${editingTpl.name}` : ''}
        description={editingTpl?.slug}
        width="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingTpl(null)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={saveTemplate} disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </>
        }
      >
        {editingTpl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border p-3 ">
              <div>
                <p className="text-sm font-medium">Template attivo</p>
                <p className="text-xs text-muted-foreground">
                  Solo i template attivi vengono inviati.
                </p>
              </div>
              <Toggle
                checked={tplForm.is_active}
                onChange={(v) => setTplForm({ ...tplForm, is_active: v })}
                label="Template attivo"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-subject">Oggetto</Label>
              <Input
                id="t-subject"
                value={tplForm.subject}
                onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="t-body">Corpo</Label>
              <textarea
                id="t-body"
                rows={12}
                value={tplForm.body}
                onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {editingTpl.variables.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Variabili disponibili
                </p>
                <div className="flex flex-wrap gap-1">
                  {editingTpl.variables.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-700  "
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </SlideOver>
    </div>
  )
}
