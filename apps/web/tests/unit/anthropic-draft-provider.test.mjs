import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AnthropicDraftProviderConfigurationError,
  AnthropicDraftProviderResponseError,
  buildAnthropicDraftRequestPayload,
  createAnthropicDraftProvider,
} from '../../src/lib/ai/anthropic-draft-provider.ts'

function makeDraftRequest(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v6',
    systemPrompt: 'Prompt whatsapp_inbox_draft_only@2026-07-20.v6\nMode: draft_only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Ciao, quanto costa taglio e barba?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
      {
        id: 'message-2',
        author: 'human',
        text: 'Ti confermo appena verifico.',
        createdAt: '2026-07-20T09:01:00.000Z',
        sourceRef: 'message:message-2',
      },
    ],
    contextSections: [
      {
        key: 'tenant_profile',
        title: 'Tenant profile',
        text: 'business_name=Barber House\ntimezone=Europe/Rome',
        sourceRefs: ['tenant:tenant-a:profile'],
      },
      {
        key: 'services',
        title: 'Active services',
        text: '- Taglio | EUR 25 | 30 min\n- Barba | EUR 15 | 20 min',
        sourceRefs: ['service:service-1', 'service:service-2'],
      },
      {
        key: 'working_hours',
        title: 'Working hours',
        text: '- lunedi: 09:00:00-18:00:00',
        sourceRefs: ['working_hours:wh-1'],
      },
    ],
    sources: [
      {
        kind: 'conversation',
        label: 'Conversation message (customer)',
        ref: 'message:message-1',
      },
      {
        kind: 'conversation',
        label: 'Conversation message (human)',
        ref: 'message:message-2',
      },
      {
        kind: 'knowledge',
        label: 'Tenant profile',
        ref: 'tenant:tenant-a:profile',
      },
      {
        kind: 'knowledge',
        label: 'Service: Taglio',
        ref: 'service:service-1',
      },
      {
        kind: 'knowledge',
        label: 'Service: Barba',
        ref: 'service:service-2',
      },
      {
        kind: 'knowledge',
        label: 'Working hours: lunedi',
        ref: 'working_hours:wh-1',
      },
    ],
    allowedTools: ['get_prices', 'prepare_appointment', 'request_human_handoff'],
    ...overrides,
  }
}

test('buildAnthropicDraftRequestPayload keeps prompt, transcript, context and traceable source refs together', () => {
  const payload = buildAnthropicDraftRequestPayload(makeDraftRequest())

  assert.equal(payload.model, 'claude-sonnet-5')
  assert.equal(payload.system, 'Prompt whatsapp_inbox_draft_only@2026-07-20.v6\nMode: draft_only')
  assert.equal(payload.thinking.type, 'disabled')
  assert.equal(payload.messages.length, 1)
  assert.equal(payload.messages[0].role, 'user')
  assert.equal(typeof payload.messages[0].content, 'string')
  assert.match(payload.messages[0].content, /Recent transcript:/)
  assert.match(payload.messages[0].content, /\[message:message-1\]/)
  assert.match(payload.messages[0].content, /## Tenant profile \[tenant_profile\]/)
  assert.match(payload.messages[0].content, /service:service-1 \| knowledge \| Service: Taglio/)
  assert.match(payload.messages[0].content, /Allowed intents: greeting, pricing, opening_hours, booking/)
  assert.match(payload.messages[0].content, /conversation_memory/)
  assert.equal(payload.output_config.format.type, 'json_schema')
})

test('createAnthropicDraftProvider maps structured output into the shared draft contract', async () => {
  let receivedPayload = null

  const provider = createAnthropicDraftProvider({
    apiKey: 'test-key',
    client: {
      messages: {
        async parse(payload) {
          receivedPayload = payload
          return {
            id: 'anthropic-run-1',
            parsed_output: {
              draft: ' Ciao, il riferimento disponibile e Taglio | EUR 25 | 30 min. Per una conferma finale faccio verificare allo staff. ',
              reasoning: 'La richiesta riguarda il pricing e va limitata al listino disponibile.',
              understanding: {
                intent: 'pricing',
                confidence: 0.94,
                handoff: false,
                entities: {
                  service: 'Taglio',
                  requestedDate: null,
                  requestedTime: null,
                  appointmentReference: null,
                  customerName: null,
                  customerNotes: 'Quanto costa taglio e barba?',
                },
                corrections: {
                  replacesService: false,
                  replacesDate: false,
                  replacesTime: false,
                },
                requestedToolCalls: [
                  {
                    name: 'get_prices',
                    arguments: {
                      source: 'listino_attivo',
                    },
                  },
                ],
                citedSources: ['message:message-1', 'service:service-1', 'message:message-1'],
              },
            },
          }
        },
      },
    },
  })

  const result = await provider.generateDraft(makeDraftRequest())

  assert.ok(receivedPayload)
  assert.equal(result.providerRunId, 'anthropic-run-1')
  assert.equal(result.draftText, 'Ciao, il riferimento disponibile e Taglio | EUR 25 | 30 min. Per una conferma finale faccio verificare allo staff.')
  assert.equal(result.confidence, 0.94)
  assert.equal(result.intent, 'pricing')
  assert.equal(result.handoff, false)
  assert.equal(result.understanding.intent, 'pricing')
  assert.equal(result.understanding.entities.service, 'Taglio')
  assert.equal(result.internalReasoning, 'La richiesta riguarda il pricing e va limitata al listino disponibile.')
  assert.deepEqual(result.citedSources, ['message:message-1', 'service:service-1'])
  assert.deepEqual(result.requestedToolCalls, [
    {
      name: 'get_prices',
      arguments: {
        source: 'listino_attivo',
      },
    },
  ])
})

test('createAnthropicDraftProvider rejects missing API keys fail-closed', () => {
  assert.throws(
    () => createAnthropicDraftProvider({ apiKey: '   ' }),
    AnthropicDraftProviderConfigurationError,
  )
})

test('createAnthropicDraftProvider rejects malformed provider responses without structured output', async () => {
  const provider = createAnthropicDraftProvider({
    apiKey: 'test-key',
    client: {
      messages: {
        async parse() {
          return {
            id: 'anthropic-run-2',
            parsed_output: null,
          }
        },
      },
    },
  })

  await assert.rejects(
    () => provider.generateDraft(makeDraftRequest()),
    AnthropicDraftProviderResponseError,
  )
})

test('createAnthropicDraftProvider surfaces timeouts with an explicit provider error', async () => {
  const provider = createAnthropicDraftProvider({
    apiKey: 'test-key',
    timeoutMs: 3210,
    client: {
      messages: {
        async parse() {
          throw new Error('request timed out upstream')
        },
      },
    },
  })

  await assert.rejects(
    () => provider.generateDraft(makeDraftRequest()),
    /Anthropic draft request timed out after 3210ms\./,
  )
})

test('createAnthropicDraftProvider wraps provider failures without leaking transport internals', async () => {
  const provider = createAnthropicDraftProvider({
    apiKey: 'test-key',
    client: {
      messages: {
        async parse() {
          throw new Error('upstream 529 overload')
        },
      },
    },
  })

  await assert.rejects(
    () => provider.generateDraft(makeDraftRequest()),
    /Anthropic draft request failed: upstream 529 overload/,
  )
})
