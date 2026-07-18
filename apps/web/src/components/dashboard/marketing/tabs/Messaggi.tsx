'use client'

import * as React from 'react'
import { Inbox, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/dashboard/vendite/ui'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  getMessagesData,
  getSegmentCounts,
  toggleAutomation,
  type MessagesData,
  type MessageAutomation,
  type SegmentCounts,
} from '@/lib/actions/marketing'
import { sendCampaign } from '@/lib/actions/send-campaign'
import { InboxConversazioni } from './InboxConversazioni'

interface MessaggiProps {
  tenantId: string
}

type SubTab = 'automatici' | 'mirato' | 'cronologia' | 'inbox'

const SUB_TABS: { key: SubTab; label: string; icon?: React.ReactNode }[] = [
  { key: 'automatici', label: 'Automatici'    },
  { key: 'mirato',     label: 'Mirato'        },
  { key: 'cronologia', label: 'Cronologia'    },
  { key: 'inbox',      label: 'Inbox',        icon: <MessageCircle size={12} /> },
]


const LOG_DAYS_OPTIONS = [
  { value: '7',  label: 'Ultimi 7 giorni'  },
  { value: '30', label: 'Ultimi 30 giorni' },
  { value: '90', label: 'Ultimi 90 giorni' },
]

// ── Template library per segmento ─────────────────────────────────────────────
const MESSAGE_TEMPLATES: Record<string, string[]> = {
  all: [
    'Ciao! Ti aspettiamo al salone per il tuo prossimo appuntamento ✂️ Prenota ora e scegli il tuo orario preferito!',
    'Il tuo look merita il meglio. Vieni a trovarci e lasciati coccolare dal nostro team. Prenota subito 💈',
    'Novità in salone! Vieni a scoprirle e approfitta della nostra disponibilità questa settimana 🙌',
  ],
  rischio: [
    'Ciao! Sono passati un po\' di giorni dall\'ultima visita — ti aspettiamo per rimetterti in forma 💈 Prenota il tuo appuntamento!',
    'Ci manchi! È il momento perfetto per un taglio fresco. Vieni a trovarci, siamo qui per te 🙌',
    'Hai perso il tuo appuntamento? Nessun problema — siamo ancora qui e ti aspettiamo a braccia aperte ✂️',
  ],
  vip: [
    'Grazie per la tua fedeltà! Come cliente VIP ti riserviamo sempre il meglio. Quando vuoi vederci? 🌟',
    'Sei uno dei nostri clienti di fiducia — vogliamo viziarti. Prenota il prossimo appuntamento con priorità assoluta 💎',
    'Un cliente come te merita un\'esperienza speciale. Ti aspettiamo: il tuo appuntamento è sempre garantito ✨',
  ],
  winback: [
    'Ciao! Sono passati diversi mesi dall\'ultima volta. Ci manchi — torna a trovarci: ti aspetta una sorpresa 🎁',
    'Sei stato lontano troppo a lungo! Torna da noi: il tuo appuntamento è a un click di distanza ✂️',
    'Il salone si è rinnovato e vogliamo che tu sia tra i primi a scoprirlo. Ti aspettiamo 💈',
  ],
}

const templateCursors: Record<string, number> = {}

function pickTemplate(seg: string): string {
  const pool   = MESSAGE_TEMPLATES[seg] ?? MESSAGE_TEMPLATES.all
  const cursor = templateCursors[seg] ?? 0
  const text   = pool[cursor % pool.length]
  templateCursors[seg] = cursor + 1
  return text
}

function buildSegmentOptions(counts: SegmentCounts | null) {
  if (!counts) return [{ value: 'all', label: 'Tutti i clienti' }]
  return [
    { value: 'all',     label: `Tutti i clienti (${counts.total})`      },
    { value: 'rischio', label: `A rischio · 45-90 gg (${counts.rischio})` },
    { value: 'vip',     label: `VIP · 10+ visite (${counts.vip})`        },
    { value: 'winback', label: `Win-back · 90-180 gg (${counts.winback})` },
  ]
}

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
  const [subTab,         setSubTab]         = React.useState<SubTab>('automatici')
  const [data,           setData]           = React.useState<MessagesData | null>(null)
  const [loading,        setLoading]        = React.useState(true)
  const [logDays,        setLogDays]        = React.useState(30)
  const [segment,        setSegment]        = React.useState('all')
  const [message,        setMessage]        = React.useState('')
  const [segmentCounts,  setSegmentCounts]  = React.useState<SegmentCounts | null>(null)
  const [aiLoading,      setAiLoading]      = React.useState(false)
  const [sendLoading,    setSendLoading]    = React.useState(false)

  async function handleSend() {
    if (!message.trim() || sendLoading) return
    setSendLoading(true)
    try {
      const result = await sendCampaign({ tenantId, segment: segment as 'all' | 'rischio' | 'vip' | 'winback', message })
      toast.success(`Messaggio inviato a ${result.sent} client${result.sent === 1 ? 'e' : 'i'}`)
      if (result.failed > 0) {
        toast.warning(`${result.failed} invio${result.failed === 1 ? '' : 'i'} non riuscit${result.failed === 1 ? 'o' : 'i'}`)
      }
      setMessage('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante l\'invio')
    } finally {
      setSendLoading(false)
    }
  }

  function handleAI() {
    setAiLoading(true)
    setTimeout(() => {
      setMessage(pickTemplate(segment))
      setAiLoading(false)
    }, 600)
  }

  React.useEffect(() => {
    getSegmentCounts(tenantId)
      .then(setSegmentCounts)
      .catch((err) => console.error('[Messaggi] error:', err))
  }, [tenantId])

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
    toggleAutomation(automation.id, newActive)
      .then((res) => {
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
      .catch((err) => console.error('[Messaggi] error:', err))
  }

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
                display:      'flex',
                alignItems:   'center',
                gap:          5,
              }}
            >
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Automatici ─────────────────────────────────────────── */}
      {subTab === 'automatici' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            [0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ background: '#F4F4F4', borderRadius: 12, height: 72 }}
              />
            ))
          ) : (
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
            <CustomSelect
              value={segment}
              onChange={setSegment}
              options={buildSegmentOptions(segmentCounts)}
            />
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
                onClick={handleAI}
                disabled={aiLoading}
                style={{
                  padding: '8px 14px', fontSize: 13, cursor: aiLoading ? 'default' : 'pointer',
                  opacity: aiLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'opacity 150ms',
                }}
              >
                {aiLoading ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Generazione…
                  </>
                ) : (
                  <>✦ Genera con AI</>
                )}
              </button>
              <button
                className="styll-btn-primary"
                onClick={handleSend}
                disabled={sendLoading || !message.trim()}
                style={{
                  padding:    '8px 20px',
                  fontSize:   13,
                  cursor:     sendLoading || !message.trim() ? 'default' : 'pointer',
                  opacity:    sendLoading || !message.trim() ? 0.6 : 1,
                  display:    'flex',
                  alignItems: 'center',
                  gap:        6,
                  transition: 'opacity 150ms',
                }}
              >
                {sendLoading ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Invio…
                  </>
                ) : (
                  'Invia'
                )}
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
            <CustomSelect
              compact
              value={String(logDays)}
              onChange={(v) => setLogDays(Number(v))}
              options={LOG_DAYS_OPTIONS}
            />
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

      {/* ── Inbox ───────────────────────────────────────────────── */}
      {subTab === 'inbox' && (
        <InboxConversazioni tenantId={tenantId} />
      )}

    </div>
  )
}
