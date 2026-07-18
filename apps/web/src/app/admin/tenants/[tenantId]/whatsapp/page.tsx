import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import { WhatsAppBindingCard } from './whatsapp-client'

export const dynamic = 'force-dynamic'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('it-IT')
}

function formatStatusLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function statusClasses(status: string): string {
  switch (status) {
    case 'processed':
    case 'delivered':
    case 'read':
    case 'resolved':
      return 'bg-emerald-100 text-emerald-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'received':
    case 'new':
      return 'bg-sky-100 text-sky-700'
    default:
      return 'bg-zinc-100 text-zinc-700'
  }
}

export default async function TenantWhatsAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>
  searchParams?: Promise<{ conversation?: string }>
}) {
  const { tenantId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const selectedConversationId = resolvedSearchParams?.conversation ?? null

  const db = createAdminClient()
  const messagingDb = createMessagingAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, business_name')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant) notFound()

  const [integrationRes, conversationsRes, webhookEventsRes, counts] = await Promise.all([
    messagingDb
      .from('tenant_integrations')
      .select('id, external_account_id, metadata, connected_at, disconnected_at')
      .eq('tenant_id', tenantId)
      .eq('provider', 'meta_whatsapp')
      .is('disconnected_at', null)
      .maybeSingle(),
    messagingDb
      .from('inbox_conversations')
      .select(
        'id, contact_display_name, contact_phone, status, ownership_mode, unread_count, last_message_preview, last_message_at, assigned_staff_id, client_id',
      )
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50),
    messagingDb
      .from('webhook_events_inbox')
      .select('id, event_type, external_id, status, error, received_at')
      .eq('tenant_id', tenantId)
      .order('received_at', { ascending: false })
      .limit(20),
    Promise.all([
      messagingDb.from('inbox_conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      messagingDb.from('inbox_messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      messagingDb
        .from('webhook_events_inbox')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'failed'),
    ]),
  ])

  const integration = integrationRes.data
  const conversations = conversationsRes.data ?? []
  const webhookEvents = webhookEventsRes.data ?? []
  const currentConversationId =
    conversations.find((row) => row.id === selectedConversationId)?.id ??
    conversations[0]?.id ??
    null

  const [{ data: messages }, { data: assignedStaffRows }, { data: clientRows }] = await Promise.all([
    currentConversationId
      ? messagingDb
          .from('inbox_messages')
          .select(
            'id, author_kind, direction, body_text, media, created_at, meta_message_id, provider_event_id, used_template',
          )
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    (() => {
      const ids = [...new Set(conversations.map((row) => row.assigned_staff_id).filter(Boolean))] as string[]
      return ids.length === 0
        ? Promise.resolve({ data: [], error: null })
        : db
            .from('staff_members')
            .select('id, role, profiles(full_name)')
            .in('id', ids)
    })(),
    (() => {
      const ids = [...new Set(conversations.map((row) => row.client_id).filter(Boolean))] as string[]
      return ids.length === 0
        ? Promise.resolve({ data: [], error: null })
        : db
            .from('clients')
            .select('id, full_name')
            .in('id', ids)
    })(),
  ])

  const staffNameById = new Map<string, string>()
  for (const row of assignedStaffRows ?? []) {
    const profileRel = (row as { profiles: { full_name: string | null } | { full_name: string | null }[] | null }).profiles
    const profile = Array.isArray(profileRel) ? profileRel[0] : profileRel
    staffNameById.set(row.id, profile?.full_name ?? 'Staff')
  }

  const clientNameById = new Map<string, string>()
  for (const row of clientRows ?? []) {
    clientNameById.set(row.id, row.full_name)
  }

  const webhookUrlBase = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim()
  const webhookUrl = webhookUrlBase
    ? `${webhookUrlBase.replace(/\/$/, '')}/api/webhooks/meta-whatsapp`
    : '/api/webhooks/meta-whatsapp'

  const bindingMetadata = (integration?.metadata ?? {}) as Record<string, unknown>
  const businessAccountId =
    typeof bindingMetadata.business_account_id === 'string' ? bindingMetadata.business_account_id : ''
  const displayPhoneNumber =
    typeof bindingMetadata.display_phone_number === 'string' ? bindingMetadata.display_phone_number : ''

  const conversationsCount = counts[0].count ?? 0
  const messagesCount = counts[1].count ?? 0
  const failedWebhookCount = counts[2].count ?? 0

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MiniStat label="Conversazioni" value={conversationsCount} />
        <MiniStat label="Messaggi" value={messagesCount} />
        <MiniStat label="Webhook falliti" value={failedWebhookCount} alert={failedWebhookCount > 0} />
      </div>

      <WhatsAppBindingCard
        tenantId={tenantId}
        initial={{
          phoneNumberId: integration?.external_account_id ?? '',
          businessAccountId,
          displayPhoneNumber,
        }}
        hasVerifyToken={Boolean((process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '').trim())}
        hasAppSecret={Boolean((process.env.META_APP_SECRET ?? '').trim())}
        webhookUrl={webhookUrl}
        isConnected={Boolean(integration?.external_account_id)}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px,minmax(0,1fr)]">
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Inbox WhatsApp</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Ultime 50 conversazioni per {tenant.business_name}.
            </p>
          </div>

          <div className="max-h-[720px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                Nessuna conversazione ricevuta.
              </div>
            ) : (
              conversations.map((conversation) => {
                const active = currentConversationId === conversation.id
                const href = `/admin/tenants/${tenantId}/whatsapp?conversation=${conversation.id}`
                const assignedStaffName = conversation.assigned_staff_id
                  ? staffNameById.get(conversation.assigned_staff_id) ?? 'Staff'
                  : null
                const clientName = conversation.client_id
                  ? clientNameById.get(conversation.client_id) ?? null
                  : null

                return (
                  <Link
                    key={conversation.id}
                    href={href}
                    className={`block border-b px-4 py-3 transition-colors ${
                      active ? 'bg-zinc-50' : 'hover:bg-zinc-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-950">
                          {conversation.contact_display_name || clientName || conversation.contact_phone || 'Contatto sconosciuto'}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {conversation.contact_phone || clientName || '—'}
                        </div>
                      </div>
                      {conversation.unread_count > 0 ? (
                        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          {conversation.unread_count}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge text={formatStatusLabel(conversation.status)} className={statusClasses(conversation.status)} />
                      <Badge text={conversation.ownership_mode.toUpperCase()} className="bg-zinc-100 text-zinc-700" />
                      {assignedStaffName ? (
                        <Badge text={`Assegnata: ${assignedStaffName}`} className="bg-amber-100 text-amber-700" />
                      ) : null}
                    </div>

                    <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {conversation.last_message_preview || 'Nessun testo disponibile.'}
                    </div>

                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Ultimo evento: {formatDateTime(conversation.last_message_at)}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Dettaglio conversazione</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Timeline normalizzata da `inbox_messages`.
              </p>
            </div>

            {!currentConversationId ? (
              <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                Seleziona una conversazione dalla lista.
              </div>
            ) : (
              <div className="flex max-h-[520px] flex-col gap-3 overflow-y-auto px-4 py-4">
                {(messages ?? []).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nessun messaggio salvato per questa conversazione.</div>
                ) : (
                  (messages ?? []).map((message) => {
                    const bubbleClass =
                      message.author_kind === 'customer'
                        ? 'bg-zinc-100 text-zinc-900'
                        : message.author_kind === 'system'
                          ? 'bg-sky-50 text-sky-900'
                          : 'bg-emerald-50 text-emerald-900'

                    return (
                      <div key={message.id} className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge text={message.author_kind} className="bg-zinc-100 text-zinc-700" />
                          <Badge text={message.direction} className="bg-zinc-100 text-zinc-700" />
                          {message.used_template ? (
                            <Badge text="template" className="bg-amber-100 text-amber-700" />
                          ) : null}
                          <span>{formatDateTime(message.created_at)}</span>
                        </div>
                        <div className={`rounded-2xl px-3 py-2 text-sm ${bubbleClass}`}>
                          {message.body_text?.trim() || '[messaggio senza testo]'}
                          {Array.isArray(message.media) && message.media.length > 0 ? (
                            <div className="mt-2 text-[11px] opacity-75">
                              Allegati: {message.media.length}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Eventi webhook recenti</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ultimi 20 eventi processati per questo tenant.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Tipo</th>
                    <th className="px-4 py-2 font-semibold">Stato</th>
                    <th className="px-4 py-2 font-semibold">Ricevuto</th>
                    <th className="px-4 py-2 font-semibold">Errore</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-xs text-muted-foreground">
                        Nessun evento webhook disponibile.
                      </td>
                    </tr>
                  ) : (
                    webhookEvents.map((event) => (
                      <tr key={event.id} className="border-t">
                        <td className="px-4 py-2 align-top">
                          <div className="font-medium text-zinc-900">{event.event_type}</div>
                          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {event.external_id}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <Badge text={event.status} className={statusClasses(event.status)} />
                        </td>
                        <td className="px-4 py-2 align-top text-xs text-muted-foreground">
                          {formatDateTime(event.received_at)}
                        </td>
                        <td className="px-4 py-2 align-top text-xs text-red-600">
                          {event.error || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  alert = false,
}: {
  label: string
  value: number
  alert?: boolean
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 ${alert ? 'border-amber-300 bg-amber-50/40' : ''}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-bold tabular-nums ${alert ? 'text-amber-600' : 'text-zinc-950'}`}>
        {value}
      </div>
    </div>
  )
}

function Badge({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {text}
    </span>
  )
}
