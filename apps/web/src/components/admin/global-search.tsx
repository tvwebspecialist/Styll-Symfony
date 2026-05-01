'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, User, Scissors, Loader2 } from 'lucide-react'

import { adminGlobalSearch } from '@/app/admin/actions'
import { cn } from '@/lib/utils'

interface SearchResults {
  tenants: Array<{ id: string; business_name: string; slug: string }>
  users: Array<{ id: string; full_name: string | null; email: string | null }>
  services: Array<{ id: string; name: string; tenant_id: string; tenant_name: string }>
}

const EMPTY: SearchResults = { tenants: [], users: [], services: [] }

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResults>(EMPTY)
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
      setResults(EMPTY)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(EMPTY)
      return
    }
    let alive = true
    setLoading(true)
    const handle = setTimeout(async () => {
      const res = await adminGlobalSearch(q)
      if (!alive) return
      setLoading(false)
      if (res.success && res.data) setResults(res.data)
    }, 200)
    return () => {
      alive = false
      clearTimeout(handle)
    }
  }, [query, open])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  const total =
    results.tenants.length + results.users.length + results.services.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-xs text-zinc-500 shadow-sm hover:bg-zinc-50    "
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cerca…</span>
        <kbd className="ml-2 hidden rounded border bg-zinc-100 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 sm:inline  ">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3 ">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca tenants, utenti, servizi…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400 "
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {!query.trim() && (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Inizia a digitare per cercare.
                </div>
              )}
              {query.trim() && !loading && total === 0 && (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Nessun risultato.
                </div>
              )}

              {results.tenants.length > 0 && (
                <SearchSection label="Tenants">
                  {results.tenants.map((t) => (
                    <SearchRow
                      key={`t-${t.id}`}
                      icon={Building2}
                      title={t.business_name}
                      subtitle={t.slug}
                      onClick={() => go(`/admin/tenants/${t.id}`)}
                    />
                  ))}
                </SearchSection>
              )}
              {results.users.length > 0 && (
                <SearchSection label="Utenti">
                  {results.users.map((u) => (
                    <SearchRow
                      key={`u-${u.id}`}
                      icon={User}
                      title={u.full_name ?? u.email ?? '—'}
                      subtitle={u.email ?? ''}
                      onClick={() => go(`/admin/users`)}
                    />
                  ))}
                </SearchSection>
              )}
              {results.services.length > 0 && (
                <SearchSection label="Servizi">
                  {results.services.map((s) => (
                    <SearchRow
                      key={`s-${s.id}`}
                      icon={Scissors}
                      title={s.name}
                      subtitle={s.tenant_name}
                      onClick={() => go(`/admin/tenants/${s.tenant_id}`)}
                    />
                  ))}
                </SearchSection>
              )}
            </div>
            <div className="border-t bg-zinc-50 px-4 py-2 text-[10px] text-zinc-400  ">
              ESC per chiudere · ⌘K per riaprire
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SearchSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="px-2 py-1.5">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </div>
      {children}
    </div>
  )
}

function SearchRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 '
      )}
    >
      <Icon className="h-4 w-4 text-zinc-400" />
      <div className="flex-1 truncate">
        <div className="truncate text-zinc-900 ">{title}</div>
        {subtitle && (
          <div className="truncate text-[11px] text-zinc-500">{subtitle}</div>
        )}
      </div>
    </button>
  )
}
