'use client'

import * as React from 'react'
import { CreditCard } from 'lucide-react'
import { Card, formatEuro } from '../ui'
import { FilterField, FilterBar, EmptyState } from '../filters'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { getPagamenti, type PagamentiResult } from '@/lib/actions/vendite'

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

function statusBadge(status: string) {
  const s = (status || '').toLowerCase()
  let bg = '#FFEDD5', color = '#9A3412', label = 'Da pagare'
  if (s === 'paid' || s === 'completed') {
    bg = '#DCFCE7'
    color = '#166534'
    label = 'Pagato'
  } else if (s === 'partial') {
    bg = '#FEF9C3'
    color = '#854D0E'
    label = 'Parziale'
  } else if (s === 'refunded') {
    bg = '#E0E7FF'
    color = '#3730A3'
    label = 'Rimborsato'
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 100,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  )
}

export function Pagamenti({ tenantId }: { tenantId: string }) {
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [status, setStatus] = React.useState('tutti')
  const [data, setData] = React.useState<PagamentiResult>({ rows: [], totaleIncassato: 0, daIncassare: 0 })
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getPagamenti(tenantId, { dateFrom, dateTo, status })
      .then((r) => {
        if (!cancelled) {
          setData(r)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Totale incassato
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-positive)', marginTop: 8 }}>
            {formatEuro(data.totaleIncassato)}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Da incassare
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-negative)', marginTop: 8 }}>
            {formatEuro(data.daIncassare)}
          </div>
        </Card>
      </div>

      <Card>
        <FilterBar>
          <FilterField label="Da">
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Da data" />
          </FilterField>
          <FilterField label="A">
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="A data" />
          </FilterField>
          <FilterField label="Stato">
            <CustomSelect
              value={status}
              onChange={setStatus}
              options={[
                { value: 'tutti', label: 'Tutti' },
                { value: 'paid', label: 'Pagato' },
                { value: 'pending', label: 'Da pagare' },
                { value: 'partial', label: 'Parziale' },
                { value: 'refunded', label: 'Rimborsato' },
              ]}
            />
          </FilterField>
        </FilterBar>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
        ) : data.rows.length === 0 ? (
          <EmptyState
            Icon={CreditCard}
            title="Nessun pagamento registrato"
            subtitle="I pagamenti appariranno dopo aver completato appuntamenti."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)', textAlign: 'left' }}>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Importo</th>
                  <th style={thStyle}>Metodo</th>
                  <th style={thStyle}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid var(--divider)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>{r.date}</td>
                    <td style={tdStyle}>{r.clientName}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatEuro(r.amount)}</td>
                    <td style={tdStyle}>{r.paymentMethod}</td>
                    <td style={tdStyle}>{statusBadge(r.paymentStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
