'use client'

import * as React from 'react'
import { Database, CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackupRun {
  id: string
  started_at: string | null
  finished_at: string | null
  status: 'success' | 'failure'
  file_name: string | null
  size_bytes: number | null
  error_message: string | null
  created_at: string
}

interface VerifyResult {
  success: boolean
  table_count: number
  tables: string[]
  error: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: 'success' | 'failure' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        status === 'success'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-red-100 text-red-700'
      )}
    >
      {status === 'success' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {status === 'success' ? 'Successo' : 'Fallito'}
    </span>
  )
}

export function BackupsClient() {
  const [runs, setRuns] = React.useState<BackupRun[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [verifying, setVerifying] = React.useState<string | null>(null)
  const [verifyResults, setVerifyResults] = React.useState<Record<string, VerifyResult>>({})

  async function loadBackups() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/symfony/backups')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Errore ${res.status}`)
      }
      const data: BackupRun[] = await res.json()
      setRuns(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadBackups()
  }, [])

  async function handleVerify(runId: string, fileName: string | null) {
    setVerifying(runId)
    const label = fileName ?? runId.slice(0, 8)
    try {
      const res = await fetch(`/api/symfony/backups/${runId}/verify`, { method: 'POST' })
      const data: VerifyResult = await res.json()
      setVerifyResults((prev) => ({ ...prev, [runId]: data }))
      if (data.success) {
        toast.success(`Backup ${label} verificato: ${data.table_count} tabelle ripristinate`)
      } else {
        toast.error(`Verifica fallita: ${data.error ?? 'Errore sconosciuto'}`)
      }
    } catch {
      toast.error('Impossibile contattare il backend')
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Backup DB' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Backup Database</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Storico backup PostgreSQL della VPS Hetzner. I backup vengono eseguiti ogni notte e caricati su Backblaze B2.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadBackups}
          disabled={loading}
          className="shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Aggiorna
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Caricamento storico backup…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-700">Impossibile caricare i backup</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
              <p className="mt-2 text-xs text-red-500">
                Il backend Symfony potrebbe essere irraggiungibile. Verifica che api.styll.it risponda.
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && runs !== null && runs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Database size={40} className="text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">Nessun backup registrato</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            I backup compariranno qui dopo che lo script bash avrà chiamato{' '}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs">POST /api/internal/backups/report</code>.
          </p>
        </div>
      )}

      {!loading && !error && runs !== null && runs.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-zinc-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Stato</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">File</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Dimensione</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Dettagli</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((run) => {
                  const vr = verifyResults[run.id]
                  const isVerifying = verifying === run.id

                  return (
                    <tr key={run.id} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 tabular-nums text-zinc-700">
                        {formatDate(run.finished_at ?? run.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <span className="truncate font-mono text-xs text-zinc-600" title={run.file_name ?? undefined}>
                          {run.file_name ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600">
                        {formatBytes(run.size_bytes)}
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        {run.error_message && (
                          <span className="text-xs text-red-600" title={run.error_message}>
                            {run.error_message.slice(0, 60)}{run.error_message.length > 60 ? '…' : ''}
                          </span>
                        )}
                        {vr && (
                          <div className={cn('mt-1 text-xs font-medium', vr.success ? 'text-emerald-600' : 'text-red-600')}>
                            {vr.success
                              ? `✓ Test restore OK — ${vr.table_count} tabelle`
                              : `✗ Test restore fallito${vr.error ? ': ' + vr.error.slice(0, 60) : ''}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {run.status === 'success' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(run.id, run.file_name)}
                            disabled={isVerifying || verifying !== null}
                            className="text-xs"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 size={12} className="animate-spin" />
                                Verifica…
                              </>
                            ) : (
                              <>
                                <ShieldCheck size={12} />
                                Verifica ripristino
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            Ultimi {runs.length} backup · La verifica ripristino usa un database temporaneo isolato, mai il database di produzione.
          </div>
        </div>
      )}
    </div>
  )
}
