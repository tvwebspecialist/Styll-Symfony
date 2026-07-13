'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Download,
  ExternalLink,
  FilePenLine,
  FileSearch,
  MegaphoneOff,
  Shield,
  Trash2,
} from 'lucide-react'
import type {
  ClientErasureRetentionRule,
  ClientRightsMatrixRow,
} from '@/lib/client-privacy-rights'
import { createClient as createCookieClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { clearSensitivePwaCaches } from '@/lib/pwa/clear-sensitive-caches'

interface HistoryEntry {
  action: string
  created_at: string
  id: string
  status: string
}

interface RetainedDataEntry extends ClientErasureRetentionRule {
  count: number
}

interface Props {
  basePath: string
  confirmationValue: string
  dataRightsRequestPath: string
  erasurePath: string
  exportPath: string
  history: HistoryEntry[]
  manualReviewNotesCount: number
  preferencesPath: string
  privacyPath: string
  profileEditPath: string
  requestRightsMatrix: ClientRightsMatrixRow[]
  retainedData: RetainedDataEntry[]
  tenantId: string
  tenantName: string
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-neutral-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <div className="mb-4">
        <h2 className="text-[18px] font-black tracking-tight text-neutral-950">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-neutral-500">{subtitle}</p> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ActionButton({
  icon,
  label,
  sublabel,
  onClick,
  href,
  pending,
  danger,
}: {
  icon: React.ReactNode
  label: string
  sublabel: string
  onClick?: () => void
  href?: string
  pending?: boolean
  danger?: boolean
}) {
  const baseClassName =
    'flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors active:scale-[0.99]'
  const className = danger
    ? `${baseClassName} border-red-200 bg-red-50 text-red-950`
    : `${baseClassName} border-neutral-100 bg-neutral-50 text-neutral-950`

  const content = (
    <>
      <div
        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl ${
          danger ? 'bg-white text-red-500' : 'bg-white text-neutral-700'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{pending ? 'Operazione in corso…' : label}</p>
        <p className={`mt-1 text-xs leading-5 ${danger ? 'text-red-700/80' : 'text-neutral-500'}`}>
          {sublabel}
        </p>
      </div>
      {href ? <ExternalLink className="mt-1 size-4 shrink-0 text-neutral-300" /> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className={className}>
      {content}
    </button>
  )
}

function actionLabel(action: string): string {
  switch (action) {
    case 'access_export':
      return 'Export dati'
    case 'access_review':
      return 'Richiesta accesso esteso'
    case 'rectification':
      return 'Rettifica profilo'
    case 'erasure':
      return 'Cancellazione profilo cliente'
    case 'restriction':
      return 'Richiesta limitazione'
    default:
      return action
  }
}

function statusStyle(status: string): { className: string; label: string } {
  switch (status) {
    case 'completed':
      return {
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        label: 'Completata',
      }
    case 'submitted':
      return {
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        label: 'Inviata',
      }
    case 'rejected':
      return {
        className: 'bg-red-50 text-red-700 border border-red-200',
        label: 'Respinta',
      }
    default:
      return {
        className: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
        label: status,
      }
  }
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function parseDownloadFilename(headerValue: string | null): string | null {
  if (!headerValue) return null
  const match = headerValue.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? null
}

function Toast({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  return (
    <div
      className={`sticky top-4 z-20 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
        kind === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      }`}
    >
      {message}
    </div>
  )
}

export function DataRightsClient({
  basePath,
  confirmationValue,
  dataRightsRequestPath,
  erasurePath,
  exportPath,
  history,
  manualReviewNotesCount,
  preferencesPath,
  privacyPath,
  profileEditPath,
  requestRightsMatrix,
  retainedData,
  tenantId,
  tenantName,
}: Props) {
  const router = useRouter()
  const [toast, setToast] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const [confirmationInput, setConfirmationInput] = useState('')
  const [isErasureOpen, setIsErasureOpen] = useState(false)
  const [isExporting, startExport] = useTransition()
  const [isRequesting, startRequest] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  const confirmationHint = useMemo(() => {
    if (confirmationValue === 'ELIMINA') {
      return 'Digita "ELIMINA" per confermare'
    }
    if (confirmationValue.includes('@')) {
      return 'Digita la tua email per confermare'
    }
    return 'Digita il tuo numero di telefono per confermare'
  }, [confirmationValue])

  const isConfirmationValid = useMemo(() => {
    const value = confirmationInput.trim()
    if (confirmationValue === 'ELIMINA') {
      return value.toUpperCase() === 'ELIMINA'
    }
    if (confirmationValue.includes('@')) {
      return value.toLowerCase() === confirmationValue
    }
    return value === confirmationValue
  }, [confirmationInput, confirmationValue])

  function showToast(message: string, kind: 'error' | 'success') {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 3200)
  }

  async function handleExport() {
    startExport(async () => {
      try {
        const response = await fetch(exportPath, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        })

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: 'Impossibile esportare i dati.' }))
          showToast(body.error ?? 'Impossibile esportare i dati.', 'error')
          return
        }

        const blob = await response.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const fileName =
          parseDownloadFilename(response.headers.get('content-disposition'))
          ?? `styll-${tenantId}-customer-data.json`

        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(downloadUrl)
        showToast('Export generato correttamente.', 'success')
        router.refresh()
      } catch {
        showToast('Impossibile esportare i dati.', 'error')
      }
    })
  }

  async function submitManualRequest(action: 'access_review' | 'restriction') {
    startRequest(async () => {
      try {
        const response = await fetch(dataRightsRequestPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            action,
            tenantId,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          showToast(payload.error ?? 'Richiesta non inviata.', 'error')
          return
        }

        if (payload.duplicate) {
          showToast('Esiste già una richiesta aperta nelle ultime 24 ore.', 'success')
        } else {
          showToast('Richiesta registrata correttamente.', 'success')
        }
        router.refresh()
      } catch {
        showToast('Richiesta non inviata.', 'error')
      }
    })
  }

  async function handleDelete() {
    startDelete(async () => {
      try {
        const response = await fetch(erasurePath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            confirmation: confirmationInput,
            tenantId,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          showToast(payload.error ?? 'Cancellazione non riuscita.', 'error')
          return
        }

        const pwa = createPwaClient()
        const cookie = createCookieClient()
        await Promise.allSettled([
          pwa.auth.signOut({ scope: 'local' }),
          cookie.auth.signOut({ scope: 'local' }),
        ])
        await clearSensitivePwaCaches()
        router.push(basePath)
        router.refresh()
      } catch {
        showToast('Cancellazione non riuscita.', 'error')
      }
    })
  }

  return (
    <div className="space-y-4 pb-10">
      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}

      <section className="rounded-[28px] bg-neutral-950 p-5 text-white shadow-xl shadow-black/15">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
          Diritti GDPR cliente finale
        </p>
        <h1 className="mt-2 text-[26px] font-black tracking-tight">
          Gestisci i tuoi dati per {tenantName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Questo centro self-service vale solo per il tenant corrente. Se usi Styll con altri saloni,
          i loro dati non vengono toccati da export, richieste o cancellazione avviati qui.
        </p>
      </section>

      <SectionCard
        title="Azioni disponibili ora"
        subtitle="Accesso, portabilità, rettifica e cancellazione passano da qui. Le preferenze marketing e privacy opzionali restano gestibili nelle preferenze."
      >
        <ActionButton
          icon={<Download className="size-5" />}
          label="Esporta i tuoi dati (JSON)"
          sublabel="Download tenant-scoped per accesso e portabilità. Non include dati di altri tenant o altri clienti."
          onClick={() => void handleExport()}
          pending={isExporting}
        />
        <ActionButton
          icon={<FilePenLine className="size-5" />}
          label="Correggi i tuoi dati"
          sublabel="Aggiorna nome, telefono, data di nascita e preferenze di contatto direttamente in app."
          href={profileEditPath}
        />
        <ActionButton
          icon={<MegaphoneOff className="size-5" />}
          label="Gestisci marketing, churn, analytics e push"
          sublabel="Revoca marketing, opposizione alla profilazione churn, analytics opzionali e notifiche push."
          href={preferencesPath}
        />
        <ActionButton
          icon={<FileSearch className="size-5" />}
          label="Richiedi accesso esteso"
          sublabel={
            manualReviewNotesCount > 0
              ? `Abbiamo censito ${manualReviewNotesCount} note interne staff non esportabili in self-service. Puoi aprire una richiesta auditata al Titolare.`
              : 'Usa questa richiesta se vuoi una revisione manuale dei dati non portabili o conservati per accountability.'
          }
          onClick={() => void submitManualRequest('access_review')}
          pending={isRequesting}
        />
        <ActionButton
          icon={<Shield className="size-5" />}
          label="Richiedi limitazione del trattamento"
          sublabel="Per i trattamenti non già bloccabili in self-service viene aperta una richiesta tracciata e notificata al salone."
          onClick={() => void submitManualRequest('restriction')}
          pending={isRequesting}
        />
      </SectionCard>

      <SectionCard
        title="Matrice diritti"
        subtitle="Stato reale del workflow B2C implementato oggi su questa superficie."
      >
        <div className="space-y-3">
          {requestRightsMatrix.map((entry) => (
            <div key={entry.right} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-neutral-950">{entry.right}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    entry.status === 'supportato'
                      ? 'bg-emerald-50 text-emerald-700'
                      : entry.status === 'parzialmente supportato'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {entry.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{entry.implementation}</p>
              <p className="mt-2 text-xs leading-5 text-neutral-500">{entry.reason}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Cosa resta se elimini il profilo cliente"
        subtitle="La cancellazione rimuove i dati cancellabili del tenant corrente, ma alcuni record restano minimizzati o conservati per obblighi legali e accountability."
      >
        <div className="space-y-3">
          {retainedData.map((entry) => (
            <div key={entry.key} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-neutral-950">{entry.label}</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                  {entry.count}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-neutral-500">{entry.reason}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Cronologia richieste"
        subtitle="Le azioni e le richieste manuali già registrate su questo tenant."
      >
        {(history ?? []).length > 0 ? (
          <div className="space-y-2">
            {history.map((entry) => {
              const status = statusStyle(entry.status)
              return (
                <div key={entry.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-neutral-950">{actionLabel(entry.action)}</p>
                      <p className="mt-1 text-xs text-neutral-500">{formatDateTime(entry.created_at)}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
            Nessuna richiesta registrata finora su questo tenant.
          </p>
        )}
      </SectionCard>

      <SectionCard
        title="Elimina il profilo cliente"
        subtitle="Questa operazione cancella il profilo cliente solo per il tenant corrente, esegue il logout e non è reversibile."
      >
        <ActionButton
          icon={<Trash2 className="size-5" />}
          label="Apri conferma cancellazione"
          sublabel="I dati conservati per obblighi legali/accountability resteranno minimizzati come indicato sopra."
          onClick={() => setIsErasureOpen((open) => !open)}
          danger
        />

        {isErasureOpen ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">{confirmationHint}</p>
            <p className="mt-2 text-xs leading-5 text-red-800/80">
              Valore richiesto: <strong>{confirmationValue}</strong>
            </p>
            <input
              type="text"
              value={confirmationInput}
              onChange={(event) => setConfirmationInput(event.target.value)}
              placeholder={confirmationValue}
              className="mt-3 h-12 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm text-neutral-900 outline-none"
            />
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || !isConfirmationValid}
              className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-red-300"
              style={{ backgroundColor: isConfirmationValid ? '#dc2626' : '#fca5a5' }}
            >
              {isDeleting ? 'Cancellazione in corso…' : 'Conferma cancellazione'}
            </button>
          </div>
        ) : null}
      </SectionCard>

      <div className="px-1 text-center text-xs text-neutral-400">
        <Link href={privacyPath} className="underline underline-offset-2">
          Privacy policy cliente finale
        </Link>
      </div>
    </div>
  )
}
