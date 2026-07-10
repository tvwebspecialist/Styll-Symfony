'use client'

import Link from 'next/link'
import { ExternalLink, FileText, Shield } from 'lucide-react'
import { updateNotificationPreferences, updateMarketingConsent, updateChurnProfilingConsent } from '@/lib/actions/pwa-client-actions'
import {
  CHURN_PROFILING_DESCRIPTION,
  CHURN_PROFILING_LABEL,
  MARKETING_PREFERENCES_LABEL,
  MARKETING_PREFERENCES_SUBLABEL,
} from '@/lib/consent-copy'
import { usePushSubscription } from '@/lib/hooks/use-push-subscription'
import { useOptimistic, useTransition } from 'react'

interface Props {
  tenantId: string
  initialNotifPrefs: Record<string, boolean>
  initialMarketingConsent: boolean
  initialChurnObjected: boolean
  primaryColor: string
  privacyPath: string
  termsPath: string
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
        checked ? 'styll-bg-brand-primary' : 'bg-neutral-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 px-1 mb-2">{title}</p>
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-neutral-100 divide-y divide-neutral-100">
        {children}
      </div>
    </div>
  )
}

function PrefRow({ label, sublabel, checked, onChange, disabled }: { label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {sublabel && <p className="text-xs text-neutral-400 mt-0.5">{sublabel}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

function LinkRow({ label, sublabel, href }: { label: string; sublabel?: string; href: string }) {
  const isExternal = href.startsWith('http')
  return (
    <Link
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="flex items-center justify-between px-4 py-4 active:bg-neutral-50 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        {sublabel && <p className="text-xs text-neutral-400 mt-0.5">{sublabel}</p>}
      </div>
      {isExternal ? <ExternalLink className="size-4 text-neutral-300" /> : <FileText className="size-4 text-neutral-300" />}
    </Link>
  )
}

export function PreferenzeClient({
  tenantId,
  initialNotifPrefs,
  initialMarketingConsent,
  initialChurnObjected,
  primaryColor: _primaryColor,
  privacyPath,
  termsPath,
}: Props) {
  const { status, subscribe, unsubscribe } = usePushSubscription(tenantId)
  const [, startTransition] = useTransition()

  const [prefs, setPrefs] = useOptimistic(initialNotifPrefs)
  const [marketing, setMarketing] = useOptimistic(initialMarketingConsent)
  const [churnObjected, setChurnObjected] = useOptimistic(initialChurnObjected)

  function updatePref(key: string, value: boolean) {
    startTransition(async () => {
      setPrefs({ ...prefs, [key]: value })
      await updateNotificationPreferences({ [key]: value })
    })
  }

  function updateMarketing(value: boolean) {
    startTransition(async () => {
      setMarketing(value)
      await updateMarketingConsent(tenantId, value)
    })
  }

  function updateChurn(objected: boolean) {
    startTransition(async () => {
      setChurnObjected(objected)
      await updateChurnProfilingConsent(tenantId, objected)
    })
  }

  const isPushSubscribed = status === 'subscribed'
  const isPushLoading = status === 'loading'

  return (
    <div className="pt-4 pb-10">
      {/* Comunicazioni */}
      <SectionCard title="Comunicazioni">
        <PrefRow
          label="Promemoria appuntamenti"
          sublabel="Avvisi prima dell'orario prenotato"
          checked={prefs['reminders'] ?? true}
          onChange={(v) => updatePref('reminders', v)}
        />
        <PrefRow
          label={MARKETING_PREFERENCES_LABEL}
          sublabel={MARKETING_PREFERENCES_SUBLABEL}
          checked={marketing}
          onChange={updateMarketing}
        />
        <PrefRow
          label="Novità e aggiornamenti"
          sublabel="Nuovi servizi e annunci"
          checked={prefs['news'] ?? false}
          onChange={(v) => updatePref('news', v)}
        />
      </SectionCard>

      {/* App */}
      <SectionCard title="App">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm font-medium text-neutral-800">Notifiche push</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {status === 'denied' ? 'Bloccate — abilita nelle impostazioni' : 'Notifiche in tempo reale'}
            </p>
          </div>
          {status === 'unsupported' ? (
            <span className="text-xs text-neutral-400">Non supportate</span>
          ) : (
            <Toggle
              checked={isPushSubscribed}
              onChange={(v) => v ? subscribe() : unsubscribe()}
              disabled={isPushLoading || status === 'denied'}
            />
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-4 opacity-50">
          <div>
            <p className="text-sm font-medium text-neutral-800">Lingua</p>
            <p className="text-xs text-neutral-400 mt-0.5">Italiano</p>
          </div>
          <span className="text-xs text-neutral-400">🇮🇹</span>
        </div>
      </SectionCard>

      {/* Analisi delle visite */}
      <SectionCard title="Analisi delle visite">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex-1 pr-4">
            <p className="text-sm font-medium text-neutral-800">{CHURN_PROFILING_LABEL}</p>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              {CHURN_PROFILING_DESCRIPTION}
            </p>
          </div>
          <Toggle
            checked={!churnObjected}
            onChange={(v) => updateChurn(!v)}
          />
        </div>
      </SectionCard>

      {/* Privacy */}
      <SectionCard title="Privacy">
        <LinkRow
          label="Gestisci i tuoi dati"
          sublabel="Richiedi export o cancellazione"
          href="mailto:privacy@styll.it?subject=Richiesta%20dati%20personali"
        />
        <LinkRow
          label="Termini e condizioni"
          href={termsPath}
        />
        <LinkRow
          label="Privacy policy"
          href={privacyPath}
        />
      </SectionCard>

      <div className="mt-4 text-center">
        <p className="text-xs text-neutral-300 flex items-center justify-center gap-1">
          <Shield className="size-3" />
          Versione app 1.0
        </p>
      </div>
    </div>
  )
}
