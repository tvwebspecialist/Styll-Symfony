'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, MoreHorizontal, Plus, Search, Upload, FileDown, Code, Printer, X } from 'lucide-react'
import { toast } from 'sonner'
import type { ChurnStatus, ClienteRow } from '@/lib/actions/clienti'
import { createCliente } from '@/lib/actions/clienti'
import {
  DEFAULT_CLIENTI_PAGE_SIZE,
} from '@/lib/clienti-list'
import type { ClientiCounts, ClientiFilter } from '@/lib/clienti-list'
import { ImportClientsModal } from './ImportClientsModal'

const CHURN_IMG: Record<ChurnStatus, string> = {
  active:   '/img/Churn_green.png',
  warning:  '/img/Churn_yellow.png',
  danger:   '/img/Churn_red.png',
  inactive: '/img/Churn_black.png',
}

const CHURN_LABEL: Record<ChurnStatus, string> = {
  active:   'Attivo',
  warning:  'Da monitorare',
  danger:   'A rischio',
  inactive: 'Inattivo',
}

const FILTERS: { key: ClientiFilter; label: string; color: string }[] = [
  { key: 'all',      label: 'Tutti',          color: '#222222' },
  { key: 'active',   label: 'Attivi',          color: '#16A34A' },
  { key: 'warning',  label: 'Da monitorare',   color: '#EAB308' },
  { key: 'danger',   label: 'A rischio',       color: '#DC2626' },
  { key: 'inactive', label: 'Inattivi',        color: '#222222' },
]

const CHURN_BORDER: Record<ChurnStatus, string> = {
  active:   '#16A34A',
  warning:  '#D97706',
  danger:   '#DC2626',
  inactive: '#D1D5DB',
}
const CHURN_AVATAR_BG: Record<ChurnStatus, string> = {
  active:   'rgba(22,163,74,0.1)',
  warning:  'rgba(217,119,6,0.08)',
  danger:   'rgba(220,38,38,0.08)',
  inactive: '#F3F4F6',
}
const CHURN_AVATAR_COLOR: Record<ChurnStatus, string> = {
  active:   '#15803D',
  warning:  '#92400E',
  danger:   '#B91C1C',
  inactive: '#6B7280',
}


function initials(name: string): string {
  return (
    name.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
  )
}

function formatEuro(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

function formatLastVisit(dateIso: string | null, days: number | null): string {
  if (!dateIso || days === null) return '—'
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Ieri'
  if (days < 30) return `${days} giorni fa`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months === 1 ? 'mese' : 'mesi'} fa`
  const years = Math.floor(days / 365)
  return `${years} ${years === 1 ? 'anno' : 'anni'} fa`
}

function formatFrequency(d: number | null): string {
  if (d === null) return '—'
  if (d <= 14) return 'Settimanale'
  if (d <= 35) return 'Mensile'
  if (d <= 75) return 'Bimestrale'
  return `${d} giorni`
}

/* ─── Export helpers ─────────────────────────────────────────────────────── */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function exportClientsToCSV(clienti: ClienteRow[]) {
  const header = ['Nome', 'Email', 'Telefono', 'Stato', 'Ultima visita', 'Visite', 'Speso']
  const rows = clienti.map((c) => [
    c.fullName,
    c.email ?? '',
    c.phone ?? '',
    c.churn,
    c.lastVisit ?? '',
    String(c.totalVisits),
    String(c.totalSpent),
  ])
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `clienti-${new Date().toISOString().slice(0, 10)}.csv`)
}

function exportClientsToJSON(clienti: ClienteRow[]) {
  const blob = new Blob([JSON.stringify(clienti, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `clienti-${new Date().toISOString().slice(0, 10)}.json`)
}

/* ─── Input style helper ─────────────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '14px 16px',
  borderRadius: 12,
  border:       '1px solid #e5e5e5',
  fontSize:     15,
  color:        '#222222',
  background:   '#fafafa',
  outline:      'none',
  boxSizing:    'border-box',
}

interface ClientiClientProps {
  clienti: ClienteRow[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  query: string
  filter: ClientiFilter
  counts: ClientiCounts
}

interface PaginationControlsProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  compact?: boolean
  onPageChange: (page: number) => void
}

function PaginationControls({
  page,
  pageSize,
  totalCount,
  totalPages,
  compact = false,
  onPageChange,
}: PaginationControlsProps) {
  if (totalCount === 0 || totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)

  function renderButton(label: string, nextPage: number, disabled: boolean) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPageChange(nextPage)}
        style={{
          height: compact ? 34 : 38,
          padding: compact ? '0 12px' : '0 14px',
          borderRadius: 10,
          border: '1px solid var(--color-border, #E5E7EB)',
          background: disabled ? '#F5F5F5' : '#FFFFFF',
          color: disabled ? '#B0B0B0' : '#222222',
          fontSize: compact ? 12 : 13,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        alignItems: compact ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: compact ? '4px 2px 0' : '0 4px',
      }}
    >
      <div
        style={{
          fontSize: compact ? 12 : 13,
          color: 'var(--color-fg-muted, #6B7280)',
          textAlign: compact ? 'center' : 'left',
        }}
      >
        Mostra {start}-{end} di {totalCount}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'space-between' : 'flex-end',
          gap: 8,
        }}
      >
        {renderButton('Precedente', page - 1, page <= 1)}
        <span
          style={{
            minWidth: compact ? 'auto' : 92,
            textAlign: 'center',
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            color: '#222222',
          }}
        >
          Pagina {page} di {totalPages}
        </span>
        {renderButton('Successiva', page + 1, page >= totalPages)}
      </div>
    </div>
  )
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export function ClientiClient({
  clienti,
  page,
  pageSize,
  totalCount,
  totalPages,
  query,
  filter,
  counts,
}: ClientiClientProps) {
  const [isMobile,    setIsMobile]    = React.useState(false)
  const [queryInput,  setQueryInput]  = React.useState(query)
  const [optionsOpen, setOptionsOpen] = React.useState(false)
  const [createOpen,  setCreateOpen]  = React.useState(false)
  const [importOpen,  setImportOpen]  = React.useState(false)
  const [creating,    setCreating]    = React.useState(false)
  const [form, setForm] = React.useState({
    fullName:          '',
    email:             '',
    phone:             '',
    preferredChannel:  'whatsapp' as 'whatsapp' | 'email' | 'sms',
    marketingConsent:  true,
  })

  const router = useRouter()
  const pathname = usePathname() ?? ''
  const optionsRef = React.useRef<HTMLDivElement>(null)

  const updateListing = React.useCallback((next: {
    page?: number
    pageSize?: number
    query?: string
    filter?: ClientiFilter
  }) => {
    const params = new URLSearchParams()
    const nextPage = next.page ?? page
    const nextPageSize = next.pageSize ?? pageSize
    const nextFilter = next.filter ?? filter
    const nextQuery = (next.query ?? queryInput).trim()

    if (nextQuery) params.set('query', nextQuery)
    if (nextFilter !== 'all') params.set('filter', nextFilter)
    if (nextPage > 1) params.set('page', String(nextPage))
    if (nextPageSize !== DEFAULT_CLIENTI_PAGE_SIZE) {
      params.set('pageSize', String(nextPageSize))
    }

    router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname)
  }, [filter, page, pageSize, pathname, queryInput, router])

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  /* Click-outside + Escape for dropdown */
  React.useEffect(() => {
    if (!optionsOpen) return
    function handleOutside(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOptionsOpen(false) }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [optionsOpen])

  /* Escape for modal */
  React.useEffect(() => {
    if (!createOpen) return
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setCreateOpen(false) }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [createOpen])

  React.useEffect(() => {
    setQueryInput(query)
  }, [query])

  React.useEffect(() => {
    if (queryInput === query) return
    const timeout = window.setTimeout(() => {
      updateListing({ query: queryInput, page: 1 })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [query, queryInput, updateListing])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await createCliente(form)
    setCreating(false)
    if (res.success) {
      toast.success('Cliente creato')
      setCreateOpen(false)
      setForm({ fullName: '', email: '', phone: '', preferredChannel: 'whatsapp', marketingConsent: true })
      router.refresh()
    } else {
      toast.error(res.error ?? 'Errore durante la creazione')
    }
  }

  /* ── Dropdown item style ── */
  const [hovItem, setHovItem] = React.useState<string | null>(null)
  function dropdownItem(key: string, icon: React.ReactNode, label: string, onClick: () => void) {
    return (
      <button
        key={key}
        type="button"
        onClick={() => { setOptionsOpen(false); onClick() }}
        onMouseEnter={() => setHovItem(key)}
        onMouseLeave={() => setHovItem(null)}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          width:          '100%',
          padding:        '10px 14px',
          border:         'none',
          background:     hovItem === key ? '#FAFAFA' : '#FFFFFF',
          cursor:         'pointer',
          fontSize:       14,
          color:          '#222222',
          textAlign:      'left',
          transition:     'background 100ms ease',
        }}
      >
        {icon}
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {isMobile ? (
        /* ══ MOBILE LAYOUT ═════════════════════════════════════════════════ */
        <>
          {/* Compact page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="dashboard-page-title" style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>
                Clienti
              </h1>
              <span style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-fg-muted)',
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                borderRadius: 100, padding: '2px 8px',
              }}>
                {totalCount}
              </span>
            </div>
            <div ref={optionsRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOptionsOpen((o) => !o)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={18} color="var(--color-fg-secondary)" />
              </button>
              {optionsOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#FFFFFF', border: '1px solid #F0F0F0',
                  borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  zIndex: 100, minWidth: 210, overflow: 'hidden', padding: '4px 0',
                }}>
                  {dropdownItem('import', <Upload size={15} color="#B0B0B0" />, 'Importa clienti', () => { setOptionsOpen(false); setImportOpen(true) })}
                  {dropdownItem('csv',    <FileDown size={15} color="#B0B0B0" />, 'Esporta in CSV',  () => exportClientsToCSV(clienti))}
                  {dropdownItem('json',   <Code size={15} color="#B0B0B0" />,    'Esporta in JSON', () => exportClientsToJSON(clienti))}
                  {dropdownItem('print',  <Printer size={15} color="#B0B0B0" />, 'Stampa elenco',   () => window.print())}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 100,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
            boxShadow: '0 2px 8px rgba(64,79,104,0.06)',
          }}>
            <Search size={16} style={{ color: 'var(--color-fg-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Cerca cliente..."
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: 14, color: 'var(--color-fg)', width: '100%',
              }}
            />
            {queryInput && (
              <button type="button" onClick={() => setQueryInput('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                <X size={14} color="var(--color-fg-muted)" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key
              const count  = counts[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => updateListing({ filter: f.key, page: 1 })}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px', borderRadius: 100,
                    border: active ? 'none' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-fg)' : 'var(--color-bg)',
                    color: active ? '#FFFFFF' : 'var(--color-fg-secondary)',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {f.label}
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: active ? 0.65 : 0.45 }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Client list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clienti.length === 0 ? (
              <div style={{
                padding: 32, textAlign: 'center', color: 'var(--color-fg-muted)', fontSize: 14,
                background: 'var(--color-bg)', borderRadius: 14, border: '1px solid var(--color-border)',
              }}>
                Nessun cliente trovato.
              </div>
            ) : (
              clienti.map((c) => (
                <Link
                  key={c.id}
                  href={`/clienti/${c.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px',
                    background: 'var(--color-bg)',
                    borderRadius: 14,
                    border: '1px solid var(--color-border)',
                    borderLeft: `3px solid ${CHURN_BORDER[c.churn]}`,
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%',
                    background: CHURN_AVATAR_BG[c.churn],
                    color: CHURN_AVATAR_COLOR[c.churn],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(c.fullName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.fullName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-fg-muted)', marginTop: 3 }}>
                      <span style={{ whiteSpace: 'nowrap' }}>{formatLastVisit(c.lastVisit, c.daysSinceLastVisit)}</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{c.totalVisits} visite</span>
                      <span style={{ opacity: 0.35 }}>·</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-fg-secondary)', whiteSpace: 'nowrap' }}>{formatEuro(c.totalSpent)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--color-fg-muted)" style={{ flexShrink: 0 }} />
                </Link>
              ))
            )}
          </div>

          <PaginationControls
            compact
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={(nextPage) => updateListing({ page: nextPage })}
          />

          {/* FAB — Aggiungi cliente */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Aggiungi cliente"
            style={{
              position: 'fixed',
              bottom: 'calc(80px + max(16px, env(safe-area-inset-bottom, 16px)))',
              right: 20,
              width: 52, height: 52, borderRadius: 100,
              background: 'var(--color-fg)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 40,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
          </button>
        </>
      ) : (
        /* ══ DESKTOP LAYOUT ════════════════════════════════════════════════ */
        <>
          {/* Header */}
          <div className="clienti-header">
            <div>
              <h1
                className="dashboard-page-title"
                style={{
                  fontSize:   28,
                  fontWeight: 700,
                  color:      '#222222',
                  margin:     0,
                  display:    'flex',
                  alignItems: 'baseline',
                  gap:        10,
                  flexWrap:   'wrap',
                }}
              >
                Elenco dei clienti
                <span style={{ fontSize: 18, color: '#B0B0B0', fontWeight: 600 }}>{totalCount}</span>
              </h1>
              <p style={{ fontSize: 14, color: '#B0B0B0', margin: '4px 0 0' }}>
                Gestisci i tuoi clienti, monitora il churn e fidelizzazione.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {/* Opzioni + dropdown */}
              <div ref={optionsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setOptionsOpen((o) => !o)}
                  style={{
                    padding:      '10px 16px',
                    borderRadius: 12,
                    border:       '1px solid #E9E9E9',
                    background:   '#FFFFFF',
                    fontSize:     14,
                    fontWeight:   500,
                    color:        '#222222',
                    cursor:       'pointer',
                  }}
                >
                  Opzioni
                </button>

                {optionsOpen && (
                  <div
                    style={{
                      position:     'absolute',
                      top:          'calc(100% + 6px)',
                      right:        0,
                      background:   '#FFFFFF',
                      border:       '1px solid #F0F0F0',
                      borderRadius: 12,
                      boxShadow:    '0 4px 20px rgba(0,0,0,0.08)',
                      zIndex:       100,
                      minWidth:     210,
                      overflow:     'hidden',
                      padding:      '4px 0',
                    }}
                  >
                    {dropdownItem('import', <Upload size={15} color="#B0B0B0" />, 'Importa clienti', () => { setOptionsOpen(false); setImportOpen(true) })}
                    {dropdownItem('csv',    <FileDown size={15} color="#B0B0B0" />, 'Esporta in CSV',  () => exportClientsToCSV(clienti))}
                    {dropdownItem('json',   <Code size={15} color="#B0B0B0" />,    'Esporta in JSON', () => exportClientsToJSON(clienti))}
                    {dropdownItem('print',  <Printer size={15} color="#B0B0B0" />, 'Stampa elenco',   () => window.print())}
                  </div>
                )}
              </div>

              {/* Aggiungi cliente */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                style={{
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          6,
                  padding:      '10px 16px',
                  borderRadius: 12,
                  border:       'none',
                  background:   '#1A1A1A',
                  fontSize:     14,
                  fontWeight:   600,
                  color:        '#FFFFFF',
                  cursor:       'pointer',
                }}
              >
                Aggiungi cliente
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Filters + search */}
          <div className="clienti-toolbar">
            <div className="clienti-filters">
              {FILTERS.map((f) => {
                const active = filter === f.key
                const count  = counts[f.key]
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => updateListing({ filter: f.key, page: 1 })}
                    style={{
                      display:     'inline-flex',
                      alignItems:  'center',
                      gap:         8,
                      padding:     '6px 14px 6px 6px',
                      borderRadius: 100,
                      border:      active ? '1px solid #222222' : '1px solid #E9E9E9',
                      background:  active ? '#222222' : '#FFFFFF',
                      color:       active ? '#FFFFFF' : '#222222',
                      fontSize:    13,
                      fontWeight:  500,
                      cursor:      'pointer',
                      whiteSpace:  'nowrap',
                      flexShrink:  0,
                    }}
                  >
                    <span
                      style={{
                        width:          22,
                        height:         22,
                        borderRadius:   100,
                        background:     f.color,
                        display:        'inline-flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        color:          '#FFFFFF',
                        fontSize:       11,
                        fontWeight:     700,
                      }}
                    >
                      {count}
                    </span>
                    {f.label}
                  </button>
                )
              })}
            </div>

            <div
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                background:   '#FFFFFF',
                border:       '1px solid #E9E9E9',
                borderRadius: 12,
                padding:      '8px 12px',
                minWidth:     220,
              }}
            >
              <Search size={16} color="#B0B0B0" />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Cerca cliente..."
                style={{
                  border:     'none',
                  outline:    'none',
                  fontSize:   14,
                  color:      '#222222',
                  background: 'transparent',
                  flex:       1,
                  minWidth:   0,
                }}
              />
            </div>
          </div>

          {/* Desktop table */}
          <div
            style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F0F0F0', overflow: 'hidden' }}
          >
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 0.8fr 1fr 0.4fr',
                gap:                 16,
                padding:             '14px 20px',
                fontSize:            11,
                fontWeight:          600,
                textTransform:       'uppercase',
                letterSpacing:       '0.06em',
                color:               '#B0B0B0',
                borderBottom:        '1px solid #F0F0F0',
                background:          '#FAFAFA',
              }}
            >
              <div>Cliente</div>
              <div>Stato</div>
              <div>Ultima visita</div>
              <div>Frequenza</div>
              <div>Visite</div>
              <div>Speso</div>
              <div></div>
            </div>

            {clienti.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#B0B0B0', fontSize: 14 }}>
                Nessun cliente trovato.
              </div>
            ) : (
              clienti.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/clienti/${c.id}`}
                  style={{
                    display:             'grid',
                    gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 0.8fr 1fr 0.4fr',
                    gap:                 16,
                    alignItems:          'center',
                    padding:             '14px 20px',
                    width:               '100%',
                    background:          '#FFFFFF',
                    borderTop:           i === 0 ? 'none' : '1px solid #F0F0F0',
                    cursor:              'pointer',
                    textAlign:           'left',
                    whiteSpace:          'nowrap',
                    textDecoration:      'none',
                    color:               'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div
                      style={{
                        width:          40,
                        height:         40,
                        borderRadius:   100,
                        background:     '#F0F0F0',
                        color:          '#222222',
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        fontSize:       13,
                        fontWeight:     600,
                        flexShrink:     0,
                      }}
                    >
                      {initials(c.fullName)}
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#222222', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.fullName}
                      </div>
                      <div style={{ fontSize: 12, color: '#B0B0B0', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.email ?? '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Image src={CHURN_IMG[c.churn]} alt={CHURN_LABEL[c.churn]} width={28} height={28} style={{ display: 'block', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#222222' }}>{CHURN_LABEL[c.churn]}</span>
                  </div>

                  <div style={{ fontSize: 13, color: '#222222' }}>{formatLastVisit(c.lastVisit, c.daysSinceLastVisit)}</div>
                  <div style={{ fontSize: 13, color: '#222222' }}>{formatFrequency(c.visitFrequencyDays)}</div>
                  <div style={{ fontSize: 13, color: '#222222' }}>{c.totalVisits}</div>
                  <div style={{ fontSize: 13, color: '#222222', fontWeight: 600 }}>{formatEuro(c.totalSpent)}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <ChevronRight size={18} color="#B0B0B0" />
                  </div>
                </Link>
              ))
            )}
          </div>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={(nextPage) => updateListing({ page: nextPage })}
          />
        </>
      )}

      {/* ── Modal: Crea cliente ── */}
      {createOpen && (
        <div
          className="styll-modal-overlay"
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.5)',
            zIndex:         1000,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="styll-modal-popup"
            style={{
              background:   '#FFFFFF',
              borderRadius: 16,
              padding:      24,
              maxWidth:     480,
              width:        '90%',
              boxShadow:    '0 20px 60px rgba(0,0,0,0.15)',
              overflowY:    'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="styll-modal-drag-handle" aria-hidden="true" />
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#222222' }}>Nuovo cliente</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B0B0B0', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Nome */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Nome completo <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    placeholder="es. Mario Rossi"
                    style={inputStyle}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Email <span style={{ fontSize: 12, color: '#B0B0B0', fontWeight: 400, textTransform: 'none' }}>(opzionale)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="mario@esempio.it"
                    style={inputStyle}
                  />
                </div>

                {/* Telefono */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Telefono <span style={{ fontSize: 12, color: '#B0B0B0', fontWeight: 400, textTransform: 'none' }}>(opzionale)</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+39 333 123 4567"
                    style={inputStyle}
                  />
                </div>

                {/* Canale preferito */}
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#888', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                    Canale preferito
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['whatsapp', 'email', 'sms'] as const).map((ch) => (
                      <label
                        key={ch}
                        style={{
                          flex:         1,
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'center',
                          gap:          6,
                          padding:      '8px 12px',
                          borderRadius: 10,
                          border:       form.preferredChannel === ch ? '1px solid #222222' : '1px solid #E9E9E9',
                          background:   form.preferredChannel === ch ? '#222222' : '#FFFFFF',
                          color:        form.preferredChannel === ch ? '#FFFFFF' : '#222222',
                          fontSize:     13,
                          fontWeight:   500,
                          cursor:       'pointer',
                          userSelect:   'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="channel"
                          value={ch}
                          checked={form.preferredChannel === ch}
                          onChange={() => setForm((f) => ({ ...f, preferredChannel: ch }))}
                          style={{ display: 'none' }}
                        />
                        {ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'SMS'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Consenso marketing */}
                <label
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         10,
                    cursor:      'pointer',
                    userSelect:  'none',
                    fontSize:    13,
                    color:       '#222222',
                    padding:     '10px 12px',
                    borderRadius: 10,
                    border:      '1px solid #e5e5e5',
                    background:  '#fafafa',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.marketingConsent}
                    onChange={(e) => setForm((f) => ({ ...f, marketingConsent: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1A1A1A' }}
                  />
                  Consenso marketing
                </label>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  style={{
                    height:       52,
                    padding:      '0 20px',
                    borderRadius: 14,
                    border:       '1px solid #e5e5e5',
                    background:   '#FFFFFF',
                    fontSize:     16,
                    fontWeight:   600,
                    color:        '#222222',
                    cursor:       'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    height:       52,
                    padding:      '0 24px',
                    borderRadius: 14,
                    border:       'none',
                    background:   creating ? '#888888' : '#1A1A1A',
                    fontSize:     16,
                    fontWeight:   700,
                    color:        '#FFFFFF',
                    cursor:       creating ? 'not-allowed' : 'pointer',
                    transition:   'background 150ms ease',
                  }}
                >
                  {creating ? 'Creando...' : 'Crea cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importOpen && (
        <ImportClientsModal onClose={() => setImportOpen(false)} />
      )}
    </div>
  )
}
