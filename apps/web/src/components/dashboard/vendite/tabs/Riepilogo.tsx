'use client'

import * as React from 'react'
import { TrendingUp, Calendar, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, formatEuro } from '../ui'
import { getRiepilogo, type RiepilogoData } from '@/lib/actions/vendite'

interface KpiCardProps {
  label: string
  value: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
  iconBg: string
  iconColor: string
}

function KpiCard({ label, value, Icon, iconBg, iconColor }: KpiCardProps) {
  const [hover, setHover] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#FFFFFF',
        border: '1px solid #F0F0F0',
        borderRadius: 16,
        padding: 20,
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(10,13,18,0.04)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 100,
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={20} color={iconColor} />
      </div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#B0B0B0',
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#222222', lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#B0B0B0',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#222222' }}>{value}</div>
    </div>
  )
}

export function Riepilogo({ tenantId }: { tenantId: string }) {
  const [data, setData] = React.useState<RiepilogoData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getRiepilogo(tenantId)
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
  }, [tenantId])

  if (loading || !data) {
    return (
      <div className="vendite-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <Card key={i} style={{ height: 140 }}>
            <div style={{ background: '#F4F4F4', height: 40, width: 40, borderRadius: 100 }} />
            <div style={{ background: '#F4F4F4', height: 12, width: '40%', borderRadius: 4, marginTop: 16 }} />
            <div style={{ background: '#F4F4F4', height: 28, width: '60%', borderRadius: 6, marginTop: 12 }} />
          </Card>
        ))}
      </div>
    )
  }

  const positive = data.deltaPercentuale >= 0
  const ArrowIcon = positive ? ArrowUpRight : ArrowDownRight
  const deltaBg = positive ? '#F0FDF4' : '#FFF2F2'
  const deltaColor = positive ? '#16A34A' : '#DC2626'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="vendite-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <KpiCard
          label="Revenue Oggi"
          value={formatEuro(data.revenueOggi)}
          Icon={TrendingUp}
          iconBg="#F0FDF4"
          iconColor="#16A34A"
        />
        <KpiCard
          label="Revenue Settimana"
          value={formatEuro(data.revenueSettimana)}
          Icon={Calendar}
          iconBg="#EFF6FF"
          iconColor="#2563EB"
        />
        <KpiCard
          label="Scontrino Medio"
          value={formatEuro(data.scontrinoMedio)}
          Icon={Receipt}
          iconBg="#FFF7ED"
          iconColor="#EA580C"
        />
      </div>

      <div
        className="vendite-mese-card"
        style={{
          background: '#FFFFFF',
          border: '1px solid #F0F0F0',
          borderRadius: 16,
          padding: 24,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#B0B0B0',
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            Revenue Mese Corrente
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#222222', lineHeight: 1 }}>
            {formatEuro(data.revenueMese)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 100,
                background: deltaBg,
                color: deltaColor,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <ArrowIcon size={14} color={deltaColor} />
              {data.deltaPercentuale > 0 ? '+' : ''}
              {data.deltaPercentuale.toFixed(1)}%
            </span>
            <span style={{ fontSize: 13, color: '#B0B0B0' }}>
              vs {formatEuro(data.revenueMesePrecedente)} mese precedente
            </span>
          </div>
        </div>

        <div
          className="vendite-mese-stats"
          style={{
            borderLeft: '1px solid #F0F0F0',
            paddingLeft: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            alignContent: 'center',
          }}
        >
          <MiniStat label="Servizi" value={formatEuro(data.revenueServizi)} />
          <MiniStat label="Prodotti" value={formatEuro(data.revenueProdotti)} />
          <MiniStat label="App. Oggi" value={String(data.appuntamentiCompletatiOggi)} />
        </div>

        {data.topServizio && (
          <div
            style={{
              gridColumn: '1 / -1',
              borderTop: '1px solid #F0F0F0',
              paddingTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#B0B0B0',
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              Servizio Top del Mese
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#222222' }}>
              {data.topServizio.name}{' '}
              <span style={{ color: '#B0B0B0', fontWeight: 500, fontSize: 13 }}>
                · {data.topServizio.count} prenotazioni
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
