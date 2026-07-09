'use client'

import * as React from 'react'
import { Copy, Check, Loader2, Trash2, Plus, Link2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteOnboardingToken, type OnboardingToken } from '@/app/admin/actions-onboarding'

interface Props {
  initialTokens: OnboardingToken[]
}

function statusLabel(t: OnboardingToken): { label: string; color: string } {
  if (t.used_at) return { label: 'Usato', color: '#10B981' }
  if (!t.active) return { label: 'Disattivato', color: '#6B7280' }
  if (new Date(t.expires_at) < new Date()) return { label: 'Scaduto', color: '#EF4444' }
  return { label: 'Attivo', color: '#3B82F6' }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
      style={{
        background: copied ? 'rgba(16,185,129,0.1)' : 'var(--admin-surface-2)',
        color: copied ? '#10B981' : 'var(--admin-text-muted)',
        border: '1px solid var(--admin-border)',
      }}
      title="Copia"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiato' : 'Copia'}
    </button>
  )
}

export function OnboardingTokensClient({ initialTokens }: Props) {
  const [tokens, setTokens] = React.useState<OnboardingToken[]>(initialTokens)
  const [barbiereEmail, setBarbiereEmail] = React.useState('')
  const [generating, setGenerating] = React.useState(false)
  const [newLink, setNewLink] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setNewLink(null)
    try {
      const res = await fetch('/api/admin/onboarding-tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbiere_email: barbiereEmail || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Errore nella generazione del token.')
        return
      }
      setNewLink(json.link as string)
      setBarbiereEmail('')
      // Refresh token list
      const newToken: OnboardingToken = {
        id: crypto.randomUUID(),
        token: json.token as string,
        barbiere_email: barbiereEmail || null,
        created_by: null,
        created_at: new Date().toISOString(),
        expires_at: json.expires_at as string,
        used_at: null,
        used_by_email: null,
        active: true,
      }
      setTokens((prev) => [newToken, ...prev])
    } catch {
      toast.error('Errore di rete.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await deleteOnboardingToken(id)
    if (res.success) {
      setTokens((prev) => prev.filter((t) => t.id !== id))
      toast.success('Token eliminato.')
    } else {
      toast.error(res.error ?? 'Errore nell\'eliminazione.')
    }
    setDeletingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Generate form */}
      <div className="admin-card p-5">
        <h2
          className="mb-4 text-sm font-semibold"
          style={{ color: 'var(--admin-text)' }}
        >
          Genera nuovo link onboarding
        </h2>
        <form onSubmit={handleGenerate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
              Email barbiere (opzionale)
            </span>
            <input
              type="email"
              placeholder="barbiere@esempio.com"
              value={barbiereEmail}
              onChange={(e) => setBarbiereEmail(e.target.value)}
              className="styll-input px-4 py-2.5 text-sm"
              style={{ fontSize: 14 }}
            />
          </label>
          <button
            type="submit"
            disabled={generating}
            className="styll-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
            style={{ minHeight: 44 }}
          >
            {generating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generazione…
              </>
            ) : (
              <>
                <Plus size={14} />
                Genera link
              </>
            )}
          </button>
        </form>

        {/* New link result */}
        {newLink && (
          <div
            className="mt-4 flex flex-col gap-2 rounded-xl p-4"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <div className="flex items-center gap-2">
              <Link2 size={14} style={{ color: '#3B82F6' }} />
              <span className="text-xs font-semibold" style={{ color: '#3B82F6' }}>
                Link generato — valido 30 giorni
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 truncate rounded-lg px-3 py-2 text-xs"
                style={{
                  background: 'var(--admin-surface-2)',
                  color: 'var(--admin-text)',
                  border: '1px solid var(--admin-border)',
                  fontFamily: 'monospace',
                }}
              >
                {newLink}
              </code>
              <CopyButton text={newLink} />
            </div>
          </div>
        )}
      </div>

      {/* Token list */}
      <div className="admin-card overflow-hidden">
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: 'var(--admin-border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Token generati
          </h2>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'var(--admin-surface-2)', color: 'var(--admin-text-subtle)' }}
          >
            {tokens.length}
          </span>
        </div>

        {tokens.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="text-2xl" role="img" aria-label="chiave">🔑</span>
            <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
              Nessun token generato
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  {['Token', 'Email barbiere', 'Creato', 'Scade', 'Stato', 'Usato da', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--admin-text-subtle)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const status = statusLabel(t)
                  const isUsed = !!t.used_at
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?token=${t.token}`
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code
                            className="rounded px-1.5 py-0.5"
                            style={{
                              background: 'var(--admin-surface-2)',
                              color: 'var(--admin-text)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {t.token.slice(0, 8)}…
                          </code>
                          {!isUsed && <CopyButton text={link} />}
                        </div>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                        {t.barbiere_email ?? <span style={{ color: 'var(--admin-text-subtle)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>
                        {fmtDate(t.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--admin-text-muted)' }}>
                        {fmtDate(t.expires_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: `${status.color}18`, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--admin-text-muted)' }}>
                        {t.used_by_email ?? <span style={{ color: 'var(--admin-text-subtle)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {!isUsed && (
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: '#EF4444',
                              border: '1px solid rgba(239,68,68,0.2)',
                            }}
                            title="Elimina token"
                          >
                            {deletingId === t.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
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
    </div>
  )
}
