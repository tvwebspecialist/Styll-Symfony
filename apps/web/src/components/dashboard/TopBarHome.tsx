'use client'

import * as React from 'react'
import ReactDOM from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Search, HelpCircle } from 'lucide-react'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'
import { dashboardSearch, getRecentClients } from '@/lib/actions/dashboard-search'
import type { SearchResult } from '@/lib/actions/dashboard-search'
import { MOCK_UNREAD_COUNT } from '@/components/dashboard/notifiche/NotificheClient'

interface TopBarHomeProps {
  fullName: string
  avatarUrl: string | null
}

export default function TopBarHome({ fullName, avatarUrl }: TopBarHomeProps) {
  const { greeting, subtitle } = useDashboardHomeStore()
  const pathname = usePathname()
  const router = useRouter()

  const slug = pathname.split('/').filter(Boolean)[2] ?? ''

  // In dev with query-param tenant routing, derive aiuto href from search params
  // (mirrors the logic in TopBar.tsx for the desktop help link)
  const [aiutoHref, setAiutoHref] = React.useState(
    slug ? `/tenant/dashboard/${slug}/aiuto` : '/aiuto'
  )
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qSlug = params.get('_tenant_slug')
    const qType = params.get('_tenant_type')
    if (qSlug && qType) {
      setAiutoHref(`/aiuto?_tenant_slug=${qSlug}&_tenant_type=${qType}`)
    } else if (slug) {
      setAiutoHref(`/tenant/dashboard/${slug}/aiuto`)
    }
  }, [slug])

  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [recents, setRecents] = React.useState<SearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [dropdownPos, setDropdownPos] = React.useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const displayGreeting = greeting || `Ciao, ${fullName.split(' ')[0]}`
  const displaySubtitle = subtitle || 'Nessun appuntamento oggi'

  React.useEffect(() => {
    if (open && !query) {
      getRecentClients()
        .then(setRecents)
        .catch((err) => console.error('[TopBarHome] error:', err))
    }
  }, [open, query])

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) return
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      dashboardSearch(query)
        .then((r) => {
          setResults(r)
          setLoading(false)
        })
        .catch((err) => {
          console.error('[TopBarHome] error:', err)
          setLoading(false)
        })
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const inContainer = containerRef.current?.contains(e.target as Node)
      const inDropdown = dropdownRef.current?.contains(e.target as Node)
      if (!inContainer && !inDropdown) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  React.useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width - 54, // 44px help button + 10px gap
      })
    }
  }, [open])

  function handleSelect(result: SearchResult) {
    router.push(result.href)
    setOpen(false)
    setQuery('')
  }

  const showEmpty = !!query.trim() && !loading && results.length === 0

  return (
    <>
      <div className="mobile-only topbar-glass topbar-glass--home">
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 10,
          paddingBottom: 14,
        }}
      >

        {/* ROW 1 — avatar + bell */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <Link
            href="/profilo"
            aria-label="Profilo"
            style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                  cursor: 'pointer',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '2.5px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}
              >
                {initials}
              </div>
            )}
          </Link>

          <Link
            href="/notifiche"
            aria-label="Notifiche"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.62)',
              border: '1px solid rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <Bell size={21} color="#111111" strokeWidth={1.8} />
            {MOCK_UNREAD_COUNT > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#ef4444',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid rgba(250,251,253,0.9)',
                  lineHeight: 1,
                }}
              >
                {MOCK_UNREAD_COUNT}
              </span>
            )}
          </Link>
        </div>

        {/* ROW 2 — greeting + subtitle */}
        <div style={{ marginBottom: 10 }}>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}
          >
            {displayGreeting}
          </p>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              fontWeight: 400,
              color: '#666666',
              lineHeight: 1.4,
            }}
          >
            {displaySubtitle}
          </p>
        </div>

        {/* ROW 3 — search bar */}
        <div ref={containerRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.66)',
                border: `1px solid ${open ? 'rgba(34,34,34,0.5)' : 'rgba(255,255,255,0.78)'}`,
                borderRadius: 50,
                paddingLeft: 16,
                paddingRight: 16,
                height: 44,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 5px 18px rgba(15,23,42,0.07)',
              }}
            >
              <Search size={17} color="#888888" strokeWidth={2} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="Cerca clienti, servizi..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: '#111111',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <Link
              href={aiutoHref}
              aria-label="Aiuto"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.62)',
                border: '1px solid rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
                textDecoration: 'none',
              }}
            >
              <HelpCircle size={18} color="#111111" strokeWidth={1.8} />
            </Link>
          </div>
        </div>

      </div>
    </div>

    {/* Search dropdown — portaled to body to escape overflow:hidden on topbar-glass */}
    {open && dropdownPos && ReactDOM.createPortal(
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          background: '#FFFFFF',
          border: '1px solid #E9E9E9',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          zIndex: 9999,
          maxHeight: 320,
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
              <MobileSearchRow key={r.id} result={r} onSelect={handleSelect} />
            ))}
          </>
        )}
        {query.trim() && !loading && results.length > 0 && results.map((r) => (
          <MobileSearchRow key={r.id} result={r} onSelect={handleSelect} />
        ))}
      </div>,
      document.body
    )}
    </>
  )
}

function MobileSearchRow({
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
