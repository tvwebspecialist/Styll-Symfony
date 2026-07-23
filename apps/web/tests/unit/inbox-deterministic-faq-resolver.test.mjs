import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveDeterministicFaqDraft } from '../../src/lib/ai/inbox-deterministic-faq-resolver.ts'

function makeRequest(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    conversationId: 'conversation-1',
    promptId: 'whatsapp_inbox_draft_only',
    promptVersion: '2026-07-20.v6',
    systemPrompt: 'draft only',
    messages: [
      {
        id: 'message-1',
        author: 'customer',
        text: 'Ciao',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      },
    ],
    contextSections: [
      {
        key: 'tenant_profile',
        title: 'Tenant profile',
        text: 'business_name=Barber House\ntimezone=Europe/Rome\ngreeting_style=saluto breve',
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
        text: '- lunedi: 09:00-13:00, 14:00-18:00\n- martedi: 09:00-18:00\n- mercoledi: 09:00-18:00\n- giovedi: 09:00-18:00\n- venerdi: 09:00-18:00\n- sabato: 09:00-14:00',
        sourceRefs: ['working_hours:mon-am', 'working_hours:mon-pm', 'working_hours:tue', 'working_hours:wed', 'working_hours:thu', 'working_hours:fri', 'working_hours:sat'],
      },
      {
        key: 'custom_faqs',
        title: 'Tenant FAQ',
        text: '- Metodi di pagamento: Accettiamo contanti, carte e Satispay.\n- Parcheggio: C e un parcheggio convenzionato in via Verdi 12.',
        sourceRefs: ['faq:payment_methods', 'faq:parking'],
      },
    ],
    sources: [
      { kind: 'conversation', label: 'Conversation message (customer)', ref: 'message:message-1' },
      { kind: 'knowledge', label: 'Tenant profile', ref: 'tenant:tenant-a:profile' },
      { kind: 'knowledge', label: 'Service: Taglio', ref: 'service:service-1' },
      { kind: 'knowledge', label: 'Service: Barba', ref: 'service:service-2' },
      { kind: 'knowledge', label: 'Working hours: lunedi', ref: 'working_hours:mon-am' },
      { kind: 'knowledge', label: 'Working hours: lunedi', ref: 'working_hours:mon-pm' },
      { kind: 'knowledge', label: 'Working hours: martedi', ref: 'working_hours:tue' },
      { kind: 'knowledge', label: 'Working hours: mercoledi', ref: 'working_hours:wed' },
      { kind: 'knowledge', label: 'Working hours: giovedi', ref: 'working_hours:thu' },
      { kind: 'knowledge', label: 'Working hours: venerdi', ref: 'working_hours:fri' },
      { kind: 'knowledge', label: 'Working hours: sabato', ref: 'working_hours:sat' },
      { kind: 'knowledge', label: 'FAQ: Metodi di pagamento', ref: 'faq:payment_methods' },
      { kind: 'knowledge', label: 'FAQ: Parcheggio', ref: 'faq:parking' },
    ],
    allowedTools: ['request_human_handoff'],
    conversationState: {
      status: 'ai_active',
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
      allowedAutonomousIntents: ['greeting', 'pricing', 'opening_hours', 'faq'],
      preferredTone: 'professionale',
      greetingStyle: 'saluto breve',
      escalationInstructions: null,
      customFaqs: [
        {
          topic: 'payment_methods',
          answer: 'Accettiamo contanti, carte e Satispay.',
          enabled: true,
        },
        {
          topic: 'parking',
          answer: 'C e un parcheggio convenzionato in via Verdi 12.',
          enabled: true,
        },
      ],
    },
    serviceCatalog: [
      { id: 'service-1', name: 'Taglio', price: 25, durationMinutes: 30 },
      { id: 'service-2', name: 'Barba', price: 15, durationMinutes: 20 },
    ],
    customFaqCatalog: [
      {
        topic: 'payment_methods',
        answer: 'Accettiamo contanti, carte e Satispay.',
        enabled: true,
      },
      {
        topic: 'parking',
        answer: 'C e un parcheggio convenzionato in via Verdi 12.',
        enabled: true,
      },
    ],
    ...overrides,
  }
}

const REFERENCE_NOW = new Date('2026-07-20T10:00:00.000Z')

test('deterministic FAQ resolver resolves a greeting from tenant profile data', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest(),
    intent: 'greeting',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.equal(result.resolver, 'greeting')
  assert.equal(result.reasonCode, 'greeting_resolved')
  assert.match(result.answerText, /Barber House/)
  assert.equal(result.usedAuthoritativeKnowledge, true)
})

test('deterministic FAQ resolver returns an authoritative stored price for a supported service', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Quanto costa il taglio?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'pricing',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.equal(result.reasonCode, 'pricing_resolved')
  assert.match(result.answerText, /Taglio/)
  assert.match(result.answerText, /EUR 25/)
  assert.deepEqual(result.supportingSources.map((source) => source.ref), ['service:service-1'])
})

test('deterministic FAQ resolver fails safely for an unknown service price request', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Quanto costa la permanente?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'pricing',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, false)
  assert.equal(result.reasonCode, 'pricing_service_missing')
  assert.equal(result.operatorNote?.includes('catalogo attivo'), true)
})

test('deterministic FAQ resolver answers opening hours for an open day using tenant timezone', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Che orari fate oggi?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'opening_hours',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.equal(result.reasonCode, 'opening_hours_resolved_day')
  assert.match(result.answerText, /lunedi/)
  assert.match(result.answerText, /09:00-13:00, 14:00-18:00/)
})

test('deterministic FAQ resolver distinguishes a closed day from appointment availability', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Siete aperti domenica?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'opening_hours',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.equal(result.reasonCode, 'opening_hours_closed_day')
  assert.match(result.answerText, /domenica/)
  assert.match(result.answerText, /chiuso/)
})

test('deterministic FAQ resolver never turns working hours into live appointment availability', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Avete posto domani alle 18?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'opening_hours',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.match(result.answerText, /non confermano disponibilita appuntamenti/)
})

test('deterministic FAQ resolver serves a custom tenant FAQ answer from configured data', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Accettate carte o Satispay?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'faq',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, true)
  assert.equal(result.reasonCode, 'custom_faq_resolved')
  assert.equal(result.answerText, 'Accettiamo contanti, carte e Satispay.')
  assert.deepEqual(result.supportingSources.map((source) => source.ref), ['faq:payment_methods'])
})

test('deterministic FAQ resolver stays conservative when multiple custom FAQs match', () => {
  const result = resolveDeterministicFaqDraft({
    request: makeRequest({
      messages: [{
        id: 'message-1',
        author: 'customer',
        text: 'Avete parcheggio e accettate carte?',
        createdAt: '2026-07-20T09:00:00.000Z',
        sourceRef: 'message:message-1',
      }],
    }),
    intent: 'faq',
    now: REFERENCE_NOW,
  })

  assert.equal(result.resolved, false)
  assert.equal(result.reasonCode, 'custom_faq_ambiguous')
  assert.equal(result.ambiguousInformation.length, 2)
})
