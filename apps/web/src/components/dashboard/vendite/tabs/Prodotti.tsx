'use client'

import * as React from 'react'
import { Package } from 'lucide-react'
import { Card, formatEuro } from '../ui'
import { FilterField, filterBarStyle, filterInputStyle, EmptyState } from '../filters'
import { getProdottiVenduti, type ProdottoVenduto } from '@/lib/actions/vendite'

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

export function Prodotti({ tenantId }: { tenantId: string }) {
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [rows, setRows] = React.useState<ProdottoVenduto[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getProdottiVenduti(tenantId, { dateFrom, dateTo })
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
  }, [tenantId, dateFrom, dateTo])

  return (
    <Card>
      <div style={filterBarStyle}>
        <FilterField label="Da">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={filterInputStyle} />
        </FilterField>
        <FilterField label="A">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={filterInputStyle} />
        </FilterField>
      </div>

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Caricamento...</div>
      ) : rows.length === 0 ? (
        <EmptyState
          Icon={Package}
          title="Nessun prodotto venduto"
          subtitle="Aggiungi prodotti al catalogo per iniziare a tracciare le vendite."
          cta={{ label: 'Vai al Catalogo', href: '/catalogo' }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="desktop-block" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--divider)', textAlign: 'left' }}>
                  <th style={thStyle}>Prodotto</th>
                  <th style={thStyle}>Marca</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qtà venduta</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Scorta</th>
                  <th style={thStyle}>Alert</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.productId}
                    style={{ borderBottom: '1px solid var(--divider)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={tdStyle}>{r.productName}</td>
                    <td style={tdStyle}>{r.brand ?? '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{r.totalQty}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatEuro(r.totalRevenue)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{r.currentStock}</td>
                    <td style={tdStyle}>
                      {r.lowStockAlert && (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 100,
                            fontSize: 12,
                            fontWeight: 600,
                            background: '#FEE2E2',
                            color: 'var(--text-negative)',
                          }}
                        >
                          Scorta bassa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="mobile-block" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.productId}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #F0F0F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {r.productName}
                </div>
                {r.brand && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{r.brand}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Qtà: <strong style={{ color: 'var(--text-primary)' }}>{r.totalQty}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Revenue: <strong style={{ color: 'var(--text-primary)' }}>{formatEuro(r.totalRevenue)}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Scorta: <strong style={{ color: 'var(--text-primary)' }}>{r.currentStock}</strong>
                  </span>
                  {r.lowStockAlert && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        background: '#FEE2E2',
                        color: 'var(--text-negative)',
                        padding: '2px 8px',
                        borderRadius: 100,
                      }}
                    >
                      Scorta bassa
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
