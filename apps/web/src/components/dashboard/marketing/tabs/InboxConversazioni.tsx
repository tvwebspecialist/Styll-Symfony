'use client'

import * as React from 'react'
import { MessageSquare, Search, Bot, User, Users, ArrowLeft, Phone, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  approveInboxDraftApproval,
  createInboxDraftApprovalState,
  discardInboxDraftApproval,
  editInboxDraftApprovalText,
  type InboxDraftApprovalState,
} from '@/lib/ai/inbox-draft-approval-core'
import type { PublicInboxDraftResult } from '@/lib/ai/inbox-draft-orchestrator'
import {
  getInboxConversations,
  getInboxLatestAiRuntime,
  getInboxMessages,
  type InboxConversation,
  type InboxLatestAiRuntime,
  type InboxMessage,
} from '@/lib/actions/inbox'
import {
  buildInboxRealtimeTenantFilter,
  extractRealtimeConversationId,
  shouldRefreshInboxMessagesFromLog,
} from '@/lib/messaging/inbox-realtime'
import { formatTime, formatMsgTime, getInitials } from '../inbox-utils'

type UiInboxMessage = InboxMessage & {
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
}

type OwnershipAction = 'take_control' | 'release_control' | 'return_to_ai'

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
        authorName: string | null
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

type InternalNoteApiResponse =
  | {
      ok: true
      note: {
        id: string
        conversationId: string
        bodyText: string
        direction: 'system'
        authorKind: 'human'
        authorStaffId: string
        authorName: string | null
        createdAt: string
        usedTemplate: false
        timelineKind: 'internal_note'
      }
    }
  | {
      ok: false
      error: {
        code: string
        message: string
      }
    }

type GenerateDraftApiResponse =
  | {
      ok: true
      draft: PublicInboxDraftResult
    }
  | {
      ok: false
      error: {
        code: string
        message: string
      }
    }

type DraftDecisionPayload = Extract<GenerateDraftApiResponse, { ok: true }>['draft']['decision']
type AppointmentPreparationPayload = NonNullable<DraftDecisionPayload['appointmentPreparation']>

type OwnershipApiResponse =
  | {
      ok: true
      changed: boolean
      conversation: {
        conversationId: string
        status: InboxConversation['status']
        ownershipMode: InboxConversation['ownershipMode']
        assignedStaffId: string | null
        aiPausedAt: string | null
      }
      actor: {
        staffId: string
        displayName: string | null
        role: string
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

function decisionLabel(kind: DraftDecisionPayload['kind']): string {
  const map = {
    draft_review: 'Bozza con revisione umana',
    human_handoff: 'Handoff consigliato',
    auto_reply_candidate: 'FAQ candidata',
    action_prepare_candidate: 'Azione preparabile',
    blocked: 'Bloccata',
  } as const

  return map[kind]
}

function decisionAccent(kind: DraftDecisionPayload['kind']) {
  switch (kind) {
    case 'human_handoff':
      return { color: '#B45309', background: '#FFFBEB', border: '#FCD34D' }
    case 'auto_reply_candidate':
      return { color: '#065F46', background: '#ECFDF5', border: '#A7F3D0' }
    case 'action_prepare_candidate':
      return { color: '#1D4ED8', background: '#EFF6FF', border: '#BFDBFE' }
    case 'blocked':
      return { color: '#B91C1C', background: '#FEF2F2', border: '#FECACA' }
    case 'draft_review':
    default:
      return { color: '#6D28D9', background: '#F5F3FF', border: '#DDD6FE' }
  }
}

function appointmentFieldLabel(field: AppointmentPreparationPayload['missingFields'][number]): string {
  switch (field) {
    case 'service':
      return 'servizio'
    case 'requested_date':
      return 'data richiesta'
    case 'requested_time':
      return 'orario richiesto'
    case 'current_appointment_reference':
      return 'riferimento appuntamento attuale'
  }
}

function aiRuntimeStatusLabel(status: InboxLatestAiRuntime['status']): string {
  switch (status) {
    case 'queued':
      return 'Bozza AI in coda'
    case 'started':
      return 'Bozza AI in elaborazione'
    case 'failed':
      return 'Bozza AI non riuscita'
    case 'blocked':
      return 'Bozza AI bloccata'
    case 'skipped':
      return 'Bozza AI non eseguita'
    case 'completed':
    default:
      return 'Bozza AI pronta'
  }
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

function deliveryStatusLabel(status: UiInboxMessage['deliveryStatus']): string {
  switch (status) {
    case 'pending':
      return 'In coda'
    case 'delivered':
      return 'Consegnato'
    case 'read':
      return 'Letto'
    case 'failed':
      return 'Fallito'
    case 'sent':
    default:
      return 'Inviato'
  }
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

function patchConversation(
  current: InboxConversation[],
  conversationId: string,
  patch: Partial<InboxConversation>,
): InboxConversation[] {
  const index = current.findIndex((conversation) => conversation.id === conversationId)
  if (index === -1) return current

  const updated: InboxConversation = {
    ...current[index],
    ...patch,
  }

  return [updated, ...current.slice(0, index), ...current.slice(index + 1)]
}

function updateConversationAfterReply(
  current: InboxConversation[],
  input: {
    conversationId: string
    bodyText: string
    createdAt: string
    authorName: string | null
  },
): InboxConversation[] {
  const conversation = current.find((item) => item.id === input.conversationId)
  if (!conversation) return current

  return patchConversation(current, input.conversationId, {
    lastMessagePreview: input.bodyText,
    lastMessageAt: input.createdAt,
    status: 'human_active',
    ownershipMode: 'human',
    assignedStaffId: conversation.assignedStaffId ?? '__optimistic_self__',
    assignedStaffName: input.authorName ?? conversation.assignedStaffName ?? 'Tu',
    aiPausedAt: conversation.aiPausedAt ?? input.createdAt,
  })
}

function getOptimisticOwnershipPatch(
  conversation: InboxConversation,
  action: OwnershipAction,
): Partial<InboxConversation> {
  const now = new Date().toISOString()

  switch (action) {
    case 'take_control':
      return {
        status: 'human_assigned',
        ownershipMode: 'human',
        assignedStaffId: conversation.assignedStaffId ?? '__optimistic_self__',
        assignedStaffName: conversation.assignedStaffName ?? 'Tu',
        aiPausedAt: conversation.aiPausedAt ?? now,
      }
    case 'release_control':
      return {
        status: 'ai_paused',
        ownershipMode: 'hybrid',
        assignedStaffId: null,
        assignedStaffName: null,
        aiPausedAt: now,
      }
    case 'return_to_ai':
      return {
        status: 'ai_active',
        ownershipMode: 'ai',
        assignedStaffId: null,
        assignedStaffName: null,
        aiPausedAt: null,
      }
  }
}

function getPersistedOwnershipPatch(
  response: Extract<OwnershipApiResponse, { ok: true }>,
): Partial<InboxConversation> {
  return {
    status: response.conversation.status,
    ownershipMode: response.conversation.ownershipMode,
    assignedStaffId: response.conversation.assignedStaffId,
    assignedStaffName: response.conversation.assignedStaffId
      ? response.actor.displayName ?? 'Operatore'
      : null,
    aiPausedAt: response.conversation.aiPausedAt,
  }
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
        {(conv.assignedStaffName || conv.aiPausedAt) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {conv.assignedStaffName && (
              <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                In carico: {conv.assignedStaffName}
              </span>
            )}
            {conv.aiPausedAt && (
              <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>
                AI in pausa
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: UiInboxMessage }) {
  const isInbound = msg.direction === 'inbound'
  const isAudit = msg.timelineKind === 'conversation_audit'
  const isInternalNote = msg.timelineKind === 'internal_note'

  if (isAudit) {
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

  if (isInternalNote) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px', margin: '10px 0' }}>
        <div style={{
          width: 'min(100%, 420px)',
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: 14,
          padding: '10px 12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#C2410C', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Nota interna
            </span>
            <span style={{ fontSize: 10, color: '#9A3412' }}>
              {formatMsgTime(msg.createdAt)}
            </span>
          </div>
          {msg.authorName && (
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', marginBottom: 4 }}>
              {msg.authorName}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: '#7C2D12', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {msg.bodyText ?? '—'}
          </p>
        </div>
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
    human:     { color: '#D97706', label: msg.authorName ?? 'Operatore' },
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
            <>
              <span style={{ fontSize: 10, color: deliveryColor, fontWeight: 600 }}>
                {deliveryStatusLabel(msg.deliveryStatus)}
              </span>
              <CheckCheck size={12} color={deliveryColor} aria-label={deliveryStatusLabel(msg.deliveryStatus)} />
            </>
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
  const [noteDraft, setNoteDraft] = React.useState('')
  const [notePending, setNotePending] = React.useState(false)
  const [noteError, setNoteError] = React.useState<string | null>(null)
  const [showNoteComposer, setShowNoteComposer] = React.useState(false)
  const [aiDraft, setAiDraft] = React.useState<InboxDraftApprovalState | null>(null)
  const [latestAiRuntime, setLatestAiRuntime] = React.useState<InboxLatestAiRuntime | null>(null)
  const [aiDraftPending, setAiDraftPending] = React.useState(false)
  const [aiDraftError, setAiDraftError] = React.useState<string | null>(null)
  const [sendPending, setSendPending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [ownershipPending, setOwnershipPending] = React.useState<OwnershipAction | null>(null)
  const [ownershipError, setOwnershipError] = React.useState<string | null>(null)
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
      setLatestAiRuntime(null)

      try {
        const [messageData, latestRuntime] = await Promise.all([
          getInboxMessages(tenantId, conversationId),
          getInboxLatestAiRuntime(tenantId, conversationId),
        ])
        if (cancelled) return

        setMessages(messageData)
        setLatestAiRuntime(latestRuntime)
        setAiDraft((current) => {
          if (current || !latestRuntime || latestRuntime.status !== 'completed' || !latestRuntime.text || !latestRuntime.decision || !latestRuntime.providerLabel || !latestRuntime.promptId || !latestRuntime.promptVersion) {
            return current
          }

          return createInboxDraftApprovalState({
            text: latestRuntime.text,
            promptId: latestRuntime.promptId,
            promptVersion: latestRuntime.promptVersion,
            providerLabel: latestRuntime.providerLabel,
            usedAuthoritativeKnowledge: latestRuntime.usedAuthoritativeKnowledge,
            sources: latestRuntime.sources,
            decision: latestRuntime.decision,
          })
        })
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

  React.useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()
    const tenantFilter = buildInboxRealtimeTenantFilter(tenantId)

    async function refreshConversations() {
      try {
        const data = await getInboxConversations(tenantId)
        setConvError(false)
        setConversations(data)
      } catch {
        setConvError(true)
      }
    }

    async function refreshMessages(conversationId: string) {
      try {
        const data = await getInboxMessages(tenantId, conversationId)
        setMsgError(false)
        setMessages(data)
      } catch {
        setMsgError(true)
      }
    }

    async function refreshAiRuntime(conversationId: string) {
      try {
        const data = await getInboxLatestAiRuntime(tenantId, conversationId)
        setLatestAiRuntime(data)
        setAiDraft((current) => {
          if (current || !data || data.status !== 'completed' || !data.text || !data.decision || !data.providerLabel || !data.promptId || !data.promptVersion) {
            return current
          }

          return createInboxDraftApprovalState({
            text: data.text,
            promptId: data.promptId,
            promptVersion: data.promptVersion,
            providerLabel: data.providerLabel,
            usedAuthoritativeKnowledge: data.usedAuthoritativeKnowledge,
            sources: data.sources,
            decision: data.decision,
          })
        })
      } catch {
        // Keep the current UI state if the runtime snapshot refresh fails.
      }
    }

    const channel = supabase
      .channel(`inbox:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_conversations',
          filter: tenantFilter,
        },
        (payload) => {
          const conversationId = extractRealtimeConversationId(payload.new ?? payload.old)
          void refreshConversations()

          if (activeId && conversationId === activeId) {
            void refreshMessages(activeId)
            void refreshAiRuntime(activeId)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inbox_messages',
          filter: tenantFilter,
        },
        (payload) => {
          const conversationId = extractRealtimeConversationId(payload.new)
          void refreshConversations()

          if (activeId && conversationId === activeId) {
            void refreshMessages(activeId)
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages_log',
          filter: tenantFilter,
        },
        (payload) => {
          const row = payload.new ?? payload.old
          const conversationId = extractRealtimeConversationId(row)
          if (!activeId || conversationId !== activeId) {
            return
          }

          if (!shouldRefreshInboxMessagesFromLog(row)) {
            return
          }

          void refreshMessages(activeId)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_ai_runs',
          filter: tenantFilter,
        },
        (payload) => {
          const conversationId = extractRealtimeConversationId(payload.new ?? payload.old)
          if (!activeId || conversationId !== activeId) {
            return
          }

          void refreshAiRuntime(activeId)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [tenantId, activeId])

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
  const showTakeControl = activeConv
    ? !(activeConv.assignedStaffId && activeConv.ownershipMode === 'human')
    : false
  const showRelease = Boolean(activeConv?.assignedStaffId)
  const showReturnToAi = activeConv
    ? activeConv.status === 'ai_paused' || activeConv.ownershipMode === 'human'
    : false

  function selectConv(id: string) {
    setActiveId(id)
    setShowThread(true)
    setDraft('')
    setNoteDraft('')
    setNoteError(null)
    setShowNoteComposer(false)
    setAiDraft(null)
    setLatestAiRuntime(null)
    setAiDraftError(null)
    setSendError(null)
    setOwnershipError(null)
  }

  async function handleOwnershipAction(action: OwnershipAction) {
    if (!activeConv || ownershipPending) return

    const conversationId = activeConv.id
    const previousConversations = conversations
    const optimisticPatch = getOptimisticOwnershipPatch(activeConv, action)

    setOwnershipPending(action)
    setOwnershipError(null)
    setConversations((current) => patchConversation(current, conversationId, optimisticPatch))

    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      })

      const payload = await response.json() as OwnershipApiResponse
      if (!response.ok || !payload.ok) {
        setConversations(previousConversations)
        setOwnershipError(payload.ok ? 'Aggiornamento non riuscito.' : payload.error.message)
        return
      }

      setConversations((current) =>
        patchConversation(current, conversationId, getPersistedOwnershipPatch(payload))
      )
    } catch {
      setConversations(previousConversations)
      setOwnershipError('Errore di rete durante l\'aggiornamento della conversazione.')
    } finally {
      setOwnershipPending(null)
    }
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
        authorName: payload.message.authorName,
        authorStaffId: activeConv.assignedStaffId,
        createdAt: payload.message.createdAt,
        usedTemplate: payload.message.usedTemplate,
        timelineKind: 'message',
        deliveryStatus: payload.message.deliveryStatus,
      }

      setMessages((current) => appendOrReplaceMessage(current, sentMessage))
      setConversations((current) =>
        updateConversationAfterReply(current, {
          conversationId,
          bodyText: payload.message.bodyText,
          createdAt: payload.message.createdAt,
          authorName: payload.message.authorName,
        }))
      setDraft('')
      setSendError(null)
    } catch {
      setSendError('Errore di rete durante l\'invio del messaggio.')
    } finally {
      setSendPending(false)
    }
  }

  async function handleSaveNote() {
    if (!activeConv || notePending || noteDraft.trim().length === 0) return

    const conversationId = activeConv.id
    const draftSnapshot = noteDraft

    setNotePending(true)
    setNoteError(null)

    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: draftSnapshot }),
      })

      const payload = await response.json() as InternalNoteApiResponse
      if (!response.ok || !payload.ok) {
        setNoteError(payload.ok ? 'Salvataggio nota non riuscito.' : payload.error.message)
        return
      }

      setMessages((current) =>
        appendOrReplaceMessage(current, {
          ...payload.note,
          deliveryStatus: undefined,
          auditAction: null,
        }))
      setNoteDraft('')
      setNoteError(null)
      setShowNoteComposer(false)
    } catch {
      setNoteError('Errore di rete durante il salvataggio della nota interna.')
    } finally {
      setNotePending(false)
    }
  }

  async function handleGenerateAiDraft() {
    if (!activeConv || aiDraftPending) return

    const conversationId = activeConv.id
    setAiDraftPending(true)
    setAiDraftError(null)

    try {
      const response = await fetch(`/api/inbox/conversations/${conversationId}/draft`, {
        method: 'POST',
      })

      const payload = await response.json() as GenerateDraftApiResponse
      if (!response.ok || !payload.ok) {
        setAiDraftError(payload.ok ? 'Generazione bozza non riuscita.' : payload.error.message)
        return
      }

      setAiDraft(createInboxDraftApprovalState(payload.draft))
    } catch {
      setAiDraftError('Errore di rete durante la generazione della bozza AI.')
    } finally {
      setAiDraftPending(false)
    }
  }

  function handleApproveAiDraft() {
    if (!aiDraft) return

    const approval = approveInboxDraftApproval(aiDraft)
    setDraft(approval.composerText)
    setAiDraft(approval.nextDraft)
    setAiDraftError(null)
  }

  function handleDiscardAiDraft() {
    setAiDraft(discardInboxDraftApproval())
    setAiDraftError(null)
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    void handleSendMessage()
  }

  function handleNoteComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    if (!(event.metaKey || event.ctrlKey)) {
      return
    }

    event.preventDefault()
    void handleSaveNote()
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
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#B0B0B0' }}>{statusLabel(activeConv.status)}</span>
                  {activeConv.assignedStaffName && (
                    <span style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                      Operatore: {activeConv.assignedStaffName}
                    </span>
                  )}
                  {activeConv.aiPausedAt && (
                    <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>
                      AI pausata
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid #EFEFEF',
              background: '#FCFCFD',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              {showTakeControl && (
                <button
                  type="button"
                  onClick={() => { void handleOwnershipAction('take_control') }}
                  disabled={ownershipPending !== null}
                  aria-label="Prendi in carico la conversazione"
                  style={{
                    border: '1px solid #D1D5DB',
                    borderRadius: 999,
                    background: '#FFFFFF',
                    color: '#111827',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 12px',
                    cursor: ownershipPending ? 'wait' : 'pointer',
                  }}
                >
                  {ownershipPending === 'take_control' ? 'Presa in corso...' : 'Prendi in carico'}
                </button>
              )}
              {showRelease && (
                <button
                  type="button"
                  onClick={() => { void handleOwnershipAction('release_control') }}
                  disabled={ownershipPending !== null}
                  aria-label="Rilascia la conversazione"
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 999,
                    background: '#FFF7ED',
                    color: '#C2410C',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 12px',
                    cursor: ownershipPending ? 'wait' : 'pointer',
                  }}
                >
                  {ownershipPending === 'release_control' ? 'Rilascio...' : 'Rilascia'}
                </button>
              )}
              {showReturnToAi && (
                <button
                  type="button"
                  onClick={() => { void handleOwnershipAction('return_to_ai') }}
                  disabled={ownershipPending !== null}
                  aria-label="Restituisci la conversazione all'AI"
                  style={{
                    border: '1px solid #DDD6FE',
                    borderRadius: 999,
                    background: '#F5F3FF',
                    color: '#6D28D9',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 12px',
                    cursor: ownershipPending ? 'wait' : 'pointer',
                  }}
                >
                  {ownershipPending === 'return_to_ai' ? 'Aggiorno AI...' : 'Rimetti in AI'}
                </button>
              )}
              <button
                type="button"
                onClick={() => { void handleGenerateAiDraft() }}
                disabled={aiDraftPending}
                aria-label="Genera una bozza AI da revisionare"
                style={{
                  border: '1px solid #DDD6FE',
                  borderRadius: 999,
                  background: '#F5F3FF',
                  color: '#6D28D9',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 12px',
                  cursor: aiDraftPending ? 'wait' : 'pointer',
                }}
              >
                {aiDraftPending ? 'Genero bozza...' : 'Genera bozza AI'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNoteComposer((current) => !current)
                  setNoteError(null)
                }}
                disabled={notePending}
                aria-expanded={showNoteComposer}
                aria-controls="inbox-note-composer"
                style={{
                  border: '1px solid #FCD34D',
                  borderRadius: 999,
                  background: '#FFFBEB',
                  color: '#B45309',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '8px 12px',
                  cursor: notePending ? 'wait' : 'pointer',
                }}
              >
                {showNoteComposer ? 'Chiudi nota interna' : 'Nota interna'}
              </button>
              {ownershipError && (
                <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>
                  {ownershipError}
                </p>
              )}
              {aiDraftError && (
                <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>
                  {aiDraftError}
                </p>
              )}
            </div>

            {showNoteComposer && (
              <div
                id="inbox-note-composer"
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #EFEFEF',
                  background: '#FFFDF7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label htmlFor="inbox-internal-note" style={{ fontSize: 12, fontWeight: 700, color: '#B45309' }}>
                  Nota interna visibile solo allo staff del tenant
                </label>
                <textarea
                  id="inbox-internal-note"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={handleNoteComposerKeyDown}
                  placeholder="Annota passaggi, contesto o follow-up interni…"
                  disabled={notePending}
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: '1px solid #FDE68A',
                    borderRadius: 14,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: '#7C2D12',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: 1.45,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: '#B45309' }}>
                    Cmd/Ctrl + Invio salva la nota senza inviarla al cliente.
                  </span>
                  <button
                    type="button"
                    onClick={() => { void handleSaveNote() }}
                    disabled={notePending || noteDraft.trim().length === 0}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      background: notePending || noteDraft.trim().length === 0 ? '#FDE68A' : '#F59E0B',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '9px 14px',
                      cursor: notePending || noteDraft.trim().length === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {notePending ? 'Salvataggio...' : 'Salva nota interna'}
                  </button>
                </div>
                {noteError && (
                  <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>
                    {noteError}
                  </p>
                )}
              </div>
            )}

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
              {latestAiRuntime && !aiDraft && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    border: '1px solid #E5E7EB',
                    borderRadius: 18,
                    padding: '12px 14px',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#374151', letterSpacing: '0.02em' }}>
                        {latestAiRuntime.providerLabel ?? 'AI receptionist'}
                      </span>
                      {latestAiRuntime.promptVersion && (
                        <span style={{ fontSize: 11, color: '#6B7280' }}>
                          {latestAiRuntime.promptVersion}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {aiRuntimeStatusLabel(latestAiRuntime.status)}
                    </span>
                  </div>
                  {latestAiRuntime.inboundMessage.bodyText && (
                    <div
                      style={{
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        background: '#F9FAFB',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Messaggio cliente associato
                      </div>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#1F2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {latestAiRuntime.inboundMessage.bodyText}
                      </p>
                    </div>
                  )}
                  {latestAiRuntime.decision && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        borderRadius: 14,
                        border: `1px solid ${decisionAccent(latestAiRuntime.decision.kind).border}`,
                        background: decisionAccent(latestAiRuntime.decision.kind).background,
                        padding: '10px 12px',
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        alignSelf: 'flex-start',
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: `1px solid ${decisionAccent(latestAiRuntime.decision.kind).border}`,
                        color: decisionAccent(latestAiRuntime.decision.kind).color,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        background: '#FFFFFF',
                      }}>
                        {decisionLabel(latestAiRuntime.decision.kind)}
                      </span>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#374151' }}>
                        {latestAiRuntime.decision.reasonSummary}
                      </p>
                      {latestAiRuntime.decision.appointmentPreparation && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1F2937' }}>
                            Planner {latestAiRuntime.decision.appointmentPreparation.action === 'booking'
                              ? 'prenotazione'
                              : latestAiRuntime.decision.appointmentPreparation.action === 'reschedule'
                                ? 'spostamento'
                                : 'cancellazione'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#4B5563' }}>
                              Stato: {latestAiRuntime.decision.appointmentPreparation.plannerState}
                            </span>
                            <span style={{ fontSize: 11, color: latestAiRuntime.decision.appointmentPreparation.eligible ? '#065F46' : '#B45309', fontWeight: 700 }}>
                              {latestAiRuntime.decision.appointmentPreparation.eligible ? 'Tool preparabile' : 'Dati incompleti'}
                            </span>
                          </div>
                          {latestAiRuntime.decision.appointmentPreparation.missingFields.length > 0 && (
                            <p style={{ margin: 0, fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>
                              Mancano: {latestAiRuntime.decision.appointmentPreparation.missingFields.map((field) => appointmentFieldLabel(field)).join(', ')}.
                            </p>
                          )}
                          {latestAiRuntime.decision.appointmentPreparation.nextQuestion && (
                            <p style={{ margin: 0, fontSize: 11, color: '#4B5563', lineHeight: 1.45 }}>
                              Prossima domanda consigliata: {latestAiRuntime.decision.appointmentPreparation.nextQuestion}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {aiDraft && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    border: '1px solid #DDD6FE',
                    borderRadius: 18,
                    padding: '12px 14px',
                    background: '#FAF8FF',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', letterSpacing: '0.02em' }}>
                        {aiDraft.providerLabel}
                      </span>
                      <span style={{ fontSize: 11, color: '#7C3AED' }}>
                        {aiDraft.promptVersion}
                      </span>
                      {aiDraft.usedAuthoritativeKnowledge && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#065F46',
                            fontSize: 10,
                            fontWeight: 800,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Dati tenant verificati
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      Bozza locale, mai inviata automaticamente
                    </span>
                  </div>
                  {latestAiRuntime?.inboundMessage.bodyText && (
                    <div
                      style={{
                        borderRadius: 12,
                        border: '1px solid #E5E7EB',
                        background: '#FFFFFF',
                        padding: '8px 10px',
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                        Messaggio cliente associato
                      </div>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {latestAiRuntime.inboundMessage.bodyText}
                      </p>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      borderRadius: 14,
                      border: `1px solid ${decisionAccent(aiDraft.decision.kind).border}`,
                      background: decisionAccent(aiDraft.decision.kind).background,
                      padding: '10px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: 999,
                        border: `1px solid ${decisionAccent(aiDraft.decision.kind).border}`,
                        color: decisionAccent(aiDraft.decision.kind).color,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        background: '#FFFFFF',
                      }}>
                        {decisionLabel(aiDraft.decision.kind)}
                      </span>
                      {aiDraft.decision.handoffRecommended && (
                        <span style={{ fontSize: 11, color: decisionAccent(aiDraft.decision.kind).color, fontWeight: 700 }}>
                          Revisione umana prioritaria
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: '#374151' }}>
                      {aiDraft.decision.reasonSummary}
                    </p>
                    {aiDraft.decision.appointmentPreparation && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1F2937' }}>
                          Preparazione {aiDraft.decision.appointmentPreparation.action === 'booking'
                            ? 'prenotazione'
                            : aiDraft.decision.appointmentPreparation.action === 'reschedule'
                              ? 'spostamento'
                              : 'cancellazione'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: '#4B5563' }}>
                            Completi: {aiDraft.decision.appointmentPreparation.completeFields.length}
                          </span>
                          <span style={{ fontSize: 11, color: aiDraft.decision.appointmentPreparation.eligible ? '#065F46' : '#B45309', fontWeight: 700 }}>
                            {aiDraft.decision.appointmentPreparation.eligible ? 'Tool preparabile' : 'Dati incompleti'}
                          </span>
                        </div>
                        {aiDraft.decision.appointmentPreparation.missingFields.length > 0 && (
                          <p style={{ margin: 0, fontSize: 11, color: '#6B7280', lineHeight: 1.45 }}>
                            Mancano: {aiDraft.decision.appointmentPreparation.missingFields.map((field) => appointmentFieldLabel(field)).join(', ')}.
                          </p>
                        )}
                        {aiDraft.decision.appointmentPreparation.nextQuestion && (
                          <p style={{ margin: 0, fontSize: 11, color: '#4B5563', lineHeight: 1.45 }}>
                            Prossima domanda consigliata: {aiDraft.decision.appointmentPreparation.nextQuestion}
                          </p>
                        )}
                        {aiDraft.decision.appointmentPreparation.preparedToolCall && (
                          <p style={{ margin: 0, fontSize: 11, color: '#374151', lineHeight: 1.45 }}>
                            Dati preparati: {[
                              aiDraft.decision.appointmentPreparation.service,
                              aiDraft.decision.appointmentPreparation.requestedDate,
                              aiDraft.decision.appointmentPreparation.requestedTime,
                            ].filter(Boolean).join(' | ')}
                          </p>
                        )}
                      </div>
                    )}
                    {aiDraft.decision.handoffRecommended && showTakeControl && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => { void handleOwnershipAction('take_control') }}
                          disabled={ownershipPending !== null}
                          style={{
                            border: '1px solid #D1D5DB',
                            borderRadius: 999,
                            background: '#FFFFFF',
                            color: '#111827',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '8px 12px',
                            cursor: ownershipPending ? 'wait' : 'pointer',
                          }}
                        >
                          {ownershipPending === 'take_control' ? 'Presa in corso...' : 'Accetta handoff'}
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    value={aiDraft.text}
                    onChange={(event) =>
                      setAiDraft((current) =>
                        current ? editInboxDraftApprovalText(current, event.target.value) : current
                      )
                    }
                    rows={4}
                    aria-label="Bozza AI modificabile"
                    style={{
                      width: '100%',
                      background: '#FFFFFF',
                      border: '1px solid #DDD6FE',
                      borderRadius: 14,
                      padding: '10px 12px',
                      fontSize: 13,
                      color: '#1F2937',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      lineHeight: 1.45,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {aiDraft.sources.map((source) => (
                      <span
                        key={`${source.kind}:${source.label}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: '#FFFFFF',
                          border: '1px solid #E9D5FF',
                          color: '#6D28D9',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {source.label}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      Approva per copiare la bozza nel box di risposta esistente.
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleDiscardAiDraft}
                        style={{
                          border: '1px solid #E5E7EB',
                          borderRadius: 999,
                          background: '#FFFFFF',
                          color: '#6B7280',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '8px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        Scarta
                      </button>
                      <button
                        type="button"
                        onClick={handleApproveAiDraft}
                        disabled={aiDraft.text.trim().length === 0}
                        style={{
                          border: 'none',
                          borderRadius: 999,
                          background: aiDraft.text.trim().length === 0 ? '#D8B4FE' : '#7C3AED',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '8px 12px',
                          cursor: aiDraft.text.trim().length === 0 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Approva nel box risposta
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>
                  {sendError}
                </p>
              )}
              {showNoteComposer && (
                <p style={{ margin: 0, fontSize: 11, color: '#A16207' }}>
                  Le note interne restano nella timeline staff e non aggiornano l’anteprima cliente.
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
