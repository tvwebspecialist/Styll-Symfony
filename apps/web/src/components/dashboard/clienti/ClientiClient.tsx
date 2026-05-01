'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Plus, Search } from 'lucide-react'
import type { ChurnStatus, ClienteRow } from '@/lib/actions/clienti'

const CHURN_IMG: Record<ChurnStatus, string> = {
  active: '/img/Churn_green.png',
  warning: '/img/Churn_yellow.png',
  danger: '/img/Churn_red.png',
  inactive: '/img/Churn_black.png',
}

const CHURN_LABEL: Record<ChurnStatus, string> = {
  active: 'Attivo',
  warning: 'Da monitorare',
  danger: 'A rischio',
  inactive: 'Inattivo',
}

const FILTERS: { key: 'all' | ChurnStatus; label: string; color: string }[] = [
  { key: 'all', label: 'Tutti', color: '#222222' },
  { key: 'active', label: 'Attivi', color: '#16A34A' },
  { key: 'warning', label: 'Da monitorare', color: '#EAB308' },
  { key: 'danger', label: 'A rischio', color: '#DC2626' },
  { key: 'inactive', label: 'Inattivi', color: '#222222' },
]

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
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

export function ClientiClient({ clienti }: { clienti: ClienteRow[] }) {
  const [filter, setFilter] = React.useState<'all' | ChurnStatus>('all')
  const [query, setQuery] = React.useState('')

  const counts = React.useMemo(() => {
    const c: Record<'all' | ChurnStatus, number> = {
      all: clienti.length,
      active: 0,
      warning: 0,
      danger: 0,
      inactive: 0,
    }
    clienti.forEach((cl) => {
      c[cl.churn] += 1
    })
    return c
  }, [clienti])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return clienti.filter((c) => {
      if (filter !== 'all' && c.churn !== filter) return false
      if (!q) return true
      return (
        c.fullName.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q)
      )
    })
  }, [clienti, filter, query])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="clienti-header">
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#222222',
              margin: 0,
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            Elenco dei clienti
            <span style={{ fontSize: 18, color: '#B0B0B0', fontWeight: 600 }}>
              {clienti.length}
            </span>
          </h1>
          <p style={{ fontSize: 14, color: '#B0B0B0', margin: '4px 0 0' }}>
            Gestisci i tuoi clienti, monitora il churn e fidelizzazione.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              fontSize: 14,
              fontWeight: 500,
              color: '#222222',
              cursor: 'pointer',
            }}
          >
            Opzioni
          </button>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#1A1A1A',
              fontSize: 14,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
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
            const count = counts[f.key]
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px 6px 6px',
                  borderRadius: 100,
                  border: active ? '1px solid #222222' : '1px solid #E9E9E9',
                  background: active ? '#222222' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#222222',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 100,
                    background: f.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 700,
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#FFFFFF',
            border: '1px solid #E9E9E9',
            borderRadius: 12,
            padding: '8px 12px',
            minWidth: 220,
          }}
        >
          <Search size={16} color="#B0B0B0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca cliente..."
            style={{
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: '#222222',
              background: 'transparent',
              flex: 1,
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Desktop table */}
      <div
        className="clienti-desktop"
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #F0F0F0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 0.8fr 1fr 0.4fr',
            gap: 16,
            padding: '14px 20px',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#B0B0B0',
            borderBottom: '1px solid #F0F0F0',
            background: '#FAFAFA',
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

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#B0B0B0', fontSize: 14 }}>
            Nessun cliente trovato.
          </div>
        ) : (
          filtered.map((c, i) => (
            <Link
              key={c.id}
              href={`/dashboard/clienti/${c.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 1.2fr 1fr 1fr 0.8fr 1fr 0.4fr',
                gap: 16,
                alignItems: 'center',
                padding: '14px 20px',
                width: '100%',
                background: '#FFFFFF',
                borderTop: i === 0 ? 'none' : '1px solid #F0F0F0',
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                color: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 100,
                    background: '#F0F0F0',
                    color: '#222222',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {initials(c.fullName)}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#222222',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.fullName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#B0B0B0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.email ?? '—'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CHURN_IMG[c.churn]}
                  alt={CHURN_LABEL[c.churn]}
                  width={28}
                  height={28}
                  style={{ display: 'block', flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: '#222222' }}>{CHURN_LABEL[c.churn]}</span>
              </div>

              <div style={{ fontSize: 13, color: '#222222' }}>
                {formatLastVisit(c.lastVisit, c.daysSinceLastVisit)}
              </div>
              <div style={{ fontSize: 13, color: '#222222' }}>
                {formatFrequency(c.visitFrequencyDays)}
              </div>
              <div style={{ fontSize: 13, color: '#222222' }}>{c.totalVisits}</div>
              <div style={{ fontSize: 13, color: '#222222', fontWeight: 600 }}>
                {formatEuro(c.totalSpent)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ChevronRight size={18} color="#B0B0B0" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Mobile list */}
      <div
        className="clienti-mobile"
        style={{ display: 'none', flexDirection: 'column', gap: 10 }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: '#B0B0B0',
              fontSize: 14,
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #F0F0F0',
            }}
          >
            Nessun cliente trovato.
          </div>
        ) : (
          filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/clienti/${c.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 14px',
                background: '#FFFFFF',
                borderRadius: 14,
                border: '1px solid #F0F0F0',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 100,
                  background: '#F0F0F0',
                  color: '#222222',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {initials(c.fullName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#222222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.fullName}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: '#B0B0B0',
                    marginTop: 2,
                  }}
                >
                  <span>{formatLastVisit(c.lastVisit, c.daysSinceLastVisit)}</span>
                  <span>•</span>
                  <span>{c.totalVisits} visite</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: '#222222' }}>
                    {formatEuro(c.totalSpent)}
                  </span>
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CHURN_IMG[c.churn]}
                alt={CHURN_LABEL[c.churn]}
                width={28}
                height={28}
                style={{ display: 'block', flexShrink: 0 }}
              />
              <ChevronRight size={18} color="#B0B0B0" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
