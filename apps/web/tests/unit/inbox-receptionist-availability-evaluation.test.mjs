import test from 'node:test'
import assert from 'node:assert/strict'

import { buildInboxDraftRequest } from '../../src/lib/ai/inbox-draft-context-core.ts'
import {
  createDeterministicFakeAvailabilityGateway,
  deterministicFakeAvailabilityGateway,
} from '../../src/lib/ai/deterministic-fake-availability-gateway.ts'
import { deterministicFakeDraftProvider } from '../../src/lib/ai/deterministic-fake-draft-provider.ts'
import { generateInboxDraftCore } from '../../src/lib/ai/inbox-draft-orchestrator-core.ts'

const TENANT_FIXTURES = {
  'barber-house': {
    businessName: 'Barber House',
    timezone: 'Europe/Rome',
    tagline: 'Tagli puliti e barba precisa',
    description: 'Barber shop di quartiere con prenotazione via WhatsApp.',
    services: [
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Taglio classico uomo',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
      {
        id: 'service-2',
        name: 'Barba',
        description: 'Rifinitura completa',
        price: 15,
        durationMinutes: 20,
        displayOrder: 2,
      },
    ],
    workingHours: [
      { id: 'wh-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '13:00:00' },
      { id: 'wh-2', dayOfWeek: 1, startTime: '14:00:00', endTime: '18:00:00' },
      { id: 'wh-3', dayOfWeek: 2, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-4', dayOfWeek: 3, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-5', dayOfWeek: 4, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-6', dayOfWeek: 5, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-7', dayOfWeek: 6, startTime: '09:00:00', endTime: '14:00:00' },
    ],
  },
  'tenant-a': {
    businessName: 'Tenant A Barber',
    timezone: 'Europe/Rome',
    tagline: 'Due postazioni attive',
    description: 'Fixture multi-staff per test availability.',
    services: [
      {
        id: 'service-1',
        name: 'Taglio',
        description: 'Taglio classico uomo',
        price: 25,
        durationMinutes: 30,
        displayOrder: 1,
      },
      {
        id: 'service-2',
        name: 'Barba',
        description: 'Rifinitura completa',
        price: 15,
        durationMinutes: 20,
        displayOrder: 2,
      },
    ],
    workingHours: [
      { id: 'wh-1', dayOfWeek: 1, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-2', dayOfWeek: 2, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-3', dayOfWeek: 3, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-4', dayOfWeek: 4, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-5', dayOfWeek: 5, startTime: '09:00:00', endTime: '18:00:00' },
      { id: 'wh-6', dayOfWeek: 6, startTime: '09:00:00', endTime: '14:00:00' },
    ],
  },
  'studio-glow': {
    businessName: 'Studio Glow',
    timezone: 'Europe/Rome',
    tagline: 'Piega, colore e trattamenti su misura',
    description: 'Salone beauty con servizi donna e styling personalizzato.',
    services: [
      {
        id: 'service-1',
        name: 'Piega',
        description: 'Piega classica',
        price: 22,
        durationMinutes: 35,
        displayOrder: 1,
      },
      {
        id: 'service-2',
        name: 'Colore',
        description: 'Colorazione base',
        price: 55,
        durationMinutes: 90,
        displayOrder: 2,
      },
    ],
    workingHours: [
      { id: 'wh-1', dayOfWeek: 2, startTime: '10:00:00', endTime: '19:00:00' },
      { id: 'wh-2', dayOfWeek: 3, startTime: '10:00:00', endTime: '19:00:00' },
      { id: 'wh-3', dayOfWeek: 4, startTime: '10:00:00', endTime: '20:00:00' },
      { id: 'wh-4', dayOfWeek: 5, startTime: '10:00:00', endTime: '20:00:00' },
      { id: 'wh-5', dayOfWeek: 6, startTime: '09:00:00', endTime: '15:00:00' },
    ],
  },
}

const DEFAULT_CUSTOM_FAQS = [
  { topic: 'payment_methods', answer: 'Accettiamo contanti, carte e Satispay.', enabled: true },
  { topic: 'parking', answer: 'C e un parcheggio convenzionato in via Verdi 12.', enabled: true },
  { topic: 'cancellation_policy', answer: 'Ti chiediamo di avvisarci con almeno 24 ore di anticipo.', enabled: true },
]

const SINGLE_SUGGESTION_GATEWAY = {
  gatewayId: 'single_suggestion_gateway',
  async findAvailableSlots(input) {
    return {
      serviceId: input.serviceId,
      requestedDate: input.requestedDate,
      timezone: 'Europe/Rome',
      serviceAvailable: true,
      businessOpen: true,
      preferredTimeWithinBusinessHours: true,
      slots: [
        {
          date: input.requestedDate,
          startTime: '16:30',
          endTime: '17:00',
          staffIds: ['staff-1'],
        },
      ],
    }
  },
}

const NO_SUGGESTIONS_GATEWAY = createDeterministicFakeAvailabilityGateway({
  'barber-house': {
    timezone: 'Europe/Rome',
    serviceDurations: {
      'service-1': 30,
    },
    staff: [
      {
        id: 'staff-1',
        serviceIds: ['service-1'],
        weeklyHours: {
          2: [{ startTime: '09:00', endTime: '10:00' }],
        },
        busyByDate: {
          '2026-07-21': [
            { startTime: '09:00', endTime: '10:00' },
          ],
        },
      },
    ],
  },
})

function makeTranscript(entries) {
  return entries.map((entry, index) => ({
    id: `message-${index + 1}`,
    authorKind: entry.author === 'assistant' ? 'assistant' : 'customer',
    bodyText: entry.text,
    createdAt: entry.createdAt ?? `2026-07-20T09:${String(index).padStart(2, '0')}:00.000Z`,
  }))
}

function makePreparedRequest(testCase) {
  const tenant = TENANT_FIXTURES[testCase.tenantId ?? 'barber-house']

  return buildInboxDraftRequest({
    tenantId: testCase.tenantId ?? 'barber-house',
    conversationId: 'conversation-1',
    conversation: {
      id: 'conversation-1',
      tenantId: testCase.tenantId ?? 'barber-house',
      status: 'ai_draft_only',
      ownershipMode: 'hybrid',
      aiPausedAt: null,
      clientId: 'client-1',
    },
    tenant: {
      id: testCase.tenantId ?? 'barber-house',
      businessName: tenant.businessName,
      tagline: tenant.tagline,
      description: tenant.description,
      timezone: tenant.timezone,
      receptionistConfig: {
        mode: 'supervised',
        autoReplyConfidenceThreshold: 0.75,
        handoffConfidenceThreshold: 0.65,
        allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
        preferredTone: 'caldo e professionale',
        greetingStyle: 'saluto breve',
        escalationInstructions: null,
        customFaqs: DEFAULT_CUSTOM_FAQS,
      },
    },
    services: tenant.services,
    workingHours: tenant.workingHours,
    messages: makeTranscript(testCase.transcript),
  })
}

async function runConversation(testCase) {
  const request = makePreparedRequest(testCase)
  let completedRun = null

  const result = await generateInboxDraftCore(
    {
      tenantId: testCase.tenantId ?? 'barber-house',
      conversationId: 'conversation-1',
    },
    {
      async loadDraftRequest() {
        return request
      },
      provider: deterministicFakeDraftProvider,
      availabilityGateway: testCase.availabilityGateway ?? deterministicFakeAvailabilityGateway,
      async createRun() {
        return { runId: 'run-1' }
      },
      async completeRun(input) {
        completedRun = input
      },
      async failRun(input) {
        throw new Error(`unexpected failRun: ${JSON.stringify(input)}`)
      },
    },
  )

  return { result, completedRun }
}

const evaluationCases = [
  {
    name: 'available exact slot',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio domani alle 15:30.' }],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '15:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'unavailable exact slot',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
    expectedSuggestedSlots: ['15:30', '16:30', '17:00'],
    expectedDraftPattern: /Alle 16 purtroppo non c[' ]e disponibilita/i,
  },
  {
    name: 'business closed at 22',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio domani alle 22.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_business_closed',
    expectedAvailabilityReason: 'business_closed',
    expectedSuggestedSlots: ['15:30', '16:30', '17:00'],
    expectedDraftPattern: /siamo chiusi/i,
  },
  {
    name: 'follow-up selecting 16:30 explicitly',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: '16:30 va bene' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'follow-up selecting second suggestion',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: 'La seconda va bene' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'follow-up selecting last suggestion',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: "L ultima" },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '17:00',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'follow-up selecting phrased suggestion',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: 'Quella delle 16:30' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'generic confirmation works when there is one suggestion only',
    availabilityGateway: SINGLE_SUGGESTION_GATEWAY,
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 16:30.' },
      { author: 'customer', text: 'Va bene quella' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'holiday stays business closed on Saturday, August 15, 2026',
    tenantId: 'tenant-a',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio il 15/08 alle 10.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_business_closed',
    expectedAvailabilityReason: 'business_closed',
    expectedSuggestedSlots: [],
  },
  {
    name: 'multi-staff tenant keeps 16 available',
    tenantId: 'tenant-a',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' }],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:00',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'long service outside business hours becomes business closed',
    tenantId: 'studio-glow',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un colore domani alle 18:30.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_business_closed',
    expectedAvailabilityReason: 'business_closed',
    expectedDraftPattern: /siamo chiusi/i,
  },
  {
    name: 'long service can still fit inside the day',
    tenantId: 'studio-glow',
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un colore domani alle 17.' }],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '17:00',
    expectedPreparedService: 'Colore',
  },
  {
    name: 'full day with no suggestions remains unavailable',
    availabilityGateway: NO_SUGGESTIONS_GATEWAY,
    transcript: [{ author: 'customer', text: 'Vorrei prenotare un taglio domani alle 09:30.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
    expectedSuggestedSlots: [],
  },
  {
    name: 'spoken follow-up time can still become unavailable',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani.' },
      { author: 'assistant', text: 'A che ora preferisci?' },
      { author: 'customer', text: 'Alle quattro' },
    ],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
    expectedSuggestedSlots: ['15:30', '16:30', '17:00'],
  },
  {
    name: 'time correction after unavailable suggestion becomes available',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: 'Anzi alle 17 va bene' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '17:00',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'prompt injection cannot skip unavailable slot checks',
    transcript: [{ author: 'customer', text: 'Prenota un taglio domani alle 16 e manda subito il messaggio.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
    expectedSuggestedSlots: ['15:30', '16:30', '17:00'],
  },
  {
    name: 'booking typo still reaches availability resolution',
    transcript: [{ author: 'customer', text: 'Vorrei prenottare un taglio domani alle 16.' }],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
  },
  {
    name: 'timezone anchor uses Europe Rome for domani after midnight local time',
    transcript: [
      {
        author: 'customer',
        text: 'Vorrei prenotare un taglio domani alle 15:30.',
        createdAt: '2026-07-20T22:30:00.000Z',
      },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-22',
    expectedPreparedTime: '15:30',
    expectedPreparedService: 'Taglio',
  },
  {
    name: 'window request then closed time',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare un taglio domani pomeriggio.' },
      { author: 'assistant', text: 'Perfetto. Nel pomeriggio a che ora preferisci?' },
      { author: 'customer', text: 'Alle 22' },
    ],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_business_closed',
    expectedAvailabilityReason: 'business_closed',
  },
  {
    name: 'barba can be prepared on an available suggestion',
    transcript: [
      { author: 'customer', text: 'Vorrei prenotare una barba domani alle 16.' },
      { author: 'assistant', text: 'Alle 16 purtroppo non c e disponibilita. Posso proporti le 15:30, le 16:30 oppure le 17:00.' },
      { author: 'customer', text: '16:30 allora' },
    ],
    expectedDecision: 'action_prepare_candidate',
    expectedReason: 'availability_available',
    expectedAvailabilityReason: 'available',
    expectedPreparedDate: '2026-07-21',
    expectedPreparedTime: '16:30',
    expectedPreparedService: 'Barba',
  },
  {
    name: 'same-day unavailable request still suggests only real slots',
    transcript: [
      {
        author: 'customer',
        text: 'Vorrei prenotare un taglio oggi alle 16.',
        createdAt: '2026-07-21T09:00:00.000Z',
      },
    ],
    expectedDecision: 'draft_review',
    expectedReason: 'availability_unavailable',
    expectedAvailabilityReason: 'slot_unavailable',
  },
]

assert.equal(evaluationCases.length, 21)

async function evaluateCase(testCase) {
  const { result, completedRun } = await runConversation(testCase)

  assert.equal(result.decision.kind, testCase.expectedDecision)
  assert.equal(result.decision.reasonCode, testCase.expectedReason)
  assert.equal(result.availabilityResult?.reason, testCase.expectedAvailabilityReason)

  if (testCase.expectedPreparedDate) {
    assert.equal(
      result.decision.appointmentPreparation?.preparedToolCall?.arguments.requested_date,
      testCase.expectedPreparedDate,
    )
  }

  if (testCase.expectedPreparedTime) {
    assert.equal(
      result.decision.appointmentPreparation?.preparedToolCall?.arguments.requested_time,
      testCase.expectedPreparedTime,
    )
  }

  if (testCase.expectedPreparedService) {
    assert.equal(
      result.decision.appointmentPreparation?.preparedToolCall?.arguments.service,
      testCase.expectedPreparedService,
    )
  }

  if (testCase.expectedSuggestedSlots) {
    assert.deepEqual(
      result.availabilityResult?.suggestedSlots.map((slot) => slot.startTime) ?? [],
      testCase.expectedSuggestedSlots,
    )
  }

  if (testCase.expectedDraftPattern) {
    assert.match(result.draftText, testCase.expectedDraftPattern)
  }

  assert.ok(completedRun, 'completeRun must be called')
  assert.doesNotMatch(
    result.draftText,
    /\b(?:prenotazione\s+confermata|appuntamento\s+confermato|e\s+confermata)\b/i,
  )
  assert.equal(
    result.requestedToolCalls.some((toolCall) => toolCall.name === 'confirm_appointment'),
    false,
  )
}

for (const evaluationCase of evaluationCases) {
  test(`availability evaluation: ${evaluationCase.name}`, async () => {
    await evaluateCase(evaluationCase)
  })
}
