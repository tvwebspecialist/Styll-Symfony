import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateInboxDraftCore,
  InboxDraftRuntimeError,
} from '../../src/lib/ai/inbox-draft-orchestrator-core.ts'
import { InboxDraftPreparationError } from '../../src/lib/ai/inbox-draft-context-core.ts'
import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'
import { resolveDeterministicReceptionistConversationState } from '../../src/lib/ai/receptionist-conversation-state.ts'

const ALWAYS_AVAILABLE_GATEWAY = {
  gatewayId: 'test_available_gateway',
  async findAvailableSlots(input) {
    return {
      serviceId: input.serviceId,
      requestedDate: input.requestedDate,
      timezone: 'Europe/Rome',
      serviceAvailable: true,
      businessOpen: true,
      slots: [
        {
          date: input.requestedDate,
          startTime: input.preferredTime ?? '16:30',
          endTime: '17:00',
          staffIds: ['staff-1'],
        },
      ],
    }
  },
}

function attachConversationState(request) {
  request.conversationMemory = resolveInboxConversationMemory({
    messages: request.messages,
    serviceCatalog: request.serviceCatalog,
    timezone: request.tenantProfile.timezone,
  })
  request.receptionistState = resolveDeterministicReceptionistConversationState({
    messages: request.messages,
    serviceCatalog: request.serviceCatalog,
    timezone: request.tenantProfile.timezone,
    conversationMemory: request.conversationMemory,
  })
  return request
}

function makeUnderstanding(overrides = {}) {
  return {
    intent: 'booking',
    confidence: 0.87,
    handoff: false,
    entities: {
      service: 'Taglio',
      requestedDate: '2026-07-21',
      requestedTime: '16:00',
      appointmentReference: null,
      customerName: null,
      customerNotes: 'Vorrei prenotare un taglio domani alle 16.',
    },
    corrections: {
      replacesService: false,
      replacesDate: false,
      replacesTime: false,
    },
    citedSources: ['message:message-1', 'working_hours:wh-1'],
    requestedToolCalls: [
      {
        name: 'search_availability',
        arguments: {
          source: 'draft_only_advisory',
        },
      },
    ],
    ...overrides,
  }
}

function makeDraftRequest() {
  const request = {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v6',
    systemPrompt: 'draft only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Vorrei prenotare un taglio domani alle 16.',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
    ],
    contextSections: [
      {
        key: 'tenant_profile',
        title: 'Tenant profile',
        text: 'business_name=Barber House\ntimezone=Europe/Rome',
        sourceRefs: ['tenant:tenant-a:profile'],
      },
    ],
    sources: [
      {
        kind: 'conversation',
        label: 'Conversation message (customer)',
        ref: 'message:message-1',
      },
      {
        kind: 'knowledge',
        label: 'Tenant profile',
        ref: 'tenant:tenant-a:profile',
      },
      {
        kind: 'knowledge',
        label: 'Working hours: lunedi',
        ref: 'working_hours:wh-1',
      },
    ],
    allowedTools: [
      'search_availability',
      'prepare_booking_sandbox',
      'prepare_appointment',
      'confirm_appointment',
      'request_human_handoff',
    ],
    conversationState: {
      status: 'ai_draft_only',
      ownershipMode: 'hybrid',
      aiPausedAt: null,
      clientId: 'client-1',
    },
    tenantProfile: {
      businessName: 'Barber House',
      timezone: 'Europe/Rome',
    },
    receptionistConfig: {
      mode: 'supervised',
      autoReplyConfidenceThreshold: 0.9,
      handoffConfidenceThreshold: 0.65,
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours'],
      preferredTone: 'professionale',
      greetingStyle: null,
      escalationInstructions: null,
      customFaqs: [],
    },
    serviceCatalog: [
      {
        id: 'service-1',
        name: 'Taglio',
        price: 25,
        durationMinutes: 30,
      },
    ],
    customFaqCatalog: [],
  }

  return attachConversationState(request)
}

function makeDeps(overrides = {}) {
  const calls = {
    createRun: 0,
    completeRun: 0,
    failRun: 0,
    provider: 0,
    lastCompleteRunInput: null,
    lastFailRunInput: null,
  }

  const deps = {
    async loadDraftRequest() {
      return makeDraftRequest()
    },
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: 'Ciao, posso preparare una proposta di appuntamento da far verificare allo staff.',
          confidence: 0.87,
          intent: 'booking',
          handoff: false,
          understanding: makeUnderstanding(),
          internalReasoning: 'Richiesta di prenotazione con risposta conservativa.',
          citedSources: ['message:message-1', 'working_hours:wh-1'],
          requestedToolCalls: [
            {
              name: 'search_availability',
              arguments: {
                source: 'draft_only_advisory',
              },
            },
          ],
          providerRunId: 'local-run-1',
        }
      },
    },
    availabilityGateway: ALWAYS_AVAILABLE_GATEWAY,
    async createRun() {
      calls.createRun += 1
      return { runId: 'run-1' }
    },
    async completeRun(input) {
      calls.completeRun += 1
      calls.lastCompleteRunInput = input
    },
    async failRun(input) {
      calls.failRun += 1
      calls.lastFailRunInput = input
    },
    ...overrides,
  }

  return { deps, calls }
}

test('generateInboxDraftCore creates a persisted draft-only run and preserves source attribution', async () => {
  const { deps, calls } = makeDeps()

  const result = await generateInboxDraftCore(
    {
      tenantId: 'tenant-a',
      conversationId: 'conversation-1',
    },
    deps,
  )

  assert.equal(result.runId, 'run-1')
  assert.equal(result.providerId, 'deterministic_fake_draft_v1')
  assert.equal(result.promptVersion, '2026-07-20.v6')
  assert.equal(result.intent, 'booking')
  assert.equal(result.handoff, false)
  assert.equal(result.confidence, 0.87)
  assert.equal(result.internalReasoning, 'Richiesta di prenotazione con risposta conservativa.')
  assert.equal(
    result.citedSources.map((source) => source.ref).join(','),
    'message:message-1,working_hours:wh-1,tool_result:search_availability',
  )
  assert.equal(result.requestedToolCalls[0].name, 'search_availability')
  assert.equal(result.requestedToolCalls[0].policy, 'allow')
  assert.equal(result.decision.kind, 'action_prepare_candidate')
  assert.equal(result.decision.reasonCode, 'availability_available')
  assert.equal(result.decision.appointmentPreparation?.eligible, true)
  assert.equal(result.decision.appointmentPreparation?.preparedToolCall?.name, 'prepare_booking_sandbox')
  assert.equal(
    result.decision.appointmentPreparation?.preparedToolCall?.arguments.requested_date,
    '2026-07-21',
  )
  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 1)
  assert.equal(calls.failRun, 0)
  assert.equal(calls.provider, 1)
  assert.equal(calls.lastCompleteRunInput?.handoffReason, null)
})

test('generateInboxDraftCore rejects cross-tenant draft loads before creating a run', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      throw new InboxDraftPreparationError(
        'CROSS_TENANT_RESOURCE',
        'cross tenant',
        404,
      )
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'CROSS_TENANT_RESOURCE',
  )

  assert.equal(calls.createRun, 0)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 0)
})

test('generateInboxDraftCore marks the run failed when the provider throws', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        throw new Error('provider failed')
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'PROVIDER_FAILED',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
  assert.equal(calls.lastFailRunInput?.reasonCode, 'provider_failed')
})

test('generateInboxDraftCore categorizes provider timeouts as blocked runtime failures', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'anthropic_claude_sonnet_5_draft_v1',
      async generateDraft() {
        calls.provider += 1
        throw new Error('Anthropic draft request timed out after 8000ms.')
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
          messageId: 'message-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'PROVIDER_FAILED',
  )

  assert.equal(calls.failRun, 1)
  assert.equal(calls.lastFailRunInput?.messageId, 'message-1')
  assert.equal(calls.lastFailRunInput?.reasonCode, 'provider_timeout')
  assert.equal(calls.lastFailRunInput?.decisionKind, 'blocked')
})

test('generateInboxDraftCore replaces low-risk pricing drafts with authoritative tenant data', async () => {
  const { deps, calls } = makeDeps({
    async loadDraftRequest() {
      const request = {
        ...makeDraftRequest(),
        messages: [
          {
            id: 'message-1',
            author: 'customer',
            text: 'Quanto costa il taglio?',
            createdAt: '2026-07-20T09:00:00.000Z',
            sourceRef: 'message:message-1',
          },
        ],
        sources: [
          {
            kind: 'conversation',
            label: 'Conversation message (customer)',
            ref: 'message:message-1',
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
        ],
      }

      request.conversationMemory = resolveInboxConversationMemory({
        messages: request.messages,
        serviceCatalog: request.serviceCatalog,
        timezone: request.tenantProfile.timezone,
      })
      request.receptionistState = resolveDeterministicReceptionistConversationState({
        messages: request.messages,
        serviceCatalog: request.serviceCatalog,
        timezone: request.tenantProfile.timezone,
        conversationMemory: request.conversationMemory,
      })

      return request
    },
    provider: {
      providerId: 'anthropic_claude_sonnet_5_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: 'Prezzo inventato da non usare.',
          confidence: 0.96,
          intent: 'pricing',
          handoff: false,
          understanding: makeUnderstanding({
            intent: 'pricing',
            confidence: 0.96,
            entities: {
              service: 'Taglio',
              requestedDate: null,
              requestedTime: null,
              appointmentReference: null,
              customerName: null,
              customerNotes: 'Quanto costa il taglio?',
            },
            requestedToolCalls: [
              {
                name: 'request_human_handoff',
                arguments: { reason: 'should_be_cleared' },
              },
            ],
            citedSources: ['message:message-1', 'service:service-1'],
          }),
          internalReasoning: 'Classificazione pricing.',
          citedSources: ['message:message-1', 'service:service-1'],
          requestedToolCalls: [
            {
              name: 'request_human_handoff',
              arguments: { reason: 'should_be_cleared' },
            },
          ],
          providerRunId: 'anthropic-run-1',
        }
      },
    },
  })

  const result = await generateInboxDraftCore(
    {
      tenantId: 'tenant-a',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    },
    deps,
  )

  assert.equal(result.draftText, 'Il prezzo indicato per Taglio e EUR 25.')
  assert.equal(result.usedAuthoritativeKnowledge, true)
  assert.equal(result.authoritativeResolution?.resolver, 'pricing')
  assert.equal(result.authoritativeResolution?.reasonCode, 'pricing_resolved')
  assert.deepEqual(result.requestedToolCalls, [])
  assert.equal(result.decision.kind, 'auto_reply_candidate')
  assert.equal(calls.lastCompleteRunInput?.usedAuthoritativeKnowledge, true)
  assert.equal(calls.lastCompleteRunInput?.deterministicResolver, 'pricing')
})

test('generateInboxDraftCore rejects malformed provider output and never auto-executes requested tools', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'deterministic_fake_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: '   ',
          confidence: 0.5,
          intent: 'unknown',
          handoff: true,
          understanding: makeUnderstanding({
            intent: 'unknown',
            confidence: 0.5,
            handoff: true,
            entities: {
              service: null,
              requestedDate: null,
              requestedTime: null,
              appointmentReference: null,
              customerName: null,
              customerNotes: '???',
            },
            requestedToolCalls: [
              {
                name: 'refund',
                arguments: {
                  amount: 10,
                },
              },
            ],
            citedSources: ['external:unknown'],
          }),
          internalReasoning: 'Risposta malformata.',
          citedSources: ['external:unknown'],
          requestedToolCalls: [
            {
              name: 'refund',
              arguments: {
                amount: 10,
              },
            },
          ],
          providerRunId: 'bad-run',
        }
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'MALFORMED_PROVIDER_RESPONSE',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
})

test('generateInboxDraftCore rejects provider responses with invalid structured intent metadata', async () => {
  const { deps, calls } = makeDeps({
    provider: {
      providerId: 'anthropic_claude_sonnet_5_draft_v1',
      async generateDraft() {
        calls.provider += 1
        return {
          draftText: 'Ciao',
          confidence: 1.2,
          intent: 'non_existing_intent',
          handoff: false,
          understanding: {
            intent: 'non_existing_intent',
            confidence: 1.2,
            handoff: false,
            entities: {
              service: null,
              requestedDate: null,
              requestedTime: null,
              appointmentReference: null,
              customerName: null,
              customerNotes: 'metadata invalid',
            },
            corrections: {
              replacesService: false,
              replacesDate: false,
              replacesTime: false,
            },
            citedSources: ['message:message-1'],
            requestedToolCalls: [],
          },
          internalReasoning: 'metadata invalid',
          citedSources: ['message:message-1'],
          requestedToolCalls: [],
          providerRunId: 'anthropic-run-1',
        }
      },
    },
  })

  await assert.rejects(
    () =>
      generateInboxDraftCore(
        {
          tenantId: 'tenant-a',
          conversationId: 'conversation-1',
        },
        deps,
      ),
    (error) =>
      error instanceof InboxDraftRuntimeError
      && error.code === 'MALFORMED_PROVIDER_RESPONSE',
  )

  assert.equal(calls.createRun, 1)
  assert.equal(calls.completeRun, 0)
  assert.equal(calls.failRun, 1)
})
