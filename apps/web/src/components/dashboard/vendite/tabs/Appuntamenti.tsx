'use client'

import * as React from 'react'
import { CalendarX } from 'lucide-react'
import { Card, formatEuro } from '../ui'
import { FilterField, filterBarStyle, filterInputStyle, EmptyState } from '../filters'
import { getAppuntamentiVendite, type AppuntamentoVendita } from '@/lib/actions/vendite'

function statusBadge(status: 'paid' | 'pending' | 'partial') {
  const map = {
    paid: { label: 'Pagato', bg: '#DCFCE7', color: '#166534' },
    pending: { label: 'Da pagare', bg: '#FFEDD5', color: '#9A3412' },
    partial: { label: 'Parziale', bg: '#FEF9C3', color: '#854D0E' },
  } as const
  const s = map[status]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}

export function Appuntamenti({ tenantId }: { tenantId: string }) {
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [status, setStatus] = React.useState('tutti')
  const [rows, setRows] = React.useState<AppuntamentoVendita[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getAppuntamentiVendite(tenantId, { dateFrom, dateTo, status })
      .then((r) => {
        if (!cancelled) {
          setRows(r)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenantId, dateFrom, dateTo, status])

  return (
    <Card>
      <div style={filterBarStyle}>
        <FilterField label="Da">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={filterInputStyle} />
        </FilterField>
        <FilterField label="A">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={filterInputStyle} />
        </FilterField>
        <FilterField label="Stato">
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={filterInputStyle}>
            <option value="tutti">Tutti</option>
            <option value="completed">Completati</option>
            <option value="cancelled">Cancellati</option>
            <option value="confirmed">Confermati</option>
          </select>
        </FilterField>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          Icon={CalendarX}
          title="Nessun appuntamento nel periodo"
          subtitle="Gli appuntamenti completati appariranno qui."
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--divider)', textAlign: 'left' }}>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Orario</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Servizi</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Totale</th>
                <th style={thStyle}>Stato pagamento</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: '1px solid var(--divider)', transition: 'background 80ms ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{r.time}</td>
                  <td style={tdStyle}>{r.clientName}</td>
                  <td style={tdStyle}>{r.services.join(', ') || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatEuro(r.totalAmount)}</td>
                  <td style={tdStyle}>{statusBadge(r.paymentStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 8px',
  color: 'var(--text-primary)',
}
