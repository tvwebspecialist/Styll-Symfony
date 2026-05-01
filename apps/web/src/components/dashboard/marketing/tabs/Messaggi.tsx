'use client'

import * as React from 'react'
import { Bell, Heart, Star, Inbox } from 'lucide-react'
import { Card } from '@/components/dashboard/vendite/ui'
import {
  getMessagesData,
  toggleAutomation,
  type MessagesData,
  type MessageAutomation,
} from '@/lib/actions/marketing'

interface MessaggiProps {
  tenantId: string
}

type SubTab = 'automatici' | 'mirato' | 'cronologia'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'automatici', label: 'Automatici'  },
  { key: 'mirato',     label: 'Mirato'      },
  { key: 'cronologia', label: 'Cronologia'  },
]

/* Default cards shown as fallback when no automations exist in DB */
interface DefaultCard {
  Icon:      React.ComponentType<{ size?: number; color?: string }>
  iconBg:    string
  iconColor: string
  title:     string
  subtitle:  string
  defaultOn: boolean
}
const DEFAULT_CARDS: DefaultCard[] = [
  { Icon: Bell,  iconBg: '#FFF7ED', iconColor: '#EA580C', title: 'Promemoria appuntamento', subtitle: '24h prima · WhatsApp/SMS',            defaultOn: true  },
  { Icon: Heart, iconBg: '#FDF2F8', iconColor: '#DB2777', title: 'Grazie post-visita',       subtitle: '2h dopo l\'appuntamento',              defaultOn: true  },
  { Icon: Star,  iconBg: '#F0FDF4', iconColor: '#16A34A', title: 'Richiesta recensione',     subtitle: '48h dopo · solo se nessuna risposta', defaultOn: false },
]

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      role="switch"
      aria-checked={on}
      title={disabled ? 'Configura dal pannello admin' : undefined}
      style={{
        width:        44,
        height:       24,
        borderRadius: 100,
        cursor:       disabled ? 'not-allowed' : 'pointer',
        background:   on ? '#222222' : '#E0E0E0',
        position:     'relative',
        transition:   'background 200ms ease',
        flexShrink:   0,
        opacity:      disabled ? 0.4 : 1,
      }}
    >
      <div
        style={{
          position:     'absolute',
          top:          3,
          left:         on ? 23 : 3,
          width:        18,
          height:       18,
          borderRadius: 100,
          background:   '#FFFFFF',
          transition:   'left 200ms ease',
          boxShadow:    '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  )
}

export function Messaggi({ tenantId }: MessaggiProps) {
  const [subTab,   setSubTab]   = React.useState<SubTab>('automatici')
  const [data,     setData]     = React.useState<MessagesData | null>(null)
  const [loading,  setLoading]  = React.useState(true)
  const [logDays,  setLogDays]  = React.useState(30)
  const [message,  setMessage]  = React.useState('')

  /* Default-card toggles (local-only — no DB table exists) */
  const [defaultToggles, setDefaultToggles] = React.useState<boolean[]>(
    DEFAULT_CARDS.map((c) => c.defaultOn)
  )

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMessagesData(tenantId, logDays)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tenantId, logDays])

  /* Optimistic toggle for real automations */
  function handleToggle(automation: MessageAutomation) {
    const newActive = !automation.isActive
    setData((prev) =>
      prev
        ? { ...prev, automations: prev.automations.map((a) =>
            a.id === automation.id ? { ...a, isActive: newActive } : a) }
        : prev
    )
    toggleAutomation(automation.id, newActive).then((res) => {
      if (!res.success) {
        // Rollback on failure
        setData((prev) =>
          prev
            ? { ...prev, automations: prev.automations.map((a) =>
                a.id === automation.id ? { ...a, isActive: !newActive } : a) }
            : prev
        )
      }
    })
  }

  const hasRealAutomations = (data?.automations.length ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Sub-tab bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUB_TABS.map((t) => {
          const isActive = subTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                padding:      '7px 14px',
                borderRadius: 100,
                fontSize:     13,
                fontWeight:   500,
                cursor:       'pointer',
                border:       isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                background:   isActive ? '#222222' : '#FFFFFF',
                color:        isActive ? '#FFFFFF' : '#222222',
                transition:   'all 120ms ease',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Automatici ─────────────────────────────────────────── */}
      {subTab === 'automatici' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            /* Skeleton */
            [0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background:   '#F4F4F4',
                  borderRadius: 12,
                  height:       72,
                  marginBottom: i < 2 ? 0 : 0,
                }}
              />
            ))
          ) : hasRealAutomations ? (
            /* Real automations */
            (data?.automations ?? []).map((auto) => (
              <Card
                key={auto.id}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#222222' }}>
                    {auto.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B0B0B0' }}>
                    {auto.timing} · {auto.channel}
                  </p>
                </div>
                <Toggle on={auto.isActive} onToggle={() => handleToggle(auto)} />
              </Card>
            ))
          ) : (
            /* Default disabled fallback */
            DEFAULT_CARDS.map((card, i) => (
              <Card
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
              >
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 100,
                    background: card.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <card.Icon size={20} color={card.iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#222222' }}>
                    {card.title}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B0B0B0' }}>
                    {card.subtitle}
                  </p>
                </div>
                <Toggle
                  on={defaultToggles[i]}
                  onToggle={() => {
                    const next = [...defaultToggles]
                    next[i] = !next[i]
                    setDefaultToggles(next)
                  }}
                  disabled
                />
              </Card>
            ))
          )}

          <p
            style={{
              margin:       0,
              fontSize:     12,
              color:        '#B0B0B0',
              padding:      12,
              background:   '#F9F9F9',
              borderRadius: 8,
            }}
          >
            Inviati solo ai clienti con consenso marketing attivo.
          </p>
        </div>
      )}

      {/* ── Mirato ──────────────────────────────────────────────── */}
      {subTab === 'mirato' && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
          <div>
            <label
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#222222', marginBottom: 8 }}
            >
              Segmento destinatari
            </label>
            <select
              className="styll-input"
              style={{ padding: '10px 14px', width: '100%', fontSize: 14, cursor: 'pointer' }}
            >
              <option>Tutti i clienti (142)</option>
              <option>A rischio · 45-90 gg (8)</option>
              <option>VIP · 10+ visite (23)</option>
              <option>Win-back · 90-180 gg (5)</option>
            </select>
          </div>

          <div>
            <label
              style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#222222', marginBottom: 8 }}
            >
              Messaggio
            </label>
            <textarea
              className="styll-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
              placeholder="Scrivi il tuo messaggio... oppure usa l'AI per generarlo"
              style={{
                padding:    '10px 14px',
                width:      '100%',
                minHeight:  96,
                resize:     'vertical',
                fontSize:   14,
                fontFamily: 'inherit',
                boxSizing:  'border-box',
              }}
            />
          </div>

          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              flexWrap:       'wrap',
              gap:            8,
            }}
          >
            <span style={{ fontSize: 12, color: '#B0B0B0' }}>{message.length} / 160</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="styll-btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                Anteprima AI
              </button>
              {/* TODO: send action */}
              <button
                className="styll-btn-primary"
                style={{ padding: '8px 20px', fontSize: 13, cursor: 'pointer' }}
              >
                Invia
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Cronologia ──────────────────────────────────────────── */}
      {subTab === 'cronologia' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '16px 20px',
              borderBottom:   '1px solid #F0F0F0',
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222222' }}>
              Ultimi messaggi
            </p>
            <select
              value={String(logDays)}
              onChange={(e) => setLogDays(Number(e.target.value))}
              style={{
                background:   '#F5F5F5',
                border:       'none',
                borderRadius: 8,
                padding:      '6px 10px',
                fontSize:     13,
                color:        '#222222',
                cursor:       'pointer',
              }}
            >
              <option value="7">Ultimi 7 giorni</option>
              <option value="30">Ultimi 30 giorni</option>
              <option value="90">Ultimi 90 giorni</option>
            </select>
          </div>

          {loading ? (
            /* Skeleton rows */
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ background: '#F4F4F4', borderRadius: 8, height: 36 }} />
              ))}
            </div>
          ) : !data || data.log.length === 0 ? (
            /* Empty state */
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Inbox size={32} color="#B0B0B0" />
              <p style={{ margin: '12px 0 0', fontSize: 14, color: '#B0B0B0' }}>
                Nessun messaggio inviato nel periodo selezionato.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9F9F9' }}>
                  {['Data', 'Tipo', 'Destinatario', 'Stato'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign:     'left',
                        padding:       '10px 16px',
                        fontSize:      11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color:         '#B0B0B0',
                        fontWeight:    500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.log.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#222222', borderBottom: '1px solid #F5F5F5' }}>
                      {new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(row.sentAt))}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#222222', borderBottom: '1px solid #F5F5F5' }}>
                      {row.type}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#B0B0B0', borderBottom: '1px solid #F5F5F5' }}>
                      {row.recipient}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #F5F5F5' }}>
                      <span
                        style={{
                          background:   row.status === 'sent' ? '#F0FDF4' : '#FFF7ED',
                          color:        row.status === 'sent' ? '#16A34A' : '#9A3412',
                          borderRadius: 100,
                          padding:      '3px 10px',
                          fontSize:     11,
                          fontWeight:   600,
                        }}
                      >
                        {row.status === 'sent' ? 'Inviato' : 'In coda'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

    </div>
  )
}
