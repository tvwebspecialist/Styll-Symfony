'use client'

import * as React from 'react'
import Link from 'next/link'
import { Upload, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ImportJobRow } from '@/app/admin/actions'
import type { ImportError } from '@/lib/actions/clienti'
import { getImportJobErrors } from '@/app/admin/actions'
import { AdminImportModal } from './AdminImportModal'

// ─── Source badge config ───────────────────────────────────────

const SOURCE_CFG: Record<string, { label: string; cls: string }> = {
  fresha:      { label: 'Fresha',     cls: 'bg-pink-100 text-pink-700' },
  treatwell:   { label: 'Treatwell',  cls: 'bg-blue-100 text-blue-700' },
  booksy:      { label: 'Booksy',     cls: 'bg-green-100 text-green-700' },
  csv_generic: { label: 'CSV',        cls: 'bg-zinc-100 text-zinc-600' },
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completato', cls: 'bg-emerald-100 text-emerald-700' },
  partial:   { label: 'Parziale',   cls: 'bg-amber-100 text-amber-700' },
  failed:    { label: 'Fallito',    cls: 'bg-red-100 text-red-700' },
}

function Badge({ text, cls }: { text: string; cls: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', cls)}>
      {text}
    </span>
  )
}

// ─── Error drawer ──────────────────────────────────────────────

function ErrorDrawer({ tenantId, jobId, errorCount }: { tenantId: string; jobId: string; errorCount: number }) {
  const [open, setOpen] = React.useState(false)
  const [errors, setErrors] = React.useState<ImportError[] | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function load() {
    if (errors !== null) { setOpen((v) => !v); return }
    setLoading(true)
    const res = await getImportJobErrors(tenantId, jobId)
    setLoading(false)
    if (!res.success) { toast.error(res.error ?? 'Errore nel caricamento degli errori'); return }
    setErrors(res.errors ?? [])
    setOpen(true)
  }

  return (
    <div>
      <button
        type="button"
        onClick={load}
        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {loading ? 'Carico...' : <><span>Errori ({errorCount})</span>{open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</>}
      </button>

      {open && errors !== null && errors.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-red-50 text-xs">
          {errors.map((e, i) => (
            <div key={i} className={cn('flex gap-2 px-3 py-1.5', i > 0 && 'border-t border-red-100')}>
              <span className="text-muted-foreground shrink-0">Riga {e.rowIndex}</span>
              {e.field && <span className="text-muted-foreground/70 shrink-0">({e.field})</span>}
              <span className="text-red-700">{e.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

export function TenantMigrationClient({
  tenantId,
  jobs,
  loadError,
}: {
  tenantId: string
  jobs: ImportJobRow[]
  loadError: string | null
}) {
  const [importOpen, setImportOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Migrazione clienti</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Importa clienti per conto del tenant. Usa questa funzione per migrazioni assistite
            da Fresha, Treatwell, Booksy o file CSV custom.
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="shrink-0 gap-2">
          <Upload className="h-4 w-4" />
          Avvia nuova migrazione
        </Button>
      </div>

      {/* ── Info card ── */}
      <div className="rounded-xl border bg-white p-5">
        <p className="mb-4 text-sm font-semibold">Come funziona</p>
        <ol className="flex flex-col gap-3">
          {[
            { n: '1', text: 'Carichi il CSV ricevuto dal cliente' },
            { n: '2', text: 'Mappi le colonne ai campi Styll' },
            { n: '3', text: 'Verifichi anteprima e duplicati' },
            { n: '4', text: 'Confermi l\'import — i clienti finiscono nella sua dashboard' },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                {s.n}
              </span>
              <span className="text-sm text-muted-foreground">{s.text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Jobs table ── */}
      <div className="rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="text-sm font-semibold">Storico import</p>
          {jobs.length > 0 && (
            <span className="text-xs text-muted-foreground">{jobs.length} operazioni</span>
          )}
        </div>

        {loadError ? (
          <p className="px-5 py-4 text-sm text-red-600">{loadError}</p>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <Upload className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Nessun import ancora</p>
            <p className="text-xs text-muted-foreground">
              Clicca "Avvia nuova migrazione" per iniziare.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50/50 text-xs text-muted-foreground">
                  <th className="px-5 py-2.5 text-left font-medium">Data</th>
                  <th className="px-4 py-2.5 text-left font-medium">Sorgente</th>
                  <th className="px-4 py-2.5 text-left font-medium">File</th>
                  <th className="px-4 py-2.5 text-left font-medium">Risultato</th>
                  <th className="px-4 py-2.5 text-left font-medium">Stato</th>
                  <th className="px-4 py-2.5 text-left font-medium">Iniziato da</th>
                  <th className="px-4 py-2.5 text-left font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => {
                  const src = SOURCE_CFG[job.source ?? ''] ?? { label: job.source ?? '—', cls: 'bg-zinc-100 text-zinc-600' }
                  const st  = STATUS_CFG[job.status] ?? { label: job.status, cls: 'bg-zinc-100 text-zinc-600' }
                  return (
                    <tr key={job.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="whitespace-nowrap px-5 py-3 tabular-nums text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={src.label} cls={src.cls} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs text-muted-foreground" title={job.filename ?? ''}>
                        {job.filename ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className="text-emerald-700">✅ {job.imported_count}</span>
                        {job.merged_count > 0 && <span className="ml-2 text-blue-700">🔄 {job.merged_count}</span>}
                        {job.skipped_count > 0 && <span className="ml-2 text-zinc-500">⏭️ {job.skipped_count}</span>}
                        {job.error_count > 0 && <span className="ml-2 text-amber-700">⚠️ {job.error_count}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge text={st.label} cls={st.cls} />
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-xs text-muted-foreground" title={job.initiator_email ?? ''}>
                        {job.initiator_email ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {job.error_count > 0 ? (
                          <ErrorDrawer tenantId={tenantId} jobId={job.id} errorCount={job.error_count} />
                        ) : (
                          <Link
                            href={`/admin/tenants/${tenantId}/clients`}
                            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                          >
                            Vedi clienti
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {importOpen && (
        <AdminImportModal
          tenantId={tenantId}
          onClose={() => setImportOpen(false)}
        />
      )}
    </div>
  )
}
