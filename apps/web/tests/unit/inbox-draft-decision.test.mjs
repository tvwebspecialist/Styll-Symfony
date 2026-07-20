import test from 'node:test'
import assert from 'node:assert/strict'

import { getInboxToolDefinition } from '../../src/lib/messaging/tool-registry.ts'
import { resolveInboxDraftDecision } from '../../src/lib/ai/inbox-draft-decision.ts'

function makeDraftRequest(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v3',
    systemPrompt: 'draft only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Vorrei prenotare un taglio domani pomeriggio.',
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
    allowedTools: ['prepare_appointment', 'request_human_handoff'],
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
    },
    serviceCatalog: [
      {
        id: 'service-1',
        name: 'Taglio',
        price: 25,
        durationMinutes: 30,
      },
    ],
    ...overrides,
  }
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
      intent: 'appointment_booking',
      handoff: false,
      citedSources: [
        request.sources[0],
        request.sources[2],
      ],
      requestedToolCalls: [
        enrichToolCall('prepare_appointment', { source: 'draft_only_advisory' }),
      ],
    },
  })

  assert.equal(decision.kind, 'draft_review')
  assert.equal(decision.reasonCode, 'draft_only_mode')
  assert.equal(decision.appointmentPreparation?.eligible, true)
  assert.deepEqual(decision.appointmentPreparation?.missingFields, [])
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
      citedSources: [],
      requestedToolCalls: [],
    },
  })

  assert.equal(decision.kind, 'human_handoff')
  assert.equal(decision.reasonCode, 'provider_response_incomplete')
  assert.equal(decision.handoffRecommended, true)
})
