import test from 'node:test'
import assert from 'node:assert/strict'

import { deterministicFakeDraftProvider } from '../../src/lib/ai/deterministic-fake-draft-provider.ts'
import { resolveInboxConversationMemory } from '../../src/lib/ai/inbox-memory-resolver.ts'

function makeDraftRequest({
  latestCustomerText,
  servicesText = '- Taglio | EUR 25 | 30 min\n- Barba | EUR 15 | 20 min',
  workingHoursText = '- lunedi: 09:00:00-18:00:00',
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
      text: 'business_name=Barber House\ntimezone=Europe/Rome',
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

const evaluationCases = [
  {
    name: 'booking request',
    latestCustomerText: 'Vorrei prenotare un taglio domani pomeriggio.',
    expectedIntent: 'booking',
    expectedTool: 'search_availability',
    expectedHandoff: false,
  },
  {
    name: 'pricing question',
    latestCustomerText: 'Quanto costa taglio e barba?',
    expectedIntent: 'pricing',
    expectedTool: null,
    expectedHandoff: false,
  },
  {
    name: 'opening hours',
    latestCustomerText: 'Che orari fate il lunedi?',
    expectedIntent: 'opening_hours',
    expectedTool: null,
    expectedHandoff: false,
  },
  {
    name: 'unavailable information',
    latestCustomerText: 'Quanto costa il colore?',
    servicesText: '',
    expectedIntent: 'pricing',
    expectedTool: null,
    expectedHandoff: false,
    expectedDraftPattern: /Verifico il prezzo corretto/,
  },
  {
    name: 'greeting',
    latestCustomerText: 'Ciao',
    expectedIntent: 'greeting',
    expectedTool: null,
    expectedHandoff: false,
  },
  {
    name: 'cancellation',
    latestCustomerText: 'Devo cancellare l appuntamento di domani.',
    expectedIntent: 'cancel',
    expectedTool: 'prepare_cancellation',
    expectedHandoff: false,
  },
  {
    name: 'reschedule',
    latestCustomerText: 'Possiamo spostare l appuntamento a venerdi?',
    expectedIntent: 'reschedule',
    expectedTool: 'prepare_reschedule',
    expectedHandoff: false,
  },
  {
    name: 'complaint',
    latestCustomerText: 'Sono molto deluso dal servizio, voglio parlare con qualcuno.',
    expectedIntent: 'complaint',
    expectedTool: 'request_human_handoff',
    expectedHandoff: true,
  },
  {
    name: 'unclear customer message',
    latestCustomerText: '???',
    expectedIntent: 'unknown',
    expectedTool: null,
    expectedHandoff: true,
    expectedDraftPattern: /ti faccio aiutare subito dal team/,
  },
]

for (const evaluationCase of evaluationCases) {
  test(`deterministic AI evaluation suite keeps the ${evaluationCase.name} scenario safe and classified`, async () => {
    const result = await deterministicFakeDraftProvider.generateDraft(
      makeDraftRequest(evaluationCase),
    )

    assert.ok(result.draftText.length > 0)
    assert.equal(result.intent, evaluationCase.expectedIntent)
    assert.equal(result.handoff, evaluationCase.expectedHandoff)
    assert.ok(result.confidence >= 0 && result.confidence <= 1)
    assert.equal(result.citedSources.includes('message:message-1'), true)
    assert.equal(new Set(result.citedSources).size, result.citedSources.length)
    assert.equal(result.draftText.includes('inviato automaticamente'), false)

    if (evaluationCase.expectedTool) {
      assert.equal(result.requestedToolCalls[0]?.name, evaluationCase.expectedTool)
    } else {
      assert.equal(result.requestedToolCalls.length, 0)
    }

    if (evaluationCase.expectedDraftPattern) {
      assert.match(result.draftText, evaluationCase.expectedDraftPattern)
    }
  })
}
