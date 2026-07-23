import test from 'node:test'
import assert from 'node:assert/strict'

import { getInboxToolDefinition } from '../../src/lib/messaging/tool-registry.ts'
import { resolveInboxDraftDecision } from '../../src/lib/ai/inbox-draft-decision.ts'
import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'
import { resolveDeterministicReceptionistConversationState } from '../../src/lib/ai/receptionist-conversation-state.ts'

const AVAILABLE_RESULT = {
  available: true,
  requestedSlot: {
    date: '2026-07-21',
    startTime: '16:00',
    endTime: '16:30',
    staffIds: ['staff-1'],
  },
  suggestedSlots: [],
  reason: 'available',
}

function attachConversationState(request) {
  request.conversationMemory ??= resolveInboxConversationMemory({
    messages: request.messages,
    serviceCatalog: request.serviceCatalog,
    timezone: request.tenantProfile.timezone,
  })
  request.receptionistState ??= resolveDeterministicReceptionistConversationState({
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
    citedSources: ['message:message-1', 'service:service-1'],
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

function makeDraftRequest(overrides = {}) {
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
        text: 'business_name=Barber House\ntimezone=Europe/Rome\npreferred_tone=professionale',
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
        label: 'Service: Taglio',
        ref: 'service:service-1',
      },
    ],
    allowedTools: ['search_availability', 'prepare_booking_sandbox', 'request_human_handoff'],
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
      autoReplyConfidenceThreshold: 0.8,
      handoffConfidenceThreshold: 0.65,
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
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
    ...overrides,
  }

  return attachConversationState(request)
}

function enrichToolCall(name, argumentsObject = {}, overrides = {}) {
  const definition = getInboxToolDefinition(name)
  return {
    name,
    arguments: argumentsObject,
    policy: definition.policy,
    requiresCustomerConfirmation: definition.requiresCustomerConfirmation,
    requiresStaffApproval: definition.requiresStaffApproval,
    ...overrides,
  }
}

test('resolveInboxDraftDecision blocks tenants with AI receptionist disabled', () => {
  const decision = resolveInboxDraftDecision({
    request: makeDraftRequest({
      receptionistConfig: {
        ...makeDraftRequest().receptionistConfig,
        mode: 'disabled',
      },
    }),
    result: {
      draftText: 'Ciao',
      confidence: 0.93,
      intent: 'greeting',
      handoff: false,
      understanding: makeUnderstanding({
        intent: 'greeting',
        confidence: 0.93,
        entities: {
          service: null,
          requestedDate: null,
          requestedTime: null,
          appointmentReference: null,
          customerName: null,
          customerNotes: 'Ciao',
        },
        requestedToolCalls: [],
        citedSources: ['message:message-1'],
      }),
      receptionistState: makeDraftRequest().receptionistState,
      citedSources: [
        {
          kind: 'conversation',
          label: 'Conversation message (customer)',
          ref: 'message:message-1',
        },
      ],
      requestedToolCalls: [],
    },
  })

  assert.equal(decision.kind, 'blocked')
  assert.equal(decision.reasonCode, 'tenant_mode_disabled')
})

test('resolveInboxDraftDecision keeps complete booking requests in draft review when the tenant is draft-only', () => {
  const request = makeDraftRequest({
    receptionistConfig: {
      ...makeDraftRequest().receptionistConfig,
      mode: 'draft_only',
    },
  })
  const decision = resolveInboxDraftDecision({
    request,
    result: {
      draftText: 'Posso preparare una proposta di appuntamento da verificare manualmente.',
      confidence: 0.87,
      intent: 'booking',
      handoff: false,
      understanding: makeUnderstanding(),
      receptionistState: request.receptionistState,
      citedSources: [
        request.sources[0],
        request.sources[2],
      ],
      requestedToolCalls: [
        enrichToolCall('search_availability', { source: 'draft_only_advisory' }),
      ],
      availabilityResult: AVAILABLE_RESULT,
    },
  })

  assert.equal(decision.kind, 'draft_review')
  assert.equal(decision.reasonCode, 'draft_only_mode')
  assert.equal(decision.appointmentPreparation?.eligible, true)
  assert.deepEqual(decision.appointmentPreparation?.missingFields, [])
  assert.equal(decision.appointmentPreparation?.plannerState, 'availability_available')
  assert.equal(
    decision.appointmentPreparation?.preparedToolCall?.arguments.requested_date,
    '2026-07-21',
  )
  assert.equal(
    decision.appointmentPreparation?.preparedToolCall?.arguments.requested_time,
    '16:00',
  )
  assert.equal(
    decision.appointmentPreparation?.preparedToolCall?.name,
    'prepare_booking_sandbox',
  )
})

test('resolveInboxDraftDecision escalates incomplete provider metadata to human handoff', () => {
  const request = makeDraftRequest()
  const decision = resolveInboxDraftDecision({
    request,
    result: {
      draftText: 'Ciao',
      confidence: null,
      intent: 'faq',
      handoff: false,
      understanding: makeUnderstanding({
        intent: 'faq',
        confidence: null,
        entities: {
          service: null,
          requestedDate: null,
          requestedTime: null,
          appointmentReference: null,
          customerName: null,
          customerNotes: 'Ciao',
        },
        requestedToolCalls: [],
        citedSources: ['message:message-1'],
      }),
      receptionistState: request.receptionistState,
      citedSources: [],
      requestedToolCalls: [],
    },
  })

  assert.equal(decision.kind, 'human_handoff')
  assert.equal(decision.reasonCode, 'provider_response_incomplete')
  assert.equal(decision.handoffRecommended, true)
})

test('resolveInboxDraftDecision keeps unresolved authoritative FAQ answers in draft review', () => {
  const request = makeDraftRequest()
  const decision = resolveInboxDraftDecision({
    request,
    result: {
      draftText: 'Grazie, verifico il prezzo corretto con lo staff e ti confermo appena possibile.',
      confidence: 0.92,
      intent: 'pricing',
      handoff: false,
      understanding: makeUnderstanding({
        intent: 'pricing',
        confidence: 0.92,
        entities: {
          service: 'Taglio',
          requestedDate: null,
          requestedTime: null,
          appointmentReference: null,
          customerName: null,
          customerNotes: 'Quanto costa il taglio?',
        },
        requestedToolCalls: [],
        citedSources: ['message:message-1', 'service:service-1'],
      }),
      receptionistState: request.receptionistState,
      citedSources: [],
      requestedToolCalls: [],
      authoritativeResolution: {
        attempted: true,
        resolved: false,
        resolver: 'pricing',
        reasonCode: 'pricing_service_missing',
        answerText: null,
        supportingSources: [],
        missingInformation: ['matched_service'],
        ambiguousInformation: [],
        operatorNote: 'Servizio non trovato.',
        usedAuthoritativeKnowledge: false,
      },
    },
  })

  assert.equal(decision.kind, 'draft_review')
  assert.equal(decision.reasonCode, 'authoritative_answer_missing')
  assert.equal(decision.handoffRecommended, false)
})
