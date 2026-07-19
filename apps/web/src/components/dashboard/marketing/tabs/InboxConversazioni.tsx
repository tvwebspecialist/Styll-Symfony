'use client'

import * as React from 'react'
import { MessageSquare, Search, Bot, User, Users, ArrowLeft, Phone, CheckCheck } from 'lucide-react'
import { getInboxConversations, getInboxMessages, type InboxConversation, type InboxMessage } from '@/lib/actions/inbox'
import { formatTime, formatMsgTime, getInitials } from '../inbox-utils'

type UiInboxMessage = InboxMessage & {
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
}

type SendMessageApiResponse =
  | {
      ok: true
      duplicate: boolean
      message: {
        id: string
        conversationId: string
        bodyText: string
        direction: 'outbound'
        authorKind: 'human'
        createdAt: string
        usedTemplate: false
        deliveryStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
      }
    }
  | {
      ok: false
      error: {
        code: string
        message: string
      }
    }

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Nuovo',
    ai_active: 'AI attiva',
    ai_draft_only: 'AI bozza',
    waiting_customer_input: 'Attende cliente',
    waiting_customer_confirmation: 'Attende conferma',
    waiting_staff_approval: 'Attende staff',
    human_requested: 'Richiede umano',
    human_assigned: 'Assegnato',
    human_active: 'Attivo',
    ai_paused: 'AI in pausa',
    resolved: 'Risolto',
    closed: 'Chiuso',
  }
  return map[status] ?? status
}

function OwnershipBadge({ mode }: { mode: 'ai' | 'human' | 'hybrid' }) {
  const cfg = {
    ai:     { icon: Bot,   color: '#7C3AED', bg: '#EDE9FE', label: 'AI'     },
    human:  { icon: User,  color: '#059669', bg: '#D1FAE5', label: 'Umano'  },
    hybrid: { icon: Users, color: '#D97706', bg: '#FEF3C7', label: 'Ibrido' },
  }[mode]
  const Icon = cfg.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 100, background: cfg.bg }}>
      <Icon size={9} color={cfg.color} />
      <span style={{ fontSize: 9, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cfg.label}</span>
    </span>
  )
}

function appendOrReplaceMessage(
  current: UiInboxMessage[],
  next: UiInboxMessage,
): UiInboxMessage[] {
  const existingIndex = current.findIndex((message) => message.id === next.id)
  if (existingIndex === -1) {
    return [...current, next]
  }

  const cloned = current.slice()
  cloned[existingIndex] = next
  return cloned
}

function updateConversationAfterReply(
  current: InboxConversation[],
  conversationId: string,
  bodyText: string,
  createdAt: string,
): InboxConversation[] {
  const index = current.findIndex((conversation) => conversation.id === conversationId)
  if (index === -1) return current

  const updated: InboxConversation = {
    ...current[index],
    lastMessagePreview: bodyText,
    lastMessageAt: createdAt,
  }

  return [updated, ...current.slice(0, index), ...current.slice(index + 1)]
}

// ── Conversation List Row ─────────────────────────────────────────────────────

function ConvRow({ conv, active, onClick }: { conv: InboxConversation; active: boolean; onClick: () => void }) {
  const initials = getInitials(conv.contactName, conv.contactPhone)
  const displayName = conv.contactName ?? conv.contactPhone ?? 'Sconosciuto'
  const hasUnread = conv.unreadCount > 0

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        width: '100%',
        textAlign: 'left',
        background: active ? '#F0F7F4' : 'transparent',
        border: 'none',
        borderBottom: '1px solid #F3F3F3',
        cursor: 'pointer',
        transition: 'background 100ms ease',
        position: 'relative',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: active ? '#25D366' : '#E8E8E8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 100ms ease',
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: active ? '#fff' : '#555' }}>{initials}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{
            fontSize: 14,
            fontWeight: hasUnread ? 700 : 500,
            color: '#111',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {displayName}
          </span>
          <span style={{ fontSize: 11, color: hasUnread ? '#25D366' : '#B0B0B0', flexShrink: 0, fontWeight: hasUnread ? 600 : 400 }}>
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 2 }}>
          <span style={{
            fontSize: 13,
            color: '#888',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            fontWeight: hasUnread ? 500 : 400,
          }}>
            {conv.lastMessagePreview ?? '…'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <OwnershipBadge mode={conv.ownershipMode} />
            {hasUnread && (
              <span style={{
                background: '#25D366',
                color: '#fff',
                borderRadius: 100,
                minWidth: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                padding: '0 4px',
              }}>
                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: UiInboxMessage }) {
  const isInbound = msg.direction === 'inbound'
  const isSystem = msg.direction === 'system'

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <span style={{
          background: '#F0F0F0',
          color: '#888',
          fontSize: 11,
          borderRadius: 100,
          padding: '4px 12px',
        }}>
          {msg.bodyText ?? '—'}
        </span>
      </div>
    )
  }

  const bubbleBg = isInbound ? '#FFFFFF' : '#DCF8C6'
  const deliveryColor = msg.deliveryStatus === 'failed'
    ? '#EF4444'
    : msg.deliveryStatus === 'pending'
      ? '#94A3B8'
      : '#53BDEB'
  const labelCfg = {
    customer:  { color: '#059669', label: null },
    assistant: { color: '#7C3AED', label: 'AI' },
    human:     { color: '#D97706', label: 'Staff' },
    system:    { color: '#888',    label: 'Sistema' },
  }[msg.authorKind] ?? { color: '#888', label: null }

  return (
    <div style={{
      display: 'flex',
      justifyContent: isInbound ? 'flex-start' : 'flex-end',
      margin: '3px 16px',
    }}>
      <div style={{
        maxWidth: '72%',
        background: bubbleBg,
        borderRadius: isInbound ? '0 16px 16px 16px' : '16px 0 16px 16px',
        padding: '8px 12px 6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        position: 'relative',
      }}>
        {labelCfg.label && (
          <div style={{ fontSize: 10, fontWeight: 700, color: labelCfg.color, marginBottom: 2, letterSpacing: '0.03em' }}>
            {labelCfg.label}
          </div>
        )}
        <p style={{ margin: 0, fontSize: 13.5, color: '#111', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {msg.bodyText ?? '—'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
          <span style={{ fontSize: 10, color: '#B0B0B0' }}>
            {formatMsgTime(msg.createdAt)}
          </span>
          {!isInbound && (
            <CheckCheck size={12} color={deliveryColor} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty States ──────────────────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MessageSquare size={28} color="#25D366" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#222' }}>Nessuna conversazione</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
          Le conversazioni WhatsApp dai tuoi clienti appariranno qui.
        </p>
      </div>
    </div>
  )
}

function SelectConv() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 32, textAlign: 'center', background: '#F7F8FA' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MessageSquare size={32} color="#25D366" strokeWidth={1.5} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#333' }}>Seleziona una conversazione</p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888', maxWidth: 240 }}>
          Clicca su una conversazione a sinistra per leggere i messaggi.
        </p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InboxConversazioni({ tenantId }: { tenantId: string }) {
  const [conversations, setConversations] = React.useState<InboxConversation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [convError, setConvError] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<UiInboxMessage[]>([])
  const [msgLoading, setMsgLoading] = React.useState(false)
  const [msgError, setMsgError] = React.useState(false)
  const [showThread, setShowThread] = React.useState(false)
  const [draft, setDraft] = React.useState('')
  const [sendPending, setSendPending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let cancelled = false

    async function loadConversations() {
      setConvError(false)
      setLoading(true)

      try {
        const data = await getInboxConversations(tenantId)
        if (cancelled) return

        setConversations(data)
        setLoading(false)
      } catch {
        if (cancelled) return

        setConvError(true)
        setLoading(false)
      }
    }

    void loadConversations()
    return () => {
      cancelled = true
    }
  }, [tenantId])

  React.useEffect(() => {
    if (!activeId) return
    const conversationId = activeId

    let cancelled = false

    async function loadMessages() {
      setMsgError(false)
      setMsgLoading(true)
      setMessages([]) // clear stale messages immediately on conversation switch

      try {
        const data = await getInboxMessages(tenantId, conversationId)
        if (cancelled) return

        setMessages(data)
        setMsgLoading(false)
      } catch {
        if (cancelled) return

        setMsgError(true)
        setMsgLoading(false)
      }
    }

    void loadMessages()
    return () => {
      cancelled = true
    }
  }, [tenantId, activeId])

  React.useEffect(() => {
    if (!msgLoading) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, msgLoading])

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.contactName ?? '').toLowerCase().includes(q) ||
      (c.contactPhone ?? '').toLowerCase().includes(q) ||
      (c.lastMessagePreview ?? '').toLowerCase().includes(q)
    )
  })

  const activeConv = conversations.find((c) => c.id === activeId) ?? null
  const canSend = Boolean(activeConv) && draft.trim().length > 0 && !sendPending

  function selectConv(id: string) {
    setActiveId(id)
    setShowThread(true)
    setDraft('')
    setSendError(null)
  }

  async function handleSendMessage() {
    if (!activeConv || !canSend) return

    const conversationId = activeConv.id
    const draftSnapshot = draft
    setSendPending(true)
    setSendError(null)

    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: draftSnapshot }),
      })

      const payload = await response.json() as SendMessageApiResponse
      if (!response.ok || !payload.ok) {
        setSendError(payload.ok ? 'Invio non riuscito.' : payload.error.message)
        return
      }

      const sentMessage: UiInboxMessage = {
        id: payload.message.id,
        bodyText: payload.message.bodyText,
        direction: payload.message.direction,
        authorKind: payload.message.authorKind,
        createdAt: payload.message.createdAt,
        usedTemplate: payload.message.usedTemplate,
        deliveryStatus: payload.message.deliveryStatus,
      }

      setMessages((current) => appendOrReplaceMessage(current, sentMessage))
      setConversations((current) =>
        updateConversationAfterReply(
          current,
          conversationId,
          payload.message.bodyText,
          payload.message.createdAt,
        ))
      setDraft('')
      setSendError(null)
    } catch {
      setSendError('Errore di rete durante l\'invio del messaggio.')
    } finally {
      setSendPending(false)
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    void handleSendMessage()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex',
      height: 640,
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid #E5E5E5',
      background: '#fff',
    }}>
      {/* ── Left panel: conversation list ─────────────────────── */}
      <div style={{
        width: 320,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #EFEFEF',
        // On small screens hide list when thread is shown
      }}
        className={showThread ? 'inbox-panel-list inbox-panel-list--hidden' : 'inbox-panel-list'}
      >
        {/* List header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #EFEFEF', background: '#F7F8FA' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#111' }}>Conversazioni</h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#B0B0B0" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca contatto…"
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                background: '#EFEFEF',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                color: '#222',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* List body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F3F3F3' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#F0F0F0', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 13, background: '#F0F0F0', borderRadius: 6, width: '60%', marginBottom: 6 }} />
                  <div style={{ height: 11, background: '#F5F5F5', borderRadius: 6, width: '85%' }} />
                </div>
              </div>
            ))
          ) : convError ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>Errore caricamento conversazioni.</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyInbox />
          ) : (
            filtered.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                active={conv.id === activeId}
                onClick={() => selectConv(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: message thread ──────────────────────────── */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
        className={showThread ? 'inbox-panel-thread inbox-panel-thread--visible' : 'inbox-panel-thread'}
      >
        {activeConv ? (
          <>
            {/* Thread header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid #EFEFEF',
              background: '#F7F8FA',
            }}>
              {/* Back button (mobile) */}
              <button
                onClick={() => setShowThread(false)}
                className="inbox-back-btn"
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
                aria-label="Torna alla lista"
              >
                <ArrowLeft size={20} color="#333" />
              </button>

              {/* Avatar */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                  {getInitials(activeConv.contactName, activeConv.contactPhone)}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeConv.contactName ?? activeConv.contactPhone ?? 'Sconosciuto'}
                  </span>
                  <OwnershipBadge mode={activeConv.ownershipMode} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  {activeConv.contactPhone && (
                    <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Phone size={10} color="#888" />
                      {activeConv.contactPhone}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: '#B0B0B0' }}>·</span>
                  <span style={{ fontSize: 11, color: '#B0B0B0' }}>{statusLabel(activeConv.status)}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 0',
              background: '#EFEAE2',
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}>
              {msgLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-start' : 'flex-end' }}>
                      <div style={{ width: `${40 + (i * 13) % 30}%`, height: 44, borderRadius: 12, background: i % 2 === 0 ? '#fff' : '#D1F0D8', opacity: 0.7 }} />
                    </div>
                  ))}
                </div>
              ) : msgError ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ fontSize: 13, color: '#EF4444', background: 'rgba(255,255,255,0.8)', padding: '6px 14px', borderRadius: 100 }}>
                    Errore caricamento messaggi. Riprova.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ fontSize: 13, color: '#888', background: 'rgba(255,255,255,0.6)', padding: '6px 14px', borderRadius: 100 }}>
                    Nessun messaggio
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => <MsgBubble key={msg.id} msg={msg} />)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #EFEFEF',
              background: '#F7F8FA',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
              }}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Scrivi una risposta..."
                  disabled={sendPending || !activeConv}
                  rows={1}
                  style={{
                    flex: 1,
                    background: '#fff',
                    border: '1px solid #E5E5E5',
                    borderRadius: 18,
                    padding: '11px 16px',
                    fontSize: 13,
                    color: '#222',
                    minHeight: 44,
                    maxHeight: 120,
                    resize: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                  }}
                />
                <button
                  type="button"
                  onClick={() => { void handleSendMessage() }}
                  disabled={!canSend}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    background: canSend ? '#25D366' : '#CFEFD9',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '11px 16px',
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    minWidth: 78,
                  }}
                >
                  {sendPending ? 'Invio...' : 'Invia'}
                </button>
              </div>
              {sendError && (
                <p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>
                  {sendError}
                </p>
              )}
            </div>
          </>
        ) : (
          <SelectConv />
        )}
      </div>
    </div>
  )
}
