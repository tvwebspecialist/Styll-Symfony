'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, HelpCircle, Moon, Bell, User as UserIcon, Calendar, Scissors } from 'lucide-react'
import { MOCK_UNREAD_COUNT } from '@/components/dashboard/notifiche/NotificheClient'
import { dashboardSearch, getRecentClients } from '@/lib/actions/dashboard-search'
import type { SearchResult } from '@/lib/actions/dashboard-search'

interface TopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
  initials?: string
  impersonation?: {
    adminName: string
    tenantName: string
  } | null
}

function computeInitials(fullName: string | null | undefined, fallback?: string): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || (fallback ?? '')
  }
  return (fallback ?? '').slice(0, 2).toUpperCase()
}

function ResultIcon({ type }: { type: SearchResult['type'] }) {
  const s = { color: '#B0B0B0', flexShrink: 0 } as const
  if (type === 'appointment') return <Calendar size={15} style={s} />
  if (type === 'service') return <Scissors size={15} style={s} />
  return <UserIcon size={15} style={s} />
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  client: 'Clienti',
  appointment: 'Appuntamenti',
  service: 'Servizi',
}

export function TopBar({ fullName, avatarUrl, initials, impersonation }: TopBarProps) {
  const router = useRouter()
  const [imgError, setImgError] = React.useState(false)
  const [aiutoHref, setAiutoHref] = React.useState('/aiuto')

  // In dev with query-param fallback, preserve _tenant_slug / _tenant_type so
  // client-side navigation doesn't lose the tenant context.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('_tenant_slug')
    const type = params.get('_tenant_type')
    if (slug && type) {
      setAiutoHref(`/aiuto?_tenant_slug=${slug}&_tenant_type=${type}`)
    }
  }, [])
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recents, setRecents] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialsText = computeInitials(fullName ?? null, initials)
  const showImage = !!avatarUrl && !imgError
  const showInitials = !showImage && initialsText.length > 0

  // Load recent clients when dropdown opens with no query
  React.useEffect(() => {
    if (open && !query) {
      getRecentClients()
        .then(setRecents)
        .catch((err) => console.error('[TopBar] error:', err))
    }
  }, [open, query])

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(() => {
      dashboardSearch(query)
        .then((r) => {
          setResults(r)
          setLoading(false)
        })
        .catch((err) => {
          console.error('[TopBar] error:', err)
          setLoading(false)
        })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Click outside to close
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleSelect(result: SearchResult) {
    router.push(result.href)
    setOpen(false)
    setQuery('')
  }

  // Group results by type
  const grouped = React.useMemo(() => {
    const map = new Map<SearchResult['type'], SearchResult[]>()
    for (const r of results) {
      const arr = map.get(r.type) ?? []
      arr.push(r)
      map.set(r.type, arr)
    }
    return map
  }, [results])

  const showEmpty = query.trim() && !loading && results.length === 0

  return (
    <div
      className="desktop-topbar"
      style={{
        display: 'flex',
        padding: '16px 16px 0 16px',
        gap: 10,
        alignItems: 'center',
        width: '100%',
        height: 'var(--topbar-height)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 173,
          padding: 12,
          borderRadius: 20,
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: impersonation ? 14 : 32,
            color: '#222222',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {impersonation ? (
            <>
              <span style={{ color: '#222' }}>{impersonation.adminName}</span>
              <span
                style={{
                  background: '#E94560',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                ADMIN
              </span>
              <span style={{ color: '#999', fontWeight: 500 }}>→</span>
              <span style={{ color: '#8B5CF6' }}>{impersonation.tenantName}</span>
            </>
          ) : (
            'Styll'
          )}
        </div>

        {/* Search bar */}
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              padding: '5px 5px 5px 25px',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: 100,
              border: `1px solid ${open ? '#222222' : '#E9E9E9'}`,
              background: '#F4F4F4',
              boxShadow: '0 6px 15px 0 rgba(64, 79, 104, 0.05)',
              transition: 'border-color 150ms ease',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Cosa stai cercando.. (⌘K)"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: '#222222',
                fontFamily: 'Outfit, sans-serif',
              }}
            />
            <button
              type="button"
              style={{
                width: 40,
                height: 40,
                borderRadius: 100,
                background: '#FFFFFF',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Cerca"
            >
              <Search size={18} color="#222222" />
            </button>
          </div>

          {/* Dropdown */}
          {open && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                background: '#FFFFFF',
                border: '1px solid #E9E9E9',
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 100,
                maxHeight: 400,
                overflowY: 'auto',
                padding: 8,
              }}
            >
              {loading && (
                <p style={{ fontSize: 13, color: '#B0B0B0', padding: '12px 12px', margin: 0 }}>
                  Ricerca in corso...
                </p>
              )}

              {showEmpty && (
                <p style={{ fontSize: 13, color: '#B0B0B0', padding: '12px 12px', margin: 0 }}>
                  Nessun risultato per &ldquo;{query}&rdquo;
                </p>
              )}

              {!query.trim() && recents.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B0B0', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 12px 4px', margin: 0 }}>
                    Ultimi clienti
                  </p>
                  {recents.map((r) => (
                    <SearchRow key={r.id} result={r} onSelect={handleSelect} />
                  ))}
                </>
              )}

              {query.trim() && !loading && results.length > 0 && (
                Array.from(grouped.entries()).map(([type, items]) => (
                  <React.Fragment key={type}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B0B0', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '8px 12px 4px', margin: 0 }}>
                      {TYPE_LABELS[type]}
                    </p>
                    {items.map((r) => (
                      <SearchRow key={r.id} result={r} onSelect={handleSelect} />
                    ))}
                  </React.Fragment>
                ))
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginLeft: 'auto',
          }}
        >
          <Link
            href={aiutoHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <HelpCircle size={16} color="#222222" />
            <span style={{ fontSize: 13, color: '#222222' }}>Hai bisogno di aiuto?</span>
          </Link>

          <button
            type="button"
            aria-label="Tema scuro"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Moon size={18} color="#222222" />
          </button>

          <Link
            href="/notifiche"
            aria-label="Notifiche"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              position: 'relative',
              textDecoration: 'none',
            }}
          >
            <Bell size={18} color="#222222" />
            {MOCK_UNREAD_COUNT > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid #FFFFFF',
                  lineHeight: 1,
                }}
              >
                {MOCK_UNREAD_COUNT}
              </span>
            )}
          </Link>

          <Link
            href="/profilo"
            aria-label="Profilo"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              background: '#E9E9E9',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#222222',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 120ms ease',
              overflow: 'hidden',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl as string}
                alt="Avatar"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 100,
                }}
              />
            ) : showInitials ? (
              <span>{initialsText}</span>
            ) : (
              <UserIcon size={20} color="#222222" />
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}

function SearchRow({
  result,
  onSelect,
}: {
  result: SearchResult
  onSelect: (r: SearchResult) => void
}) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(result)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(result)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'pointer',
        background: hovered ? '#F5F5F5' : 'transparent',
        transition: 'background 100ms ease',
      }}
    >
      <ResultIcon type={result.type} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#222222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.title}
        </p>
        <p style={{ fontSize: 12, color: '#B0B0B0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.subtitle}
        </p>
      </div>
    </div>
  )
}
