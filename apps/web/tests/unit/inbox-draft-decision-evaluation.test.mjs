import test from 'node:test'
import assert from 'node:assert/strict'

import { deterministicFakeDraftProvider } from '../../src/lib/ai/deterministic-fake-draft-provider.ts'
import { resolveInboxDraftDecision } from '../../src/lib/ai/inbox-draft-decision.ts'
import { getInboxToolDefinition } from '../../src/lib/messaging/tool-registry.ts'
import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'

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

function makeDraftRequest({
  latestCustomerText,
  servicesText = '- Taglio | EUR 25 | 30 min\n- Barba | EUR 15 | 20 min',
  workingHoursText = '- lunedi: 09:00:00-18:00:00',
  receptionistConfig,
  conversationState,
} = {}) {
  const sources = [
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
  ]
  const contextSections = [
    {
      key: 'tenant_profile',
      title: 'Tenant profile',
      text: 'business_name=Barber House\ntimezone=Europe/Rome\npreferred_tone=caldo e diretto',
      sourceRefs: ['tenant:tenant-a:profile'],
    },
  ]
  const serviceCatalog = []

  if (servicesText) {
    contextSections.push({
      key: 'services',
      title: 'Active services',
      text: servicesText,
      sourceRefs: ['service:service-1', 'service:service-2'],
    })
    sources.push(
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
    )
    serviceCatalog.push(
      {
        id: 'service-1',
        name: 'Taglio',
        price: 25,
        durationMinutes: 30,
      },
      {
        id: 'service-2',
        name: 'Barba',
        price: 15,
        durationMinutes: 20,
      },
    )
  }

  if (workingHoursText) {
    contextSections.push({
      key: 'working_hours',
      title: 'Working hours',
      text: workingHoursText,
      sourceRefs: ['working_hours:wh-1'],
    })
    sources.push({
      kind: 'knowledge',
      label: 'Working hours: lunedi',
      ref: 'working_hours:wh-1',
    })
  }

  const request = {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v6',
    systemPrompt: 'Prompt whatsapp_inbox_draft_only@2026-07-20.v6\nMode: draft_only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: latestCustomerText,
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
    ],
    contextSections,
    sources,
    allowedTools: [
      'get_prices',
      'get_working_hours',
      'search_availability',
      'prepare_booking_sandbox',
      'prepare_appointment',
      'prepare_reschedule',
      'prepare_cancellation',
      'request_human_handoff',
    ],
    conversationState: {
      status: 'ai_draft_only',
      ownershipMode: 'hybrid',
      aiPausedAt: null,
      clientId: 'client-1',
      ...conversationState,
    },
    tenantProfile: {
      businessName: 'Barber House',
      timezone: 'Europe/Rome',
    },
    receptionistConfig: {
      mode: 'supervised',
      autoReplyConfidenceThreshold: 0.75,
      handoffConfidenceThreshold: 0.65,
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
      preferredTone: 'caldo e diretto',
      greetingStyle: 'saluto breve',
      escalationInstructions: null,
      customFaqs: [],
      ...receptionistConfig,
    },
    serviceCatalog,
    customFaqCatalog: [],
  }

  request.conversationMemory = resolveInboxConversationMemory({
    messages: request.messages,
    serviceCatalog: request.serviceCatalog,
    timezone: request.tenantProfile.timezone,
  })

  return request
}

function enrichRequestedToolCalls(requestedToolCalls) {
  return requestedToolCalls.map((toolCall) => {
    const definition = getInboxToolDefinition(toolCall.name)

    return {
      name: toolCall.name,
      arguments: toolCall.arguments,
      policy: definition.policy,
      requiresCustomerConfirmation: definition.requiresCustomerConfirmation,
      requiresStaffApproval: definition.requiresStaffApproval,
    }
  })
}

function mapCitedSources(request, citedSourceRefs) {
  const sourceByRef = new Map(request.sources.map((source) => [source.ref, source]))
  return citedSourceRefs
    .map((ref) => sourceByRef.get(ref) ?? { kind: 'knowledge', label: 'Unknown source', ref })
}

async function evaluateCase(testCase) {
  const request = makeDraftRequest(testCase)
  const providerResult = testCase.providerResultOverride
    ? { ...await deterministicFakeDraftProvider.generateDraft(request), ...testCase.providerResultOverride }
    : await deterministicFakeDraftProvider.generateDraft(request)

  const decision = resolveInboxDraftDecision({
    request,
    result: {
      draftText: providerResult.draftText,
      confidence: providerResult.confidence,
      intent: providerResult.intent,
      handoff: providerResult.handoff,
      citedSources: testCase.citedSourcesOverride
        ? testCase.citedSourcesOverride
        : mapCitedSources(request, providerResult.citedSources),
      requestedToolCalls: testCase.requestedToolCallsOverride
        ? testCase.requestedToolCallsOverride
        : enrichRequestedToolCalls(providerResult.requestedToolCalls),
      availabilityResult: testCase.availabilityResult ?? null,
    },
  })

  assert.equal(decision.kind, testCase.expectedDecision)
  assert.equal(decision.reasonCode, testCase.expectedReason)

  if (testCase.expectedMissingFields) {
    assert.deepEqual(decision.missingRequiredFields, testCase.expectedMissingFields)
  }
}

const evaluationCases = [
  {
    name: 'confident greeting',
    latestCustomerText: 'Ciao',
    expectedDecision: 'auto_reply_candidate',
    expectedReason: 'auto_reply_ready',
  },
  {
    name: 'supported price answer',
    latestCustomerText: 'Quanto costa il taglio?',
    expectedDecision: 'auto_reply_candidate',
    expectedReason: 'auto_reply_ready',
  },
  {
    name: 'unsupported price answer',
    latestCustomerText: 'Quanto costa il colore?',
    servicesText: '',
    expectedDecision: 'human_handoff',
    expectedReason: 'missing_required_sources',
  },
  {
    name: 'opening hours with cited source',
    latestCustomerText: 'Che orari fate il lunedi?',
    expectedDecision: 'auto_reply_candidate',
    expectedReason: 'auto_reply_ready',
  },
  {
    name: 'booking with missing service',
    latestCustomerText: 'Vorrei prenotare domani pomeriggio.',
    expectedDecision: 'draft_review',
    expectedReason: 'appointment_missing_service',
    expectedMissingFields: ['service', 'requested_time'],
  },
  {
    name: 'booking with missing date',
    latestCustomerText: 'Vorrei prenotare un taglio nel pomeriggio.',
    expectedDecision: 'draft_review',
    expectedReason: 'appointment_missing_date',
    expectedMissingFields: ['requested_date', 'requested_time'],
  },
  {
    name: 'booking with all required data',
    latestCustomerText: 'Vorrei prenotare un taglio domani alle 16.',
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    availabilityResult: AVAILABLE_RESULT,
  },
  {
    name: 'reschedule request',
    latestCustomerText: 'Possiamo spostare l appuntamento di domani alle 15 a venerdi alle 17?',
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'action_ready',
  },
  {
    name: 'cancellation request',
    latestCustomerText: 'Devo cancellare l appuntamento di domani alle 15.',
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'action_ready',
  },
  {
    name: 'explicit request for a human',
    latestCustomerText: 'Vorrei parlare con un operatore.',
    expectedDecision: 'human_handoff',
    expectedReason: 'provider_requested_handoff',
  },
  {
    name: 'complaint',
    latestCustomerText: 'Sono molto deluso dal servizio.',
    expectedDecision: 'human_handoff',
    expectedReason: 'provider_requested_handoff',
  },
  {
    name: 'ambiguous input',
    latestCustomerText: '???',
    expectedDecision: 'human_handoff',
    expectedReason: 'provider_requested_handoff',
  },
  {
    name: 'low confidence',
    latestCustomerText: 'Quanto costa il taglio?',
    providerResultOverride: {
      handoff: false,
      confidence: 0.52,
    },
    expectedDecision: 'human_handoff',
    expectedReason: 'confidence_below_threshold',
  },
  {
    name: 'hallucinated or unknown citation',
    latestCustomerText: 'Quanto costa il taglio?',
    citedSourcesOverride: [
      {
        kind: 'knowledge',
        label: 'Unknown source',
        ref: 'unknown:ref-1',
      },
    ],
    providerResultOverride: {
      handoff: false,
      confidence: 0.93,
      intent: 'pricing',
    },
    expectedDecision: 'human_handoff',
    expectedReason: 'missing_required_sources',
  },
  {
    name: 'booking with missing time',
    latestCustomerText: 'Vorrei prenotare un taglio domani.',
    expectedDecision: 'draft_review',
    expectedReason: 'appointment_missing_time',
    expectedMissingFields: ['requested_time'],
  },
  {
    name: 'AI paused conversation',
    latestCustomerText: 'Quanto costa il taglio?',
    conversationState: {
      status: 'ai_paused',
      aiPausedAt: '2026-07-20T09:05:00.000Z',
    },
    expectedDecision: 'human_handoff',
    expectedReason: 'ai_paused',
  },
  {
    name: 'human-owned conversation',
    latestCustomerText: 'Quanto costa il taglio?',
    conversationState: {
      status: 'human_active',
      ownershipMode: 'human',
    },
    expectedDecision: 'human_handoff',
    expectedReason: 'human_control_active',
  },
]

for (const evaluationCase of evaluationCases) {
  test(`decision evaluation keeps the ${evaluationCase.name} scenario deterministic and conservative`, async () => {
    await evaluateCase(evaluationCase)
  })
}
